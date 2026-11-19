import { mkdirSync,writeFileSync,readFileSync,existsSync,renameSync,unlinkSync } from 'node:fs';
import { join,basename,extname } from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { Store } from './store.js';
import { retention } from '../../../packages/domain/src/dates.js';
import type { AttachmentRef,Item } from '../../../packages/domain/src/types.js';
export const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const types:Record<string,string>={'.pdf':'application/pdf','.txt':'text/plain','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'};
function validateBytes(mime:string,bytes:Uint8Array){
 if(mime==='image/jpeg'&&!(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff))throw new Error('El contenido no coincide con JPEG.');
 if(mime==='image/png'&&!(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a))throw new Error('El contenido no coincide con PNG.');
 if(mime==='application/pdf'&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('El contenido no coincide con PDF.');
 if(mime==='text/plain'){if(bytes.includes(0))throw new Error('El texto contiene bytes nulos.');try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('El texto debe estar codificado en UTF-8.');}}
}
export class Files {
 constructor(public store:Store,public storage:'local_only'|'bounded_remote',public location:'local'|'railway',public now:()=>string=()=>new Date().toISOString()){mkdirSync(join(store.dir,'originals'),{recursive:true});}
 path(digest:string){if(!/^[a-f\d]{64}$/.test(digest))throw new Error('Identificador de bytes inválido.');return join(this.store.dir,'originals',digest);}
 validate(ref:AttachmentRef){const ext=extname(ref.name).toLowerCase();if(!types[ext]||types[ext]!==ref.mime)throw new Error('Tipo o extensión no admitido/coherente. Usar PDF, TXT, JPG o PNG.');if(!Number.isSafeInteger(ref.size)||ref.size<=0||ref.size>10000000)throw new Error('Límite por archivo: 10.000.000 bytes.');if(basename(ref.name)!==ref.name||/[\x00-\x1f<>:"/\\|?*]/.test(ref.name)||ref.name.length>180)throw new Error('Nombre de archivo inválido.');}
 ready(ref:AttachmentRef):Item{
  this.validate(ref);if(this.storage==='local_only'&&this.location!=='local')throw new Error('Guardar original requiere la PC disponible.');
  if(!ref.targetId||!ref.purpose?.trim())throw new Error('Falta concepto y registro destino inequívoco. El original no se guardó.');const item=this.store.item(ref.targetId);if(!item)throw new Error('Registro inexistente.');
  if(['task','appointment','bill','card_statement','query'].includes(item.kind)&&(!item.due||!item.assignees.length))throw new Error('Falta fecha o responsables del registro.');
  if(Number(this.store.one('SELECT COUNT(*) AS n FROM document_links WHERE record_id=?',item.id).n)>=5)throw new Error('Límite: cinco archivos por registro.');return item;
 }
 save(ref:AttachmentRef,bytes:Uint8Array):string{
  const item=this.ready(ref);if(bytes.byteLength!==ref.size)throw new Error('El tamaño recibido no coincide.');validateBytes(ref.mime,bytes);const digest=hash(bytes);
  const known=this.store.one('SELECT * FROM blobs WHERE hash=?',digest),present=known?.present&&existsSync(this.path(digest));
  if(this.location==='railway'&&!present){const used=Number(this.store.one('SELECT COALESCE(SUM(size),0) AS n FROM blobs WHERE present=1').n);if(used+bytes.length>100000000)throw new Error('Cuota remota de originales completa. Texto disponible.');}
  if(!present){const tmp=this.path(digest)+`.${randomUUID()}.tmp`;writeFileSync(tmp,bytes,{flag:'wx',mode:0o600});if(hash(readFileSync(tmp))!==digest){unlinkSync(tmp);throw new Error('Falló la integridad al guardar.');}renameSync(tmp,this.path(digest));}
  try{return this.store.tx(()=>{
   this.ready(ref);this.store.run('INSERT INTO blobs(hash,size,present) VALUES(?,?,1) ON CONFLICT(hash) DO UPDATE SET present=1,deleted_at=NULL',digest,bytes.length);
   const id=`D-${randomUUID().slice(0,8)}`;this.store.run('INSERT INTO documents VALUES(?,?,?,?,?,?)',id,digest,ref.name,ref.mime,ref.purpose!,this.now());this.store.run('INSERT INTO document_links VALUES(?,?)',id,item.id);this.store.run('DELETE FROM pending_attachments WHERE id=?',ref.id);this.store.audit(this.now(),'system','file_saved',item.id,{id,hash:digest,size:bytes.length});return id;
  });}catch(error){if(!present&&!this.store.one('SELECT hash FROM blobs WHERE hash=? AND present=1',digest)&&existsSync(this.path(digest)))unlinkSync(this.path(digest));throw error;}
 }
 list(){return this.store.all('SELECT d.*,b.size,b.present,b.local_copy,b.deleted_at FROM documents d JOIN blobs b ON b.hash=d.hash').map(d=>{const links=this.store.all('SELECT record_id FROM document_links WHERE document_id=?',d.id).map(x=>this.store.item(x.record_id)!);const active=links.some(i=>i.status==='active'),dates=links.map(i=>i.resolvedAt?retention(i.resolvedAt):null);return {...d,links:links.map(i=>i.id),deleteAfter:active||dates.includes(null)?null:dates.sort().at(-1),available:!!d.present&&existsSync(this.path(d.hash))};});}
 read(id:string){const d=this.store.one('SELECT d.*,b.present FROM documents d JOIN blobs b ON b.hash=d.hash WHERE d.id=?',id);if(!d||!d.present||!existsSync(this.path(d.hash)))throw new Error('Original no disponible en esta instalación. Puede requerir la PC o un reenvío.');const bytes=readFileSync(this.path(d.hash));if(hash(bytes)!==d.hash)throw new Error('Falló integridad del original.');return {...d,bytes};}
 cleanup(){if(this.location!=='railway')return [];
  const deleted:string[]=[];for(const b of this.store.all('SELECT * FROM blobs WHERE present=1')){
   const docs=this.list().filter(d=>d.hash===b.hash);if(!docs.length||docs.some(d=>!d.deleteAfter||d.deleteAfter>this.now()))continue;
   const activeSend=this.store.all("SELECT payload FROM outbox WHERE state IN ('pending','sending','delivery_unknown')").some(r=>docs.some(d=>JSON.parse(r.payload).documentId===d.id));if(activeSend)continue;
   this.store.tx(()=>{const path=this.path(b.hash);if(existsSync(path))unlinkSync(path);this.store.run('UPDATE blobs SET present=0,deleted_at=? WHERE hash=?',this.now(),b.hash);this.store.audit(this.now(),'system','remote_original_deleted',null,{hash:b.hash,localCopy:!!b.local_copy});});deleted.push(b.hash);
  }return deleted;
 }
 markLocalCopy(id:string,digest:string){const d=this.store.one('SELECT hash FROM documents WHERE id=?',id);if(!d||d.hash!==digest)throw new Error('Copia no coincidente.');this.store.run('UPDATE blobs SET local_copy=1 WHERE hash=?',digest);}
}
