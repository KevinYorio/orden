import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,readFileSync,writeFileSync,existsSync,readdirSync,renameSync,unlinkSync,rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './store.js';
import { hash } from './files.js';
import type { Platform,CostSample } from './platform.js';
import { costDecision } from './platform.js';
import { local } from '../../../packages/domain/src/dates.js';
import type { RuntimeState } from '../../../packages/domain/src/types.js';
import { decryptBackupBundle,encryptBackupBundle,type BackupEncryption,backupHash } from './backup-crypto.js';
const encryptionSchema=z.object({algorithm:z.literal('AES-256-GCM'),keyDerivation:z.literal('scrypt'),version:z.literal(1),salt:z.string().regex(/^[a-f\d]{32}$/),iv:z.string().regex(/^[a-f\d]{24}$/),tag:z.string().regex(/^[a-f\d]{32}$/)});
const manifestSchema=z.object({id:z.string().regex(/^(backup|handoff)-[\w-]+$/),format:z.literal(1),schema:z.number().int().min(1).max(5),at:z.string(),generation:z.number().int().nonnegative(),cursor:z.number().int().nonnegative(),owner:z.enum(['local','railway']).nullable(),target:z.enum(['local','railway']).nullable(),hash:z.string().regex(/^[a-f\d]{64}$/),purpose:z.enum(['backup','handoff']),documents:z.array(z.object({id:z.string().regex(/^D-[a-f\d]{8}$/),hash:z.string().regex(/^[a-f\d]{64}$/)})),encryption:encryptionSchema.optional(),originalsIncluded:z.array(z.string().regex(/^[a-f\d]{64}$/)).optional()});
export type Manifest=z.infer<typeof manifestSchema>;
export function snapshotData(dir:string,m:Manifest,key?:string){
 if(m.encryption){if(!key)throw new Error('Falta APP_BACKUP_ENCRYPTION_KEY para abrir este respaldo.');const artifact=readFileSync(join(dir,'backup.enc'));if(backupHash(artifact)!==m.hash)throw new Error('Snapshot corrupto: checksum del paquete cifrado.');const bundle=decryptBackupBundle(key,m.id,artifact,m.encryption),included=[...(m.originalsIncluded??[])].sort(),actual=[...bundle.originals.keys()].sort();if(JSON.stringify(included)!==JSON.stringify(actual)||actual.some(hash=>!m.documents.some(d=>d.hash===hash)))throw new Error('Los originales cifrados no coinciden con el manifiesto.');return bundle;}
 const state=readFileSync(join(dir,'state.sqlite'));if(backupHash(state)!==m.hash)throw new Error('Snapshot corrupto: checksum.');return {state,originals:new Map<string,Buffer>()};
}
export class RuntimeController {
 constructor(public store:Store,public location:'local'|'railway',public now:()=>string=()=>new Date().toISOString(),private backupKey?:string){}
 fence(){const p=join(this.store.dir,'runtime-fence.json');return existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;}
 persistFence(){const r=this.store.runtime(),p=join(this.store.dir,'runtime-fence.json'),tmp=p+'.tmp';writeFileSync(tmp,JSON.stringify({...r,cursor:this.store.cursor()}),{mode:0o600});renameSync(tmp,p);}
 barrier(){const r=this.store.runtime(),f=this.fence();if(f&&(r.generation<f.generation||r.generation===f.generation&&f.localRequested&&!r.localRequested))return false;return r.owner===this.location&&r.mode===(this.location==='local'?'local_active':'railway_active')&&!(this.location==='railway'&&r.localRequested);}
 initLocal(){const r=this.store.runtime();if(r.generation!==0||this.store.items().length||this.fence())throw new Error('La base no es nueva. Se requiere importación válida.');this.store.set('runtime',{mode:'local_active',owner:'local',generation:1,localRequested:false});this.persistFence();}
 snapshot(purpose:'backup'|'handoff',target:'local'|'railway'|null=null):{dir:string;manifest:Manifest}{
  if(purpose==='backup'&&!this.backupKey)throw new Error('Configurar APP_BACKUP_ENCRYPTION_KEY para crear respaldos cifrados.');
  const r=this.store.runtime(),cursor=this.store.cursor(),id=`${purpose}-${this.now().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}`,dir=join(this.store.dir,'snapshots',id);mkdirSync(dir,{recursive:true});
  const copy=new DatabaseSync(':memory:');let state:Buffer;try{copy.deserialize(this.store.db.serialize());state=Buffer.from(copy.serialize());if(state.subarray(0,16).toString('ascii')==='SQLite format 3\0'){state[18]=1;state[19]=1;}}finally{copy.close();}
  const documents=this.store.all('SELECT id,hash FROM documents ORDER BY id'),manifestBase={id,format:1 as const,schema:5,at:this.now(),generation:r.generation,cursor,owner:r.owner,target,hash:'',purpose,documents};let encryption:BackupEncryption|undefined,originalsIncluded:string[]|undefined;
  if(purpose==='backup'){
   const originals:{hash:string;bytes:Buffer}[]=[];for(const row of this.store.all('SELECT hash,present FROM blobs')){if(!row.present)continue;const bytes=readFileSync(join(this.store.dir,'originals',row.hash));if(hash(bytes)!==row.hash)throw new Error('No se creó respaldo: un original disponible falla su checksum.');originals.push({hash:row.hash,bytes});}
   const sealed=encryptBackupBundle(this.backupKey!,id,state,originals);encryption=sealed.encryption;originalsIncluded=originals.map(item=>item.hash).sort();writeFileSync(join(dir,'backup.enc'),sealed.artifact,{mode:0o600});manifestBase.hash=hash(sealed.artifact);
  }else{writeFileSync(join(dir,'state.sqlite'),state,{mode:0o600});manifestBase.hash=hash(state);}
  const manifest:Manifest={...manifestBase,...(encryption?{encryption,originalsIncluded}:{})};writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  this.store.run('INSERT INTO snapshots VALUES(?,?,?,?,?,?)',id,this.now(),r.generation,cursor,manifest.hash,purpose);
  this.prune(purpose,purpose==='handoff'||this.location==='railway'?1:7);
  return {dir,manifest};
 }
 prune(purpose:string,keep:number){const rows=this.store.all('SELECT * FROM snapshots WHERE purpose=? ORDER BY at DESC,rowid DESC',purpose);let valid=0;for(const row of rows){const dir=join(this.store.dir,'snapshots',row.id);try{validateSnapshot(dir,this.backupKey);valid++;}catch{continue;}if(valid<=keep)continue;for(const name of ['state.sqlite','backup.enc','manifest.json'])if(existsSync(join(dir,name)))unlinkSync(join(dir,name));if(existsSync(dir)&&readdirSync(dir).length===0)rmdirSync(dir);this.store.run('DELETE FROM snapshots WHERE id=?',row.id);}}
 backup(){const latest=this.store.get('lastBackupState'),day=local(this.now()).toISODate();if(latest?.day===day)return null;const revision=this.store.revision();if(latest?.revision===revision)return null;
  const snapshot=this.snapshot('backup');this.store.set('lastBackupState',{day,revision,id:snapshot.manifest.id});return snapshot;
 }
 async prepareHandoff(target:'local'|'railway',platform?:Platform,cost?:CostSample):Promise<{dir:string;manifest:Manifest}>{
  if(!this.barrier())throw new Error('Instancia sin propiedad activa.');if(target===this.location)throw new Error('Destino igual al propietario.');if(target==='railway'&&!costDecision(cost,this.now()).allow)throw new Error('Regreso remoto sin margen verificado.');
  const r=this.store.runtime();this.store.tx(()=>{this.store.set('runtime',{...r,mode:'handoff_to_local',owner:null,generation:r.generation+1,localRequested:target==='local',reason:target==='local'?'presupuesto o traspaso explícito':'regreso explícito',cycle:cost?.cycleStart});this.store.run("UPDATE outbox SET state='delivery_unknown' WHERE state='sending'");this.store.audit(this.now(),'system','handoff_prepare',null,{target,generation:r.generation+1});});this.persistFence();
  const snap=this.snapshot('handoff',target);this.store.set('finalSnapshot',snap.manifest.id);
  // La copia final existe antes de solicitar la parada; el servicio ya no admite escrituras/envíos.
  if(this.location==='railway'){
   if(!platform)throw new Error('Exportación final conservada. Falta adaptador de parada verificada.');
   let stopped=false;for(let attempt=0;attempt<3;attempt++){try{if(await platform.stopped()){stopped=true;break;}await platform.stop();if(await platform.stopped()){stopped=true;break;}}catch(error){this.store.set('platformError',{at:this.now(),message:(error as Error).message,attempt:attempt+1});}}
   if(!stopped){this.store.set('runtime',{...this.store.runtime(),mode:'recovery_required',reason:'No se comprobó parada remota.'});this.persistFence();throw new Error('No se confirmó parada. No iniciar segundo emisor.');}
   this.store.set('runtime',{...this.store.runtime(),mode:'local_ready_remote_stopped'});this.persistFence();
  }return snap;
 }
 async enforceCost(platform:Platform|undefined,sample:unknown){const decision=costDecision(sample,this.now());this.store.set('costDecision',{...decision,at:this.now()});if(!decision.allow&&this.location==='railway'&&this.barrier())return this.prepareHandoff('local',platform,sample as CostSample);return null;}
}
export function validateSnapshot(dir:string,key?:string):Manifest {
 const m=manifestSchema.parse(JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')));if(m.encryption&&m.purpose!=='backup')throw new Error('Sólo las copias de seguridad admiten este tipo de artefacto.');const {state,originals}=snapshotData(dir,m,key);if(m.encryption&&m.originalsIncluded?.some(hash=>!originals.has(hash)))throw new Error('Falta un original en el paquete cifrado.');
 const db=new DatabaseSync(':memory:');db.deserialize(state);try{
  if(db.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Snapshot corrupto: SQLite.');
  const row:any=db.prepare("SELECT value FROM settings WHERE key='runtime'").get(),runtime=JSON.parse(row.value),cursor:any=db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM audit').get();
  if(runtime.generation!==m.generation||runtime.owner!==m.owner||Number(cursor.n)!==m.cursor||!db.prepare('SELECT version FROM migrations WHERE version=1').get())throw new Error('Manifiesto incompatible con base.');
  const documents=db.prepare('SELECT id,hash FROM documents ORDER BY id').all(),declared=[...m.documents].sort((a,b)=>a.id.localeCompare(b.id));if(JSON.stringify(documents)!==JSON.stringify(declared))throw new Error('Las referencias de documentos no coinciden con la base.');
 }finally{db.close();}return m;
}
export async function importSnapshot(dir:string,dest:string,location:'local'|'railway',options:{platform?:Platform;allowSimulation?:boolean;cost?:CostSample;restoreBackup?:boolean;localStopped?:boolean;originalDir?:string;backupKey?:string}={}){
 const m=validateSnapshot(dir,options.backupKey);if(!options.restoreBackup&&(m.purpose!=='handoff'||m.target!==location||m.owner!==null))throw new Error('No es exportación final para este destino.');
 mkdirSync(dest,{recursive:true});const lock=join(dest,'process.lock');if(existsSync(lock))throw new Error('Detener el proceso destino antes de importar.');
 const fencePath=join(dest,'runtime-fence.json'),fence=existsSync(fencePath)?JSON.parse(readFileSync(fencePath,'utf8')):null;
 if(fence&&(m.generation<fence.generation||m.generation===fence.generation&&m.cursor<Number(fence.cursor??0)))throw new Error('Snapshot antiguo respecto a la barrera persistente.');
 const currentPath=join(dest,'hogar.sqlite');if(existsSync(currentPath)){const db=new DatabaseSync(currentPath,{readOnly:true});try{const row:any=db.prepare("SELECT value FROM settings WHERE key='runtime'").get(),r=JSON.parse(row.value),c:any=db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM audit').get();if(r.generation>m.generation||Number(c.n)>m.cursor||r.owner===location&&r.mode.endsWith('_active'))throw new Error('La base destino tiene propiedad activa o cambios posteriores.');const source=new DatabaseSync(join(dir,'state.sqlite'),{readOnly:true});try{const previous=db.prepare('SELECT * FROM audit ORDER BY seq').all(),prefix=source.prepare('SELECT * FROM audit WHERE seq<=? ORDER BY seq').all(Number(c.n));if(JSON.stringify(previous)!==JSON.stringify(prefix))throw new Error('Historia divergente: no sobrescribir una rama local.');}finally{source.close();}}finally{db.close();}}
 if(!options.restoreBackup){
  if(location==='local'){if(!options.platform||options.platform.simulated&&!options.allowSimulation||!(await options.platform.stopped()))throw new Error('No se demostró parada remota.');}
  else if(!options.localStopped||!costDecision(options.cost,new Date().toISOString()).allow)throw new Error('Falta parada local explícita o margen de costos actual.');
 }
 const payload=snapshotData(dir,m,options.backupKey),tmp=currentPath+`.${randomUUID()}.incoming`;writeFileSync(tmp,payload.state,{mode:0o600});const incoming=new DatabaseSync(tmp);const runtime:RuntimeState={mode:options.restoreBackup?'recovery_required':location==='local'?'local_active':'railway_active',owner:options.restoreBackup?null:location,generation:m.generation,localRequested:location==='local',reason:options.restoreBackup?'Restauración: falta reclamar propiedad.':undefined};incoming.prepare("UPDATE settings SET value=? WHERE key='runtime'").run(JSON.stringify(runtime));
 const originals=join(dest,'originals');mkdirSync(originals,{recursive:true});for(const d of m.documents){const target=join(originals,d.hash),source=join(options.originalDir??join(dir,'originals'),d.hash);if(payload.originals.has(d.hash)){if(existsSync(target)&&hash(readFileSync(target))!==d.hash)throw new Error(`El original local ${d.hash} está corrupto; conservarlo y apartarlo antes de restaurar.`);if(!existsSync(target))writeFileSync(target,payload.originals.get(d.hash)!,{mode:0o600});}else if(!existsSync(target)&&existsSync(source)&&hash(readFileSync(source))===d.hash)writeFileSync(target,readFileSync(source),{mode:0o600});const valid=existsSync(target)&&hash(readFileSync(target))===d.hash;incoming.prepare('UPDATE blobs SET present=?,local_copy=? WHERE hash=?').run(Number(valid),Number(valid&&location==='local'),d.hash);}incoming.close();
 if(existsSync(currentPath)){const old=new DatabaseSync(currentPath);try{old.prepare('VACUUM INTO ?').run(join(dest,`recovery-before-${randomUUID()}.sqlite`));}finally{old.close();}}
 for(const suffix of ['-wal','-shm'])if(existsSync(currentPath+suffix))unlinkSync(currentPath+suffix);renameSync(tmp,currentPath);
 writeFileSync(fencePath,JSON.stringify({...runtime,cursor:m.cursor}),{mode:0o600});return m;
}
export function acquireLock(dir:string){mkdirSync(dir,{recursive:true});const path=join(dir,'process.lock');if(existsSync(path)){const pid=Number(readFileSync(path,'utf8'));let alive=true;try{process.kill(pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')alive=false;}if(alive)throw new Error('Ya existe un proceso de esta instalación.');unlinkSync(path);}writeFileSync(path,String(process.pid),{flag:'wx'});return ()=>{if(existsSync(path)&&readFileSync(path,'utf8')===String(process.pid))unlinkSync(path);};}
