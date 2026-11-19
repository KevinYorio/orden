import { DatabaseSync } from 'node:sqlite';
import { readFileSync,mkdirSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID,createHash } from 'node:crypto';
import type { Item,Kind,RuntimeState,Draft } from '../../../packages/domain/src/types.js';
import { prefixes } from '../../../packages/domain/src/types.js';
export class Store {
 db:DatabaseSync;
 constructor(public dir:string){
  mkdirSync(dir,{recursive:true});this.db=new DatabaseSync(join(dir,'hogar.sqlite'));
  this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  this.db.exec('CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY)');
  const migrationDir=fileURLToPath(new URL('../migrations/',import.meta.url));
  for(const filename of readdirSync(migrationDir).filter(name=>/^\d{3}(?:_[a-z0-9_-]+)?\.sql$/i.test(name)).sort()){
   const version=Number(filename.slice(0,3));if(this.one('SELECT version FROM migrations WHERE version=?',version))continue;
   this.tx(()=>{this.db.exec(readFileSync(join(migrationDir,filename),'utf8'));this.run('INSERT INTO migrations VALUES(?)',version);});
  }
  if(!this.get('runtime'))this.tx(()=>{this.set('runtime',{mode:'recovery_required',owner:null,generation:0,localRequested:false});this.set('shoppingList',{assignees:['kevin','luisina'],due:null});
   for(const [id,name,currency,card] of [['cash-ars','Efectivo ARS','ARS',0],['cash-usd','Efectivo USD','USD',0],['nacion','Banco Nación','ARS',0],['mp','Mercado Pago','ARS',0],['card','Tarjeta por configurar','ARS',1]])this.run('INSERT INTO accounts(id,name,currency,card) VALUES(?,?,?,?)',id,name,currency,card);
  });this.run("UPDATE outbox SET state='delivery_unknown' WHERE state='sending'");
 }
 one(sql:string,...args:any[]):any{return this.db.prepare(sql).get(...args);}
 all(sql:string,...args:any[]):any[]{return this.db.prepare(sql).all(...args);}
 run(sql:string,...args:any[]){return this.db.prepare(sql).run(...args);}
 tx<T>(fn:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 get<T=any>(key:string):T|undefined{const r=this.one('SELECT value FROM settings WHERE key=?',key);return r?JSON.parse(r.value):undefined;}
 set(key:string,value:unknown){this.run('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(value));}
 runtime():RuntimeState{return this.get<RuntimeState>('runtime')!;}
 item(id:string):Item|undefined{const r=this.one('SELECT payload FROM records WHERE id=?',id.toUpperCase());return r?JSON.parse(r.payload):undefined;}
 items(kind?:Kind):Item[]{return this.all(kind?'SELECT payload FROM records WHERE kind=?':'SELECT payload FROM records',...(kind?[kind]:[])).map(r=>JSON.parse(r.payload));}
 save(i:Item){this.run('INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,version=excluded.version,payload=excluded.payload',i.id,i.kind,i.status,i.version,JSON.stringify(i));}
 id(kind:Kind){const prefix=prefixes[kind],key=`sequence:${prefix}`,n=(this.get<number>(key)??0)+1;this.set(key,n);return `${prefix}-${String(n).padStart(4,'0')}`;}
 audit(at:string,actor:string,action:string,id:string|null,detail:unknown){this.run('INSERT INTO audit(at,actor,action,record_id,detail) VALUES(?,?,?,?,?)',at,actor,action,id,JSON.stringify(detail));}
 cursor(){return Number(this.one('SELECT COALESCE(MAX(seq),0) AS n FROM audit').n);}
 revision(){const digest=createHash('sha256');for(const table of ['records','inbox','drafts','jobs','outbox','payments','accounts','blobs','documents','document_links','pending_attachments','audit','telegram_cursor','telegram_updates','memory_entities','memory_facts','memory_relations','document_extractions','merchants','products','product_aliases','purchases','purchase_lines','purchase_documents','promotions','agent_executions'])digest.update(JSON.stringify(this.all(`SELECT * FROM ${table} ORDER BY rowid`)));digest.update(JSON.stringify(this.all("SELECT * FROM settings WHERE key NOT IN ('lastBackupState','finalSnapshot') AND key NOT LIKE 'outgoing:%' ORDER BY key")));return digest.digest('hex');}
 drafts(author?:string):Draft[]{return this.all("SELECT * FROM drafts WHERE status='open'"+(author?' AND author=?':''),...(author?[author]:[])).map(r=>({id:r.id,author:r.author,messageId:r.message_id,at:r.at,payload:JSON.parse(r.payload),question:r.question,followups:r.followups,status:r.status}));}
 draft(author:string,messageId:string,at:string,payload:unknown,question:string){const id=`B-${randomUUID().slice(0,8)}`;this.run('INSERT INTO drafts(id,author,message_id,at,payload,question) VALUES(?,?,?,?,?,?)',id,author,messageId,at,JSON.stringify(payload),question);return id;}
 enqueue(id:string,at:string,payload:unknown,record?:Item){this.run('INSERT OR IGNORE INTO outbox(id,record_id,version,payload,next_at) VALUES(?,?,?,?,?)',id,record?.id??null,record?.version??null,JSON.stringify(payload),at);}
 close(){this.db.close();}
}
