import type { Person,Incoming,AttachmentRef } from '../../../packages/domain/src/types.js';
import { Store } from './store.js';
import { Files } from './files.js';
import type { MessagingAdapter,Outgoing } from './messaging.js';

export interface TelegramConfig {token:string;chatId:string;people:Record<Person,string>;activatedAt:string;}
export interface TelegramApiClient {
 call(method:string,params?:Record<string,unknown>,timeoutMs?:number):Promise<any>;
 upload(method:string,fields:Record<string,string>,name:string,mime:string,bytes:Uint8Array):Promise<any>;
 download(path:string,maxBytes:number):Promise<Buffer>;
}
export class TelegramApiError extends Error {
 constructor(message:string,public status:number,public retryAfter?:number){super(message);}
}
export class TelegramBotApi implements TelegramApiClient {
 constructor(private token:string,private fetcher:typeof fetch=fetch){}
 private url(method:string){return `https://api.telegram.org/bot${this.token}/${method}`;}
 private async result(response:Response){
  let body:any;try{body=await response.json();}catch{throw new TelegramApiError('Respuesta inválida de Telegram.',response.status);}
  if(!response.ok||!body?.ok)throw new TelegramApiError(`Telegram API rechazó la operación (HTTP ${response.status}, código ${Number(body?.error_code)||0}).`,Number(body?.error_code)||response.status,Number(body?.parameters?.retry_after)||undefined);
  return body.result;
 }
 async call(method:string,params:Record<string,unknown>={},timeoutMs=15000){
  try{return await this.result(await this.fetcher(this.url(method),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(timeoutMs)}));}
  catch(error){if(error instanceof TelegramApiError)throw error;throw new TelegramApiError(`No se pudo completar ${method} con Telegram.`,0);}
 }
 async upload(method:string,fields:Record<string,string>,name:string,mime:string,bytes:Uint8Array){
  const form=new FormData();for(const [key,value] of Object.entries(fields))form.append(key,value);const fileBytes=new ArrayBuffer(bytes.byteLength);new Uint8Array(fileBytes).set(bytes);form.append('document',new Blob([fileBytes],{type:mime}),name);
  try{return await this.result(await this.fetcher(this.url(method),{method:'POST',body:form,signal:AbortSignal.timeout(30000)}));}
  catch(error){if(error instanceof TelegramApiError)throw error;throw new TelegramApiError(`No se pudo completar ${method} con Telegram.`,0);}
 }
 async download(path:string,maxBytes:number){
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  let response:Response;try{response=await this.fetcher(`https://api.telegram.org/file/bot${this.token}/${encoded}`,{signal:AbortSignal.timeout(30000)});}catch{throw new TelegramApiError('No se pudo descargar el archivo desde Telegram.',0);}
  if(!response.ok)throw new TelegramApiError(`Telegram rechazó la descarga (HTTP ${response.status}).`,response.status);
  const declared=Number(response.headers.get('content-length')??0);if(declared>maxBytes)throw new TelegramApiError('El archivo excede el límite local.',413);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>maxBytes)throw new TelegramApiError('El archivo excede el límite local.',413);return bytes;
 }
}

const activeStatuses=new Set(['creator','administrator','member']);
const isActive=(member:any)=>activeStatuses.has(member?.status)||(member?.status==='restricted'&&member?.is_member===true);
const html=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const allowedUpdateTypes=['message','callback_query','chat_member','my_chat_member'];
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export class TelegramMessaging implements MessagingAdapter {
 status='pendiente_configuracion';ready=false;
 private stopped=true;private pollHealthy=false;private pollTask?:Promise<void>;private botId?:string;private lastSendAt=0;private nameCache:Record<Person,string>={kevin:'Kevin',luisina:'Luisina'};
 constructor(public store:Store,public files:Files,public config:TelegramConfig,private inbound:(m:Incoming)=>Promise<void>,private canRun:()=>boolean,private api:TelegramApiClient=new TelegramBotApi(config.token),private now:()=>string=()=>new Date().toISOString()){}
 private validateConfig(){
  const numeric=(value:string)=>/^-?\d+$/.test(value)&&Number.isSafeInteger(Number(value));
  if(!this.config.token||this.config.token.length<20||!numeric(this.config.chatId)||!this.config.chatId.startsWith('-'))throw new Error('Configurar token y chat ID numérico de un grupo privado.');
  if(!numeric(this.config.people.kevin)||Number(this.config.people.kevin)<=0||!numeric(this.config.people.luisina)||Number(this.config.people.luisina)<=0||this.config.people.kevin===this.config.people.luisina)throw new Error('Configurar dos IDs numéricos distintos para Kevin y Luisina.');
  if(!Number.isFinite(Date.parse(this.config.activatedAt)))throw new Error('Configurar TELEGRAM_ACTIVATED_AT con fecha ISO y zona horaria.');
  if(!this.canRun())throw new Error('Arranque Telegram bloqueado por propietario/recuperación.');
 }
 private async currentMembership(){
  const chat=await this.api.call('getChat',{chat_id:Number(this.config.chatId)});
  if(!['group','supergroup'].includes(chat?.type)||String(chat?.id)!==this.config.chatId)throw new Error('El destino configurado no coincide con un grupo Telegram permitido.');
  const count=Number(await this.api.call('getChatMemberCount',{chat_id:Number(this.config.chatId)}));
  const [kevin,luisina,bot]=await Promise.all([
   this.api.call('getChatMember',{chat_id:Number(this.config.chatId),user_id:Number(this.config.people.kevin)}),
   this.api.call('getChatMember',{chat_id:Number(this.config.chatId),user_id:Number(this.config.people.luisina)}),
   this.api.call('getChatMember',{chat_id:Number(this.config.chatId),user_id:Number(this.botId)})
  ]);
  if(bot?.status!=='administrator')throw new Error('El bot debe ser administrador para recibir cambios chat_member y pausar ante ingresos al grupo. No se solicitan permisos de moderación.');
  if(!isActive(kevin)||!isActive(luisina)||!isActive(bot))return false;
  this.nameCache={kevin:String(kevin.user?.first_name||'Kevin'),luisina:String(luisina.user?.first_name||'Luisina')};
  return count===3;
 }
 async reviewGroup(){
  if(!this.botId)throw new Error('El bot aún no verificó su identidad.');
  const safe=await this.currentMembership();this.store.set('groupPaused',!safe);this.store.set('groupPauseReason',safe?null:'El grupo no coincide con los tres miembros familiares configurados.');
  this.ready=safe&&!this.stopped&&this.canRun()&&this.pollHealthy;this.status=this.ready?'conectado':'grupo_pausado';
  if(!safe)throw new Error('El grupo no coincide exactamente con Kevin, Luisina y el bot; las operaciones siguen pausadas.');
 }
 async start(){
  this.validateConfig();this.stopped=false;this.status='verificando_telegram';
  const me=await this.api.call('getMe');if(!me?.is_bot||!Number.isSafeInteger(Number(me.id)))throw new Error('getMe no devolvió una identidad de bot válida.');this.botId=String(me.id);
  if(me.can_read_all_group_messages!==true)throw new Error('El modo de privacidad debe desactivarse con BotFather y el bot debe volver a agregarse al grupo.');
  const webhook=await this.api.call('getWebhookInfo');if(String(webhook?.url??''))throw new Error('Hay un webhook configurado. Esta instalación usa long polling y no lo desactivará ni combinará ambos mecanismos.');
  const wasPaused=!!this.store.get('groupPaused'),safe=await this.currentMembership();
  if(!safe){this.store.set('groupPaused',true);this.store.set('groupPauseReason','Miembros del grupo no coinciden con la lista numérica permitida.');}
  else if(!wasPaused){this.store.set('groupPaused',false);this.store.set('groupPauseReason',null);}
  this.ready=false;this.pollHealthy=false;this.status=safe&&!wasPaused?'conectando_updates':'grupo_pausado';
  this.pollTask=this.pollLoop();
 }
 private async pollLoop(){
  let delay=1000;
  while(!this.stopped&&this.canRun()){
   try{
    const cursor=this.store.one('SELECT next_offset FROM telegram_cursor WHERE id=1'),offset=Number(cursor?.next_offset??0);
    const updates=await this.api.call('getUpdates',{offset,limit:100,timeout:25,allowed_updates:allowedUpdateTypes},35000);
    if(!Array.isArray(updates))throw new Error('Telegram devolvió una lista de updates inválida.');
    for(const update of updates.sort((a:any,b:any)=>a.update_id-b.update_id)){
     if(this.stopped||!this.canRun())break;
     const outcome=await this.processUpdate(update);this.store.tx(()=>{
      this.store.run('INSERT OR IGNORE INTO telegram_updates(update_id,received_at,processed_at,outcome) VALUES(?,?,?,?)',update.update_id,this.now(),this.now(),outcome);
      this.store.run('INSERT INTO telegram_cursor(id,next_offset,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET next_offset=MAX(next_offset,excluded.next_offset),updated_at=excluded.updated_at',Number(update.update_id)+1,this.now());
      this.store.run('DELETE FROM telegram_updates WHERE update_id NOT IN (SELECT update_id FROM telegram_updates ORDER BY update_id DESC LIMIT 5000)');
     });delay=1000;
    }
    this.pollHealthy=true;
    if(!this.store.get('groupPaused')){this.ready=true;this.status='conectado';}
   }catch(error){
    if(this.stopped)break;this.ready=false;this.pollHealthy=false;this.status='error_polling';this.store.set('transportError',{at:this.now(),message:(error as Error).message.slice(0,220)});
    await wait(delay);delay=Math.min(delay*2,30000);
   }
  }
 }
 private async pauseGroup(reason:string){this.store.set('groupPaused',true);this.store.set('groupPauseReason',reason);this.ready=false;this.status='grupo_pausado';}
 private async deliver(message:Incoming){
  try{await this.inbound(message);}catch(error){
   this.store.set('transportError',{at:this.now(),message:`No se pudo aplicar el mensaje Telegram ${message.id}: ${(error as Error).message.slice(0,180)}`});
   this.store.enqueue(`telegram-rejected:${message.id}`,this.now(),{text:'No pude guardar este mensaje. No se confirmó ninguna operación; revisar los datos y volver a enviarlo.',mentions:[message.author]});
  }
 }
 private async processUpdate(update:any):Promise<'message'|'ignored'|'membership'|'stale'>{
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0)throw new Error('Update Telegram sin update_id válido.');
  if(this.store.one('SELECT update_id FROM telegram_updates WHERE update_id=?',update.update_id))return 'ignored';
  const event=update.chat_member??update.my_chat_member;
  if(event&&String(event.chat?.id)===this.config.chatId){await this.pauseGroup('Cambio de integrantes/estado del bot; requiere revisión de grupo.');return 'membership';}
  const message=update.message;
  if(!message)return 'ignored';
  const chatId=String(message.chat?.id??'');if(chatId!==this.config.chatId)return 'ignored';
  if(message.migrate_to_chat_id||message.migrate_from_chat_id||message.new_chat_members?.length||message.left_chat_member){await this.pauseGroup('Telegram informó un cambio de miembros o migración del grupo.');return 'membership';}
  const user=message.from;if(!user||user.is_bot)return 'ignored';
  const senderId=String(user.id),author:Person|undefined=senderId===this.config.people.kevin?'kevin':senderId===this.config.people.luisina?'luisina':undefined;
  if(!author){await this.pauseGroup('Un usuario con ID no autorizado escribió en el grupo.');return 'membership';}
  if(this.store.get('groupPaused'))return 'ignored';
  const date=new Date(Number(message.date)*1000);if(!Number.isFinite(date.getTime()))return 'ignored';const at=date.toISOString();
  if(Date.parse(at)<Date.parse(this.config.activatedAt))return 'stale';
  const text=String(message.text??message.caption??''),id=`tg:${chatId}:${Number(message.message_id)}`;
  const replyId=message.reply_to_message?.message_id?`tg:${chatId}:${Number(message.reply_to_message.message_id)}`:undefined;
  const doc=message.document;const photos=Array.isArray(message.photo)?[...message.photo].sort((a:any,b:any)=>Number(a.file_size??0)-Number(b.file_size??0)):[];const photo=photos.at(-1);
  const file=doc??photo;let ref:AttachmentRef|undefined;
  if(file){
   const mime=doc?String(doc.mime_type??''): 'image/jpeg',name=doc?String(doc.file_name??''):`imagen-${message.message_id}.jpg`;
   ref={id,name,mime,size:Number(file.file_size??0),targetId:text.match(/\b[A-Z]-\d{4,}\b/i)?.[0].toUpperCase(),purpose:text.trim()||undefined};
   try{this.files.validate(ref);this.store.run('INSERT OR IGNORE INTO pending_attachments VALUES(?,?,?,?)',ref.id,author,JSON.stringify({...ref,fileId:String(file.file_id),telegram:true}),at);}
   catch(error){ref=undefined;await this.deliver({id,groupId:chatId,author,senderId,at,text,quotedId:replyId});this.store.enqueue(`file-rejected:${id}`,this.now(),{text:(error as Error).message,mentions:[]});return 'message';}
  }
  const unsupported=!!(message.voice||message.audio||message.video||message.video_note||message.animation);
  if(!Number.isSafeInteger(Number(message.message_id)))return 'ignored';
  await this.deliver({id,groupId:chatId,author,senderId,at,text:unsupported?'':text,quotedId:replyId,attachment:ref});
  if(unsupported)this.store.enqueue(`unsupported:${id}`,this.now(),{text:'Enviar texto, PDF, TXT, JPG o PNG. No se procesa audio ni video.',mentions:[]});
  return 'message';
 }
 async media(ref:AttachmentRef){
  this.files.ready(ref);const row=this.store.one('SELECT payload FROM pending_attachments WHERE id=?',ref.id),data=row?JSON.parse(row.payload):null;
  if(!data?.telegram||!data.fileId)throw new Error('Referencia Telegram no disponible; pedir que reenvíen el archivo.');
  if(ref.size>10000000)throw new Error('El archivo supera el límite local de 10.000.000 bytes.');
  const file=await this.api.call('getFile',{file_id:data.fileId});if(!file?.file_path||Number(file.file_size??ref.size)>20000000)throw new Error('Telegram no permite descargar este archivo por tamaño o referencia.');
  const bytes=await this.api.download(String(file.file_path),10000000);if(bytes.length!==ref.size)throw new Error('El tamaño descargado no coincide con el declarado.');return bytes;
 }
 private async paced<T>(fn:()=>Promise<T>):Promise<T>{const waitFor=Math.max(0,this.lastSendAt+3100-Date.now());if(waitFor)await wait(waitFor);this.lastSendAt=Date.now();try{return await fn();}catch(error){if(error instanceof TelegramApiError&&error.status===429&&error.retryAfter&&error.retryAfter<=30){await wait(error.retryAfter*1000);this.lastSendAt=Date.now();return fn();}throw error;}}
 private textParts(text:string,limit=3800){const parts:string[]=[];let remaining=text;while(remaining.length>limit){let cut=remaining.lastIndexOf('\n',limit);if(cut<Math.floor(limit*.5))cut=limit;parts.push(remaining.slice(0,cut));remaining=remaining.slice(cut).replace(/^\n+/, '');}if(remaining)parts.push(remaining);return parts;}
 async send(_id:string,payload:Outgoing){
  if(!this.canRun()||!this.ready||this.stopped||this.store.get('groupPaused'))throw new Error('Telegram no disponible o grupo pausado.');
  const safe=await this.currentMembership();if(!safe){await this.pauseGroup('La composición actual del grupo no está autorizada.');throw new Error('Grupo no coincide con los participantes permitidos.');}
  const prefix=payload.mentions.map(person=>`<a href="tg://user?id=${Number(this.config.people[person])}">${person==='kevin'?'Kevin':'Luisina'}</a>`).join(', '),plain=payload.text;
  let last:any;
  if(payload.documentId){
   const file=this.files.read(payload.documentId),caption=[prefix,html(plain)].filter(Boolean).join('\n').slice(0,1000);
   last=await this.paced(()=>this.api.upload('sendDocument',{chat_id:this.config.chatId,caption,parse_mode:'HTML'},file.name,file.mime,file.bytes));
  }else{
   for(const part of this.textParts(plain,3600)){
    const text=[prefix,html(part)].filter(Boolean).join('\n');
    last=await this.paced(()=>this.api.call('sendMessage',{chat_id:this.config.chatId,text,parse_mode:'HTML',link_preview_options:{is_disabled:true}},15000));
   }
  }
  return String(last?.message_id??'telegram:sent');
 }
 async stop(){this.stopped=true;this.ready=false;this.status='detenido';await this.pollTask?.catch(()=>{});}
}
