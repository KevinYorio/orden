import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Person,Incoming,AttachmentRef } from '../../../packages/domain/src/types.js';
import type { WAMessage,AuthenticationState,WASocket } from '@whiskeysockets/baileys';
import { Store } from './store.js';
import { Files } from './files.js';
export interface Outgoing {text:string;mentions:Person[];documentId?:string;}
export interface MessagingAdapter {status:string;ready:boolean;start():Promise<void>;stop():Promise<void>;send(id:string,payload:Outgoing):Promise<string>;media?(ref:AttachmentRef):Promise<Buffer>;reviewGroup?():Promise<void>;}
export class SimulatedMessaging implements MessagingAdapter {
 status='simulado';ready=true;sent:{id:string;payload:Outgoing}[]=[];fail=false;
 async start(){}async stop(){this.ready=false;}async send(id:string,payload:Outgoing){if(this.fail)throw new Error('Entrega simulada incierta.');this.sent.push({id,payload});return `sim:${id}`;}
}
export class Dispatcher {
 constructor(public store:Store,public adapter:MessagingAdapter,public files:Files,public allowed:()=>boolean,public now:()=>string=()=>new Date().toISOString()){}
 async drain(){if(!this.allowed()||!this.adapter.ready)return;
  const rows=this.store.all("SELECT * FROM outbox WHERE state='pending' AND next_at<=? ORDER BY rowid LIMIT 20",this.now());
  for(const row of rows){if(!this.allowed()||!this.adapter.ready)break;
   if(row.record_id){const item=this.store.item(row.record_id);if(!item||item.status!=='active'||item.version!==row.version){this.store.run("UPDATE outbox SET state='cancelled' WHERE id=?",row.id);continue;}}
   this.store.run("UPDATE outbox SET state='sending',attempts=attempts+1 WHERE id=?",row.id);
   try{const evidence=await this.adapter.send(row.id,JSON.parse(row.payload));this.store.run("UPDATE outbox SET state='sent',evidence=? WHERE id=?",evidence,row.id);}catch(error){this.store.run("UPDATE outbox SET state='delivery_unknown',evidence=? WHERE id=?",(error as Error).message.slice(0,240),row.id);this.store.set('transportError',{at:this.now(),message:'Entrega incierta. Revisar evidencia; no se reenvía ciegamente.'});break;}
  }
 }
}
export interface WhatsAppConfig {groupId:string;people:Record<Person,string[]>;botIds:string[];activatedAt:string;}
export class BaileysMessaging implements MessagingAdapter {
 status='pendiente_vinculacion';ready=false;qr?:string;socket?:WASocket;private closed=false;private reconnects=0;private authDb?:DatabaseSync;private timer?:ReturnType<typeof setTimeout>;private gateTimer?:ReturnType<typeof setTimeout>;
 constructor(public store:Store,public files:Files,public config:WhatsAppConfig,private inbound:(m:Incoming)=>Promise<void>,private canRun:()=>boolean){}
 private person(...ids:(string|null|undefined)[]):Person|undefined{const matches=(['kevin','luisina'] as Person[]).filter(p=>ids.some(id=>id&&this.config.people[p].includes(id)));return matches.length===1?matches[0]:undefined;}
 async membership(){if(!this.socket)throw new Error('Transporte sin conexión.');const meta=await this.socket.groupMetadata(this.config.groupId);const known=[...this.config.botIds,...this.config.people.kevin,...this.config.people.luisina];const participants=meta.participants;
  const safe=participants.length===3&&participants.every(p=>[p.id,p.phoneNumber,p.lid].some(id=>id&&known.includes(id)))&&(['kevin','luisina'] as Person[]).every(p=>participants.some(x=>[x.id,x.phoneNumber,x.lid].some(id=>id&&this.config.people[p].includes(id))));
  this.store.set('groupPaused',!safe);if(!safe){this.status='grupo_no_verificado';this.ready=false;throw new Error('Grupo no coincide con las tres identidades verificadas.');}return meta;
 }
 async start(){
  if(!this.canRun())throw new Error('Arranque de WhatsApp bloqueado por propiedad.');
  if(!this.config.groupId||!this.config.people.kevin.length||!this.config.people.luisina.length||!this.config.botIds.length||!Number.isFinite(Date.parse(this.config.activatedAt)))throw new Error('Faltan grupo, identidades verificadas o frontera de activación.');
  this.closed=false;const b=await import('@whiskeysockets/baileys');
  if(!this.authDb){const dir=join(this.store.dir,'session');mkdirSync(dir,{recursive:true});this.authDb=new DatabaseSync(join(dir,'auth.sqlite'));this.authDb.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS auth(k TEXT PRIMARY KEY,v TEXT NOT NULL)');}
  const db=this.authDb,read=(key:string)=>{const row:any=db.prepare('SELECT v FROM auth WHERE k=?').get(key);return row?JSON.parse(row.v,b.BufferJSON.reviver):null;},write=(key:string,value:any)=>{if(value)db.prepare('INSERT INTO auth VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(key,JSON.stringify(value,b.BufferJSON.replacer));else db.prepare('DELETE FROM auth WHERE k=?').run(key);};
  const creds=read('creds')??b.initAuthCreds();const auth:AuthenticationState={creds,keys:{get:async(type,ids)=>{const result:any={};for(const id of ids){let value=read(`${type}:${id}`);if(type==='app-state-sync-key'&&value)value=b.proto.Message.AppStateSyncKeyData.fromObject(value);result[id]=value;}return result;},set:async data=>{db.exec('BEGIN IMMEDIATE');try{for(const [type,entries] of Object.entries(data))for(const [id,value] of Object.entries(entries??{}))write(`${type}:${id}`,value);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}}};
  const logger:any={level:'silent',trace(){},debug(){},info(){},warn(){},error(){},fatal(){},child(){return this;}};
  const socket=b.default({auth,logger,markOnlineOnConnect:false,syncFullHistory:false,shouldSyncHistoryMessage:()=>true,shouldIgnoreJid:jid=>jid!==this.config.groupId&&jid!=='status@broadcast',getMessage:async key=>{const row=this.store.one('SELECT payload FROM inbox WHERE id=?',key.id??'');return row?JSON.parse(row.payload).transportMessage:undefined;}});this.socket=socket;
  socket.ev.on('creds.update',()=>write('creds',creds));
  socket.ev.on('connection.update',update=>{void (async()=>{
   if(update.qr){this.qr=update.qr;this.status='pendiente_vinculacion';}
   if(update.connection==='open'){this.qr=undefined;await this.membership();this.status='recuperando_historial';this.ready=false;this.gateTimer=setTimeout(()=>{if(!this.closed&&this.canRun()){this.status='requiere_revision_historial';this.store.set('historyGate',true);}},30000);}
   if(update.connection==='close'){this.ready=false;this.status='desconectado';const code=(update.lastDisconnect?.error as any)?.output?.statusCode;
    if(code===b.DisconnectReason.loggedOut){this.status='sesion_revocada';return;}
    if(!this.closed&&this.canRun()&&this.reconnects<3){const delay=[1000,5000,30000][this.reconnects++];this.timer=setTimeout(()=>{void this.start().catch(()=>{this.status='error_reconexion';});},delay);}
   }
  })().catch(()=>{this.status='error_grupo_o_conexion';this.ready=false;});});
  const ingest=async(messages:WAMessage[])=>{for(const message of [...messages].sort((a,b)=>Number(a.messageTimestamp)-Number(b.messageTimestamp)))await this.receive(message);};
  socket.ev.on('messages.upsert',event=>{void ingest(event.messages).catch(e=>{this.store.set('transportError',{message:(e as Error).message,at:new Date().toISOString()});});});
  socket.ev.on('messaging-history.set',event=>{void ingest(event.messages).then(()=>{if(event.isLatest){clearTimeout(this.gateTimer);this.store.set('historyGate',false);this.status='conectado';this.ready=this.canRun();}}).catch(()=>{this.status='error_historial';});});
  socket.ev.on('group-participants.update',event=>{if(event.id===this.config.groupId){this.ready=false;void this.membership().then(()=>{this.ready=this.canRun()&&!this.store.get('historyGate');}).catch(()=>{});}});
  // messages.update/messages.delete se ignoran: nunca se aplican ediciones o borrados.
 }
 async releaseHistoryGate(){await this.membership();this.store.set('historyGate',false);this.status='conectado_historial_limitado';this.ready=this.canRun();}
 private async receive(message:WAMessage){
  if(!this.canRun()||message.key.fromMe||message.key.remoteJid!==this.config.groupId||!message.key.id)return;
  const author=this.person(message.key.participant,message.key.participantAlt);if(!author)return;
  const at=new Date(Number(message.messageTimestamp)*1000).toISOString();if(Date.parse(at)<Date.parse(this.config.activatedAt))return;
  await this.membership();const b=await import('@whiskeysockets/baileys'),content=b.normalizeMessageContent(message.message),body=content?.documentMessage??content?.imageMessage;
  if(content?.protocolMessage||content?.editedMessage)return;
  const ctx=content?.extendedTextMessage?.contextInfo??body?.contextInfo,text=content?.conversation??content?.extendedTextMessage?.text??body?.caption??'';
  const audio=!!content?.audioMessage||!!content?.videoMessage;
  const ref:AttachmentRef|undefined=body?{id:message.key.id,name:content?.documentMessage?.fileName??`imagen-${message.key.id}.${body.mimetype==='image/png'?'png':'jpg'}`,mime:body.mimetype??'',size:Number(body.fileLength??0),targetId:text.match(/\b[A-Z]-\d{4,}\b/i)?.[0].toUpperCase(),purpose:text.trim()||undefined}:undefined;
  if(ref){try{this.files.validate(ref);}catch(error){await this.inbound({id:message.key.id,groupId:this.config.groupId,author,at,text,quotedId:ctx?.stanzaId??undefined});this.store.enqueue(`file-rejected:${message.key.id}`,new Date().toISOString(),{text:(error as Error).message,mentions:[]});return;}const encoded=JSON.stringify(message,b.BufferJSON.replacer);this.store.run('INSERT OR IGNORE INTO pending_attachments VALUES(?,?,?,?)',ref.id,author,JSON.stringify({...ref,transport:encoded}),at);}
  await this.inbound({id:message.key.id,groupId:this.config.groupId,author,senderId:message.key.participant??undefined,at,text:audio?'':text,quotedId:ctx?.stanzaId??undefined,attachment:ref});
  if(audio)this.store.enqueue(`unsupported:${message.key.id}`,new Date().toISOString(),{text:'Enviar texto. No se procesan ni conservan audios o videos.',mentions:[]});
 }
 async media(ref:AttachmentRef){this.files.ready(ref);const row=this.store.one('SELECT payload FROM pending_attachments WHERE id=?',ref.id),data=row?JSON.parse(row.payload):null;if(!data?.transport)throw new Error('La referencia no está disponible. Reenviar archivo.');
  const b=await import('@whiskeysockets/baileys'),message=JSON.parse(data.transport,b.BufferJSON.reviver),stream=await b.downloadMediaMessage(message,'stream',{});const chunks:Buffer[]=[];let size=0;for await(const chunk of stream){size+=chunk.length;if(size>10000000||size>ref.size){stream.destroy();throw new Error('Archivo excede tamaño declarado.');}chunks.push(chunk);}return Buffer.concat(chunks);
 }
 async send(id:string,payload:Outgoing){if(!this.canRun()||!this.ready||!this.socket)throw new Error('WhatsApp no disponible.');await this.membership();const meta=await this.socket.groupMetadata(this.config.groupId);const mentions=payload.mentions.map(p=>{const member=meta.participants.find(x=>[x.id,x.phoneNumber,x.lid].some(v=>v&&this.config.people[p].includes(v)));if(!member)throw new Error('Responsable no verificado.');return member.id;});
  const text=payload.mentions.map(p=>`@${p==='kevin'?'Kevin':'Luisina'}`).join(' ')+(payload.mentions.length?' ':'')+payload.text;
  const outgoing:any=payload.documentId?(()=>{const file=this.files.read(payload.documentId!);return {document:file.bytes,mimetype:file.mime,fileName:file.name,caption:text,mentions};})():{text,mentions,linkPreview:null};
  const b=await import('@whiskeysockets/baileys'),messageId=b.generateMessageIDV2(this.socket.user?.id);this.store.set(`outgoing:${id}`,messageId);
  let timer:ReturnType<typeof setTimeout>|undefined;try{const result=await Promise.race([this.socket.sendMessage(this.config.groupId,outgoing,{messageId}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timeout; entrega desconocida.')),15000);})]);return result?.key.id??messageId;}finally{clearTimeout(timer);}
 }
 async stop(){this.closed=true;this.ready=false;clearTimeout(this.timer);clearTimeout(this.gateTimer);this.socket?.end(new Error('Cierre controlado'));this.socket=undefined;this.status='detenido';}
}
