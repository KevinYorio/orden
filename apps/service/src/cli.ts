import { join,resolve } from 'node:path';
import { existsSync,readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { Store } from './store.js';
import { RuntimeController,validateSnapshot,importSnapshot,acquireLock } from './runtime.js';
import { RailwayPlatform,costDecision } from './platform.js';
import { config } from './config.js';
const c=config(),[command,arg]=process.argv.slice(2);
const platform=()=>new RailwayPlatform({projectId:process.env.RAILWAY_PROJECT_ID??'',serviceId:process.env.RAILWAY_SERVICE_ID??'',environmentId:process.env.RAILWAY_ENVIRONMENT_ID??'',deploymentId:process.env.RAILWAY_DEPLOYMENT_ID??''},process.env.RAILWAY_API_TOKEN??'');
if(command==='validate')console.log(validateSnapshot(resolve(arg),c.backupEncryptionKey));
else if(command==='import'){
 const sample=process.env.RAILWAY_COST_SAMPLE_FILE?JSON.parse(readFileSync(process.env.RAILWAY_COST_SAMPLE_FILE,'utf8')):undefined;
 if(c.location==='railway')throw new Error('Regreso remoto requiere ticket de cierre local verificado; usar return-remote desde la PC.');
 console.log(await importSnapshot(resolve(arg),c.dir,c.location,{platform:platform(),backupKey:c.backupEncryptionKey}));
}else if(command==='restore')console.log(await importSnapshot(resolve(arg),c.dir,c.location,{restoreBackup:true,backupKey:c.backupEncryptionKey}));
else if(command==='return-remote'){
 // Ejecutar en la PC con exportación de traspaso y proceso local detenido.
 const release=acquireLock(c.dir);try{
  const m=validateSnapshot(resolve(arg),c.backupEncryptionKey),s=new Store(c.dir),r=s.runtime();if(r.owner!==null||r.generation!==m.generation||s.cursor()!==m.cursor||r.mode!=='handoff_to_local'||m.target!=='railway')throw new Error('No hay cierre local consistente para esta exportación.');s.close();
  if(!c.remoteUrl||!c.remoteToken)throw new Error('Falta URL/token de la app remota en recovery_only.');const remote=new URL(c.remoteUrl);if(remote.protocol!=='https:'||remote.username||remote.password)throw new Error('Requiere URL HTTPS sin credenciales embebidas.');
  const request=async(path:string,method='GET',body?:any,binary=false)=>{const response=await fetch(new URL(path,remote),{method,headers:{authorization:`Bearer ${c.remoteToken}`,...(body===undefined?{}:{'content-type':binary?'application/octet-stream':'application/json'})},body:body===undefined?undefined:binary?new Uint8Array(body):JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});const value:any=await response.json();if(!response.ok)throw new Error(value.error??'Transferencia remota rechazada.');return value;};
  const status=await request('/api/status');if(status.runtime.mode!=='recovery_only')throw new Error('El remoto debe estar en recovery_only sin WhatsApp ni planificador.');await platform().verify();
  await request('/api/return/manifest','POST',{manifest:m,ticket:{localReleased:true,generation:m.generation,cursor:m.cursor,hash:m.hash}});
  await request(`/api/return/${m.id}/state`,'PUT',readFileSync(join(resolve(arg),'state.sqlite')),true);
  const {hash}=await import('./files.js');for(const d of m.documents){const path=join(c.dir,'originals',d.hash);if(existsSync(path)){const bytes=readFileSync(path);if(hash(bytes)!==d.hash)throw new Error('Original local corrupto.');await request(`/api/return/${m.id}/original/${d.hash}`,'PUT',bytes,true);}}
  console.log(await request(`/api/return/${m.id}/commit`,'POST',{}));
  let stopped=false;for(let i=0;i<6;i++){await new Promise(ok=>setTimeout(ok,2000));if(await platform().stopped()){stopped=true;break;}}
  console.log(stopped?'Regreso importado y remoto detenido. Iniciar explícitamente Railway en modo normal después de verificar margen.':'No se comprobó la parada tras la importación. Mantener ambos emisores deshabilitados y revisar Railway.');
 }finally{release();}
}else if(['init-local','backup','status'].includes(command)){
 const release=acquireLock(c.dir);try{const s=new Store(c.dir),r=new RuntimeController(s,c.location,undefined,c.backupEncryptionKey);if(command==='init-local'){if(c.location!=='local')throw new Error('Inicialización directa sólo local.');r.initLocal();}if(command==='backup')console.log(r.backup());else console.log(s.runtime());s.close();}finally{release();}
}else if(command==='pull-final'){
 if(!c.remoteUrl||!c.remoteToken)throw new Error('Falta URL HTTPS y token de la app remota.');const base=new URL(c.remoteUrl);if(base.protocol!=='https:')throw new Error('Requiere HTTPS.');const fetchRemote=async(path:string)=>{const r=await fetch(new URL(path,base),{headers:{authorization:`Bearer ${c.remoteToken}`},signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw new Error(`Descarga falló: ${r.status}. No hay API si el deployment está apagado.`);return r;};
 const info:any=await (await fetchRemote('/api/final')).json();if(!/^handoff-[\w-]+$/.test(info.id))throw new Error('ID inválido.');const dest=join(c.dir,'incoming',info.id);mkdirSync(dest,{recursive:true});for(const filename of ['manifest.json','state.sqlite'])writeFileSync(join(dest,filename),Buffer.from(await (await fetchRemote(`/api/snapshots/${info.id}/${filename}`)).arrayBuffer()));const manifest=validateSnapshot(dest);console.log(manifest);
 const {hash}=await import('./files.js'),originals=join(c.dir,'originals');mkdirSync(originals,{recursive:true});let missing=0;const started=Date.now();for(const d of manifest.documents){if(Date.now()-started>90000){missing++;continue;}const path=join(originals,d.hash);if(existsSync(path)&&hash(readFileSync(path))===d.hash)continue;try{const r=await fetchRemote(`/api/documents/${d.id}`),bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>10000000||hash(bytes)!==d.hash)throw new Error('Integridad inválida.');writeFileSync(path,bytes,{mode:0o600});}catch{missing++;}}
 console.log(`Estado descargado en ${dest}. Originales no recuperados: ${missing}. Verificar parada e importar antes de emitir.`);
}else throw new Error('Comandos: init-local, status, backup, validate <carpeta>, import <carpeta>, restore <carpeta>, pull-final, return-remote <carpeta>.');
