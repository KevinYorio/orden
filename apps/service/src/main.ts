import { existsSync,readFileSync } from 'node:fs';
import { z } from 'zod';
import { Store } from './store.js';
import { Engine } from './engine.js';
import { Files } from './files.js';
import { RuntimeController,acquireLock,importSnapshot } from './runtime.js';
import { Dispatcher,SimulatedMessaging,BaileysMessaging,type MessagingAdapter } from './messaging.js';
import { TelegramMessaging } from './telegram.js';
import { KevinOSOrchestrator } from './kevin-os.js';
import { RailwayPlatform,costDecision } from './platform.js';
import { buildApi,Serial } from './api.js';
import { config } from './config.js';
import { startProxy } from './proxy.js';
import { RailwayCostReader } from './cost-reader.js';
import { ReturnStager } from './return-stager.js';
import { OllamaLocalProvider } from './ai.js';
import { DocumentProcessingService } from './document-processing.js';

const c=config();
if(c.remoteUrl){if(c.location!=='local')throw new Error('Proxy sólo en PC.');await startProxy(c);}
else {
 const release=acquireLock(c.dir),s=new Store(c.dir),runtime=new RuntimeController(s,c.location,()=>new Date().toISOString(),c.backupEncryptionKey),serial=new Serial(),ai=c.ai.provider==='ollama'?new OllamaLocalProvider(c.ai.model,c.ai.embeddingModel,c.ai.baseUrl):undefined;
 const clock=()=>c.adapter==='simulated'&&s.get('simClock')||new Date().toISOString();
 const engine=new Engine(s,c.location,clock),files=new Files(s,c.storage,c.location,clock),orchestrator=new KevinOSOrchestrator(s,engine,c.adapter==='telegram'?{chatId:c.telegram.chatId,people:c.telegram.people}:undefined),attachmentQueue=new DocumentProcessingService(s,files,undefined,c.location,c.ai.model,clock),localDocuments=new DocumentProcessingService(s,files,ai,c.location,c.ai.model,clock);
 let platform:RailwayPlatform|undefined;
 try{if(process.env.RAILWAY_API_TOKEN)platform=new RailwayPlatform({projectId:process.env.RAILWAY_PROJECT_ID??'',environmentId:process.env.RAILWAY_ENVIRONMENT_ID??'',serviceId:process.env.RAILWAY_SERVICE_ID??'',deploymentId:process.env.RAILWAY_DEPLOYMENT_ID??''},process.env.RAILWAY_API_TOKEN);}catch(e){s.set('platformError',{message:(e as Error).message,at:engine.now()});}
 const readSample=async()=>{const calibration=process.env.RAILWAY_COST_CALIBRATION_FILE;if(calibration&&process.env.RAILWAY_COST_TOKEN)return RailwayCostReader.fromToken(JSON.parse(readFileSync(calibration,'utf8')),process.env.RAILWAY_COST_TOKEN).read();const path=process.env.RAILWAY_COST_SAMPLE_FILE;return path&&existsSync(path)?JSON.parse(readFileSync(path,'utf8')):undefined;};
 let currentSample=c.location==='railway'?await readSample().catch(()=>undefined):undefined;
 const sample=()=>currentSample;
 const saveSample=()=>{if(currentSample){s.run('INSERT INTO cost_samples(at,payload) VALUES(?,?)',engine.now(),JSON.stringify(currentSample));s.run('DELETE FROM cost_samples WHERE id NOT IN (SELECT id FROM cost_samples ORDER BY id DESC LIMIT 672)');}};saveSample();
 let adapter:MessagingAdapter=new SimulatedMessaging();
 const canRun=()=>!c.recovery&&runtime.barrier();
 const handleIncoming=async(message:import('../../../packages/domain/src/types.js').Incoming)=>serial.run(async()=>{
  const replies=orchestrator.receive(message);
  const ref=message.attachment;
  if(ref&&replies.length&&adapter.media){
   // Sólo asociación por ID explícito/cita o el único registro creado por ese mensaje.
   if(!ref.targetId&&message.quotedId)ref.targetId=engine.quotedRecord(message.quotedId);
   if(!ref.targetId){const created=s.items().filter(i=>i.data.sourceMessageId===message.id);if(created.length===1)ref.targetId=created[0].id;}
   if(ref.targetId&&!ref.purpose)ref.purpose=s.item(ref.targetId)?.title;
   try{files.ready(ref);const bytes=await adapter.media(ref),id=files.save(ref,bytes);await attachmentQueue.request(id,message.author);s.enqueue(`file-saved:${message.id}`,engine.now(),{text:`Archivo ${id} guardado y asociado a ${ref.targetId}. El original se conserva; la extracción local queda en cola para revisión. Se enviará cuando lo pidan.`,mentions:[]});}catch(error){s.enqueue(`file-pending:${message.id}`,engine.now(),{text:(error as Error).message,mentions:[]});}
  }
 });
 if(c.adapter==='baileys')adapter=new BaileysMessaging(s,files,c.whatsapp,handleIncoming,canRun);
 else if(c.adapter==='telegram')adapter=new TelegramMessaging(s,files,c.telegram,handleIncoming,canRun);
 const dispatcher=new Dispatcher(s,adapter,files,canRun);
 if(c.location==='railway'){
  const decision=costDecision(sample(),engine.now());s.set('costDecision',{...decision,at:engine.now()});
  if(!c.recovery&&(!platform||!decision.allow)){if(runtime.barrier())try{await runtime.enforceCost(platform,sample());}catch{};s.set('startupBlocked','Faltan margen actual o control verificado de Railway.');}
  if(!platform||!decision.allow){s.close();release();throw new Error('Arranque remoto rechazado: faltan control acotado y margen medido actual. No se considera probada la parada facturable.');}
 }
 const remoteAllowed=c.location==='local'||!!platform&&costDecision(sample(),engine.now()).allow;
 if(canRun()&&remoteAllowed)try{if(platform)await platform.verify();await adapter.start();}catch(error){s.set('transportError',{at:engine.now(),message:(error as Error).message});}
 else adapter.ready=false;
 const app=await buildApi(c,engine,files,runtime,adapter,serial,platform,ai);
 let closing=false;async function shutdown(){if(closing)return;closing=true;clearInterval(timer);clearInterval(costTimer);clearTimeout(recoveryTimer);await serial.run(async()=>{await adapter.stop();if(c.location==='local'&&runtime.barrier())runtime.backup();});await app.close();s.close();release();}
 app.post('/api/stop',async(_req,reply)=>{if(c.location!=='local')throw new Error('La parada facturable remota se solicita a Railway.');reply.send({stopping:true});setTimeout(()=>{void shutdown();},100);});
 if(c.recovery&&c.location==='railway'){
  const stager=new ReturnStager(c.dir);
  app.post('/api/return/manifest',async req=>serial.run(()=>stager.manifest(req.body)));
  app.put('/api/return/:id/state',async req=>serial.run(()=>stager.state(z.object({id:z.string()}).parse(req.params).id,req.body as Buffer)));
  app.put('/api/return/:id/original/:hash',async req=>serial.run(()=>{const p=z.object({id:z.string(),hash:z.string()}).parse(req.params);return stager.original(p.id,p.hash,req.body as Buffer);}));
  app.post('/api/return/:id/commit',async(req,reply)=>{
   const transfer=await serial.run(()=>stager.commit(z.object({id:z.string()}).parse(req.params).id));if(!costDecision(sample(),engine.now()).allow)throw new Error('No hay margen actual para terminar el regreso.');reply.send({accepted:true,generation:transfer.manifest.generation});
   setTimeout(()=>{void (async()=>{await shutdown();await importSnapshot(transfer.dir,c.dir,'railway',{localStopped:true,cost:sample()});if(platform)await platform.stop();})().catch(error=>{console.error(`Regreso remoto incompleto: ${(error as Error).message}`);process.exitCode=1;});},100);
  });
 }
 const maintenance=()=>serial.run(async()=>{if(canRun()&&remoteAllowed&&adapter.ready){engine.tick();await dispatcher.drain();}if(c.location==='local'&&ai&&canRun()){const pending=s.one("SELECT document_id,created_by FROM document_extractions WHERE status IN ('queued','waiting_local') AND error_code IN ('local-ai-disabled','pending-local') ORDER BY created_at LIMIT 1");if(pending)await localDocuments.request(pending.document_id,pending.created_by);}if(!c.recovery){files.cleanup();if(c.location==='local')runtime.backup();}}).catch(error=>s.set('maintenanceError',{at:engine.now(),message:(error as Error).message}));
 const timer=setInterval(()=>{void maintenance();},30000);
 const costTimer=setInterval(()=>{if(c.location==='railway'&&!c.recovery)void serial.run(async()=>{if(runtime.barrier()){currentSample=await readSample().catch(()=>undefined);saveSample();const decision=costDecision(sample(),engine.now());s.set('costDecision',{...decision,at:engine.now()});if(!decision.allow){await adapter.stop();await runtime.enforceCost(platform,sample());}}}).catch(error=>s.set('platformError',{at:engine.now(),message:(error as Error).message}));},15*60000);
 const recoveryTimer=c.recovery?setTimeout(()=>{void serial.run(async()=>{try{if(platform)await platform.stop();}catch(error){s.set('platformError',{at:engine.now(),message:`Recovery timeout: ${(error as Error).message}`});}}).finally(()=>{void shutdown();});},120000):undefined;
 process.on('SIGINT',()=>{void shutdown();});process.on('SIGTERM',()=>{void shutdown();});
 await app.listen({host:c.location==='local'?'127.0.0.1':'0.0.0.0',port:c.port});
 console.log(`Asistente Hogar: ${c.location==='local'?`http://127.0.0.1:${c.port}`:'API remota'}; ${c.recovery?'recovery_only':s.runtime().mode}; transporte ${adapter.status}.`);
 if(!c.recovery)await maintenance();
}
