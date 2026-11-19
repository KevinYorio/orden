import { randomBytes } from 'node:crypto';

const token=process.env.TELEGRAM_BOT_TOKEN?.trim();
if(!token||/[\s\0]/.test(token))throw new Error('Definir TELEGRAM_BOT_TOKEN en .env antes de identificar el grupo.');
const api=async(method,params={})=>{
 let response,data;
 try{
  response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(20000)});
  data=await response.json();
 }catch{throw new Error('No se pudo consultar Telegram; el token no se mostrará.');}
 if(!response.ok||data?.ok!==true)throw new Error(`Telegram rechazó ${method}; comprobar token, conexión y que no haya otro proceso consultando updates.`);
 return data.result;
};

async function main(){
 const bot=await api('getMe');if(bot?.is_bot!==true)throw new Error('La credencial no corresponde a un bot.');if(bot.can_read_all_group_messages!==true)throw new Error('Desactivar privacidad en BotFather y volver a agregar el bot antes de identificar el grupo.');
 const webhook=await api('getWebhookInfo');if(webhook?.url)throw new Error('Este bot tiene un webhook. No se modificó; retirar el webhook deliberadamente antes de usar polling.');
 const codes={kevin:`ORDEN-KEVIN-${randomBytes(4).toString('hex').toUpperCase()}`,luisina:`ORDEN-LUISINA-${randomBytes(4).toString('hex').toUpperCase()}`};
 console.log(`Bot verificado (@${bot.username}). En el grupo privado, Kevin envía exactamente: ${codes.kevin}`);
 console.log(`En el mismo grupo, Luisina envía exactamente: ${codes.luisina}`);
 console.log('Esperando hasta dos minutos. El servicio de Asistente Hogar debe estar detenido. No se mostrará el texto de ningún mensaje.');
 const found={},deadline=Date.now()+120000;
 while(Date.now()<deadline&&(!found.kevin||!found.luisina)){
  const updates=await api('getUpdates',{timeout:15,limit:100,allowed_updates:['message']});
  for(const update of updates){
   const message=update?.message,chat=message?.chat,user=message?.from,text=typeof message?.text==='string'?message.text.trim():'';
   const person=text===codes.kevin?'kevin':text===codes.luisina?'luisina':undefined;
   if(!person||user?.is_bot===true||!Number.isSafeInteger(Number(chat?.id))||!Number.isSafeInteger(Number(user?.id))||!['group','supergroup'].includes(chat?.type)||!String(chat.id).startsWith('-'))continue;
   const candidate={chatId:String(chat.id),userId:String(user.id)};
   if(found.kevin&&found.kevin.chatId!==candidate.chatId||found.luisina&&found.luisina.chatId!==candidate.chatId)throw new Error('Los dos códigos deben llegar del mismo grupo privado. No se avanzó el cursor.');
   found[person]=candidate;
  }
  if(updates.length>=100&&(!found.kevin||!found.luisina))throw new Error('Hay 100 updates pendientes. No se avanzó el cursor; usar un bot nuevo o resolver primero esa cola.');
 }
 if(!found.kevin||!found.luisina)throw new Error('No llegaron ambos códigos en dos minutos. No se avanzó el cursor; volver a ejecutar para generar códigos nuevos.');
 if(found.kevin.userId===found.luisina.userId)throw new Error('Los códigos llegaron del mismo usuario; cada persona debe enviar el suyo.');
 if(found.kevin.chatId!==found.luisina.chatId)throw new Error('Los códigos deben enviarse desde el mismo grupo privado.');
 const chat=await api('getChat',{chat_id:Number(found.kevin.chatId)}),memberCount=Number(await api('getChatMemberCount',{chat_id:Number(found.kevin.chatId)})),botMember=await api('getChatMember',{chat_id:Number(found.kevin.chatId),user_id:Number(bot.id)});
 if(chat?.id!==Number(found.kevin.chatId)||!['group','supergroup'].includes(chat?.type)||chat?.username||memberCount!==3||botMember?.status!=='administrator')throw new Error('El destino debe ser privado, tener solo a Kevin, Luisina y el bot, y el bot debe ser administrador sin permisos de moderación.');
 console.log('\nIdentificadores detectados. Copiarlos manualmente a .env:');
 console.log(`TELEGRAM_ALLOWED_CHAT_ID=${found.kevin.chatId}`);
 console.log(`TELEGRAM_KEVIN_USER_ID=${found.kevin.userId}`);
 console.log(`TELEGRAM_LUISINA_USER_ID=${found.luisina.userId}`);
 console.log('\nNo se mostró ni guardó texto. No se avanzó getUpdates: los mensajes de identificación quedan pendientes y la app los ignorará si TELEGRAM_ACTIVATED_AT se fija después.');
}

main().catch(error=>{console.error((error instanceof Error?error.message:'Falló la identificación de Telegram').replaceAll(token,''));process.exitCode=1;});
