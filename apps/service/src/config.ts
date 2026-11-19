import { join,resolve } from 'node:path';
import { homedir } from 'node:os';
import { existsSync,readFileSync } from 'node:fs';
import { z } from 'zod';
import type { Person } from '../../../packages/domain/src/types.js';
export function config(){
 const location=z.enum(['local','railway']).parse(process.env.APP_LOCATION??'local'),port=z.coerce.number().int().min(1024).max(65535).parse(process.env.PORT??process.env.APP_PORT??4317);
 const dir=resolve(process.env.APP_DATA_DIR||(location==='railway'?'/data':join(process.env.LOCALAPPDATA??homedir(),'AsistenteHogar')));
 const token=process.env.APP_API_TOKEN||(existsSync(join(dir,'api-token'))?readFileSync(join(dir,'api-token'),'utf8').trim():'');if(token.length<32)throw new Error('Configurar token de aplicación de al menos 32 caracteres o ejecutar setup.');
 const adapter=z.enum(['simulated','baileys','telegram']).parse(process.env.MESSAGING_ADAPTER??'simulated'),storage=z.enum(['local_only','bounded_remote']).parse(process.env.STORAGE_MODE??'local_only');
 const aiProvider=z.enum(['none','ollama']).parse(process.env.AI_PROVIDER??'none');if(aiProvider==='ollama'&&location!=='local')throw new Error('La IA local sólo puede habilitarse en APP_LOCATION=local; Railway conserva el servicio ligero.');
 const backupEncryptionKey=process.env.APP_BACKUP_ENCRYPTION_KEY;if(backupEncryptionKey&&!/^[a-f\d]{64}$/i.test(backupEncryptionKey))throw new Error('APP_BACKUP_ENCRYPTION_KEY debe ser una clave aleatoria de 32 bytes en hexadecimal.');
 const researchProvider=z.enum(['none','brave']).parse(process.env.RESEARCH_PROVIDER??'none'),researchMonthlyLimit=z.coerce.number().int().min(1).max(100).parse(process.env.RESEARCH_MAX_QUERIES_PER_MONTH??100);
 const list=(v:string|undefined)=>(v??'').split(',').map(s=>s.trim()).filter(Boolean);
 const telegramPeople:Record<Person,string>={kevin:process.env.TELEGRAM_KEVIN_USER_ID??'',luisina:process.env.TELEGRAM_LUISINA_USER_ID??''};
 return {location,port,dir,token,adapter,storage,backupEncryptionKey,research:{provider:researchProvider,apiKey:process.env.BRAVE_SEARCH_API_KEY,monthlyLimit:researchMonthlyLimit},ai:{provider:aiProvider,baseUrl:process.env.OLLAMA_BASE_URL??'http://127.0.0.1:11434',model:process.env.LOCAL_AI_MODEL??'gemma3:latest',embeddingModel:process.env.LOCAL_EMBEDDING_MODEL??'embeddinggemma:latest'},recovery:process.env.APP_RECOVERY_ONLY==='true',remoteUrl:process.env.REMOTE_APP_URL,remoteToken:process.env.REMOTE_APP_TOKEN,publicOrigin:process.env.APP_PUBLIC_ORIGIN,whatsapp:{groupId:process.env.WHATSAPP_GROUP_ID??'',people:{kevin:list(process.env.WHATSAPP_KEVIN_IDS),luisina:list(process.env.WHATSAPP_LUISINA_IDS)},botIds:list(process.env.WHATSAPP_BOT_IDS),activatedAt:process.env.WHATSAPP_ACTIVATED_AT??''},telegram:{token:process.env.TELEGRAM_BOT_TOKEN??'',chatId:process.env.TELEGRAM_ALLOWED_CHAT_ID??'',people:telegramPeople,activatedAt:process.env.TELEGRAM_ACTIVATED_AT??''}};
}
