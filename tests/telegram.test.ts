import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { Files } from '../apps/service/src/files.js';
import { RuntimeController } from '../apps/service/src/runtime.js';
import { TelegramMessaging,type TelegramApiClient } from '../apps/service/src/telegram.js';

mkdirSync('.test-data',{recursive:true});
const config={token:'1234567890:synthetic-token-for-tests-only',chatId:'-100123',people:{kevin:'101',luisina:'202'},activatedAt:'2026-10-16T00:00:00.000Z'};
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
class FakeTelegram implements TelegramApiClient {
 updates:any[]=[];count=3;webhook='';requests:{method:string;params:any}[]=[];bytes=Buffer.from('%PDF-1.4\nsynthetic test document');
 async call(method:string,params:Record<string,unknown>={}){
  this.requests.push({method,params});
  if(method==='getMe')return {id:303,is_bot:true,can_read_all_group_messages:true};
  if(method==='getWebhookInfo')return {url:this.webhook};
  if(method==='getChat')return {id:-100123,type:'supergroup'};
  if(method==='getChatMemberCount')return this.count;
  if(method==='getChatMember'){const id=String(params.user_id);return {status:id==='303'?'administrator':'member',is_member:true,user:{id:Number(id),first_name:id==='101'?'Kevin':id==='202'?'Luisina':'ORDEN'}};}
  if(method==='getUpdates'){if(this.updates.length)return this.updates.splice(0);await pause(10);return [];}
  if(method==='getFile')return {file_path:'documents/file.pdf',file_size:this.bytes.length};
  if(method==='sendMessage')return {message_id:900};
  if(method==='sendDocument')return {message_id:901};
  throw new Error(`Unexpected Telegram method ${method}`);
 }
 async upload(method:string,fields:Record<string,string>,_name:string,_mime:string,_bytes:Uint8Array){this.requests.push({method,params:fields});return {message_id:901};}
 async download(_path:string,maxBytes:number){assert.ok(this.bytes.length<=maxBytes);return this.bytes;}
}
const update=(update_id:number,message:any)=>({update_id,message});
const message=(message_id:number,text:string,from=101,date=1792152000)=>({message_id,date,chat:{id:-100123,type:'supergroup'},from:{id:from,is_bot:false},text});

test('Telegram polling: allowlist numérica, frontera temporal, deduplicación y cursor durable',async()=>{
 const dir=mkdtempSync(join('.test-data','telegram-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();const engine=new Engine(store,'local',()=> '2026-10-16T12:00:00.000Z'),files=new Files(store,'local_only','local'),api=new FakeTelegram();
 const old=update(10,message(10,'gaste 10mil en antiguo',101,1)),current=update(11,message(11,'gaste 10mil en kiosco'));
 api.updates=[old,current,current];let calls=0;const adapter=new TelegramMessaging(store,files,config,async incoming=>{calls++;engine.receive(incoming);},()=>true,api);
 try{
  await adapter.start();for(let n=0;n<40&&!store.one('SELECT next_offset FROM telegram_cursor WHERE id=1');n++)await pause(10);
  assert.equal(calls,1);assert.equal(store.items('expense').length,1);assert.equal(store.one('SELECT next_offset FROM telegram_cursor WHERE id=1').next_offset,12);
  assert.equal(store.one("SELECT outcome FROM telegram_updates WHERE update_id=10").outcome,'stale');assert.equal(store.one("SELECT outcome FROM telegram_updates WHERE update_id=11").outcome,'message');
  const poll=api.requests.find(x=>x.method==='getUpdates');assert.deepEqual(poll?.params.allowed_updates,['message','callback_query','chat_member','my_chat_member']);
 }finally{await adapter.stop();store.close();rmSync(dir,{recursive:true,force:true});}
});

test('Telegram pausa ante miembro ajeno, no procesa sus mensajes y requiere revisión explícita',async()=>{
 const dir=mkdtempSync(join('.test-data','telegram-members-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();const engine=new Engine(store),files=new Files(store,'local_only','local'),api=new FakeTelegram(),received:any[]=[];
 const adapter=new TelegramMessaging(store,files,config,async incoming=>{received.push(incoming);engine.receive(incoming);},()=>true,api);
 try{
  await adapter.start();await pause(30);assert.equal(adapter.ready,true);
  await (adapter as any).processUpdate(update(50,message(50,'gaste 10mil en kiosco',999)));
  await (adapter as any).processUpdate(update(51,message(51,'gaste 20mil en kiosco')));
  assert.equal(store.get('groupPaused'),true);assert.equal(received.length,0);assert.equal(store.items('expense').length,0);
  api.count=4;await assert.rejects(adapter.reviewGroup(),/siguen pausadas/);assert.equal(store.get('groupPaused'),true);
  api.count=3;await adapter.reviewGroup();assert.equal(store.get('groupPaused'),false);assert.equal(adapter.ready,true);
 }finally{await adapter.stop();store.close();rmSync(dir,{recursive:true,force:true});}
});

test('Telegram rechaza webhook previo y valida archivo entrante contra límites y hash del dominio',async()=>{
 const dir=mkdtempSync(join('.test-data','telegram-file-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();const engine=new Engine(store),files=new Files(store,'local_only','local'),api=new FakeTelegram();api.webhook='https://example.invalid/webhook';
 const adapter=new TelegramMessaging(store,files,config,async incoming=>{engine.receive(incoming);},()=>true,api);
 try{await assert.rejects(adapter.start(),/webhook configurado/);assert.equal(api.requests.some(x=>x.method==='getUpdates'),false);}finally{await adapter.stop();}
 api.webhook='';await adapter.start();await pause(30);
 const bill=engine.create({kind:'bill',title:'Seguro',amount:1000,currency:'ARS',assignees:['kevin'],due:'2026-12-01T15:00:00.000Z',dateOnly:true,data:{}},'kevin','2026-11-18T12:00:00.000Z');
 const doc={file_id:'file-token',file_name:'seguro.pdf',mime_type:'application/pdf',file_size:api.bytes.length};
 await (adapter as any).processUpdate(update(52,{...message(52,`Comprobante ${bill.id}`),document:doc}));
 const pending=store.one('SELECT payload FROM pending_attachments WHERE id=?','tg:-100123:52'),ref=JSON.parse(pending.payload);assert.equal(ref.fileId,'file-token');
 const bytes=await adapter.media(ref),saved=files.save(ref,bytes);assert.equal(store.one('SELECT hash FROM documents WHERE id=?',saved).hash,(await import('../apps/service/src/files.js')).hash(api.bytes));
 await adapter.stop();store.close();rmSync(dir,{recursive:true,force:true});
});
