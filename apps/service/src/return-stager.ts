import { mkdirSync,writeFileSync,readFileSync,existsSync,readdirSync,statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { DatabaseSync } from 'node:sqlite';
import { hash } from './files.js';
import { validateSnapshot } from './runtime.js';
export class ReturnStager {
 private id?:string;
 private verified=false;
 constructor(private root:string){}
 manifest(raw:unknown){const body=z.object({manifest:z.object({id:z.string().regex(/^handoff-[\w-]+$/),format:z.literal(1),schema:z.number().int().min(1).max(5),purpose:z.literal('handoff'),target:z.literal('railway'),owner:z.null(),generation:z.number().int().positive(),cursor:z.number().int().nonnegative(),hash:z.string().regex(/^[a-f\d]{64}$/)}).passthrough(),ticket:z.object({localReleased:z.literal(true),generation:z.number().int(),cursor:z.number().int(),hash:z.string()})}).parse(raw);const m=body.manifest,t=body.ticket;if(t.generation!==m.generation||t.cursor!==m.cursor||t.hash!==m.hash)throw new Error('Ticket no corresponde a la exportación cerrada.');if(this.id&&this.id!==m.id)throw new Error('Ya hay un regreso en curso.');this.id=m.id;const dir=join(this.root,'incoming',m.id);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'manifest.json'),JSON.stringify(m),{mode:0o600});return {id:m.id};}
 dir(id:string){if(id!==this.id)throw new Error('Transferencia no iniciada en esta recuperación.');return join(this.root,'incoming',id);}
 state(id:string,bytes:Buffer){this.verified=false;if(!bytes.length||bytes.length>14000000)throw new Error('Exportación fuera del límite de transferencia de 14 MB.');const dir=this.dir(id),m=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8'));if(hash(bytes)!==m.hash)throw new Error('Falló checksum de la base entrante.');writeFileSync(join(dir,'state.sqlite'),bytes,{mode:0o600});validateSnapshot(dir);const db=new DatabaseSync(join(dir,'state.sqlite'),{readOnly:true});try{const size:any=db.prepare('SELECT COALESCE(SUM(size),0) AS n FROM blobs WHERE present=1').get();if(Number(size.n)>100000000)throw new Error('Los originales locales exceden la cuota remota. Revisar selección antes de regresar.');}finally{db.close();}this.verified=true;return {verified:true};}
 original(id:string,digest:string,bytes:Buffer){if(!this.verified)throw new Error('Primero validar la base entrante.');const dir=this.dir(id),m=validateSnapshot(dir);if(!m.documents.some(d=>d.hash===digest)||bytes.length>10000000||hash(bytes)!==digest)throw new Error('Original no corresponde al manifiesto o falla integridad.');const originals=join(this.root,'originals');mkdirSync(originals,{recursive:true});const target=join(originals,digest),used=readdirSync(originals).reduce((n,file)=>n+statSync(join(originals,file)).size,0);if(!existsSync(target)&&used+bytes.length>100000000)throw new Error('La cuota física remota no permite más originales.');writeFileSync(target,bytes,{mode:0o600});return {verified:true};}
 commit(id:string){if(!this.verified)throw new Error('La base entrante no fue validada.');const dir=this.dir(id),m=validateSnapshot(dir);return {dir,manifest:m};}
}
