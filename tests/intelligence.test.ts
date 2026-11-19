import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,mkdtempSync,readFileSync,rmSync,existsSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { Files } from '../apps/service/src/files.js';
import { RuntimeController,importSnapshot,validateSnapshot } from '../apps/service/src/runtime.js';
import { SimulatedMessaging } from '../apps/service/src/messaging.js';
import { buildApi,Serial,type Config } from '../apps/service/src/api.js';
import { KevinOSOrchestrator } from '../apps/service/src/kevin-os.js';
import type { AIProvider } from '../apps/service/src/ai.js';

mkdirSync('.test-data',{recursive:true});
const key='f'.repeat(64),person={kevin:[],luisina:[]};
function configuration(dir:string):Config{return {location:'local',port:4319,dir,token:'c'.repeat(64),adapter:'simulated',storage:'local_only',backupEncryptionKey:key,research:{provider:'none',apiKey:undefined,monthlyLimit:100},ai:{provider:'none',baseUrl:'http://127.0.0.1:11434',model:'gemma3:latest',embeddingModel:'embeddinggemma:latest'},recovery:false,remoteUrl:undefined,remoteToken:undefined,publicOrigin:undefined,whatsapp:{groupId:'',people:person,botIds:[],activatedAt:''},telegram:{token:'',chatId:'',people:{kevin:'',luisina:''},activatedAt:''}};}

test('respaldo cifrado incluye estado y originales, autentica clave y restaura sin perder el documento',async()=>{
 const dir=mkdtempSync(join('.test-data','backup-')),dest=mkdtempSync(join('.test-data','restore-')),store=new Store(dir),runtime=new RuntimeController(store,'local',()=> '2026-11-18T12:00:00.000Z',key);runtime.initLocal();const engine=new Engine(store),files=new Files(store,'local_only','local'),bytes=Buffer.from('fixture privado sintético, no operativo'),item=engine.create({kind:'expense',title:'Compra sintética',amount:1200,currency:'ARS'},'kevin',engine.now()),documentId=files.save({id:'backup-fixture',name:'fixture.txt',mime:'text/plain',size:bytes.length,targetId:item.id,purpose:'Original sintético'},bytes);
 try{
  const snapshot=runtime.snapshot('backup'),artifact=join(snapshot.dir,'backup.enc');assert.ok(existsSync(artifact));assert.equal(existsSync(join(snapshot.dir,'state.sqlite')),false);assert.equal(snapshot.manifest.encryption?.algorithm,'AES-256-GCM');assert.deepEqual(snapshot.manifest.originalsIncluded,[files.read(documentId).hash]);assert.equal(validateSnapshot(snapshot.dir,key).hash,snapshot.manifest.hash);assert.throws(()=>validateSnapshot(snapshot.dir,'0'.repeat(64)),/autenticar|clave/i);
  await importSnapshot(snapshot.dir,dest,'local',{restoreBackup:true,backupKey:key});const restored=new Store(dest),restoredFiles=new Files(restored,'local_only','local');try{assert.equal(restored.runtime().mode,'recovery_required');assert.deepEqual(restoredFiles.read(documentId).bytes,bytes);assert.equal(restored.one('SELECT local_copy FROM blobs WHERE hash=?',files.read(documentId).hash).local_copy,1);}finally{restored.close();}
  const encrypted=readFileSync(artifact);encrypted[0]^=1;writeFileSync(artifact,encrypted);assert.throws(()=>validateSnapshot(snapshot.dir,key),/corrup|autenticar|lectura/i);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});rmSync(dest,{recursive:true,force:true});}
});

test('OCR local queda en revisión, requiere confirmación, deduplica la compra y compara sólo presentaciones compatibles',async()=>{
 const dir=mkdtempSync(join('.test-data','extraction-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();const engine=new Engine(store,'local',()=> '2026-11-18T12:00:00.000Z'),files=new Files(store,'local_only','local'),token='c'.repeat(64);
 const proposed={kind:'receipt',merchant:'Coto',branch:'Sucursal Centro',issuedAt:'2026-11-17',period:null,dueDate:null,currency:'ARS',subtotalCents:1100,discountsCents:100,taxCents:0,totalCents:1000,paymentMethod:'Mercado Pago',invoiceId:null,consumptionValue:null,consumptionUnit:null,lines:[{label:'Leche entera 1 litro',quantityMilli:1000,packageSizeBase:1000,unit:'ml',grossCents:1100,discountCents:100,confidence:0.94}],confidence:0.94};
 const ai:AIProvider={status:async()=>({enabled:true,available:true,provider:'ollama_local',model:'synthetic',embeddingModel:'synthetic',modelInstalled:true,embeddingModelInstalled:true,localOnly:true}),structured:async<T>(schema:z.ZodType<T>)=>schema.parse(proposed)};
 const api=await buildApi(configuration(dir),engine,files,new RuntimeController(store,'local'),new SimulatedMessaging(),new Serial(),undefined,ai),headers={host:'127.0.0.1:4319',authorization:`Bearer ${token}`};
 try{
  const record=engine.create({kind:'expense',title:'Vínculo sintético',amount:1200,currency:'ARS'},'kevin',engine.now()),original=Buffer.from('Ticket de prueba sintético.');const documentId=files.save({id:'ocr-fixture',name:'ticket.txt',mime:'text/plain',size:original.length,targetId:record.id,purpose:'Ticket de prueba'},original);
  const productResponse=await api.inject({url:'/api/shopping/products',method:'POST',headers,payload:{name:'Leche entera',brand:'Marca X',packageSizeBase:1000,unit:'ml'}});assert.equal(productResponse.statusCode,200,productResponse.body);const product=productResponse.json();assert.ok(product.id);
  const alias=await api.inject({url:`/api/shopping/products/${product.id}/aliases`,method:'POST',headers,payload:{alias:'Leche entera 1 litro'}});assert.equal(alias.statusCode,200,alias.body);
  const queued=await api.inject({url:`/api/documents/${documentId}/extract`,method:'POST',headers,payload:{actor:'luisina'}});assert.equal(queued.statusCode,200,queued.body);const extraction=queued.json();assert.equal(extraction.status,'review_required');assert.equal(store.one('SELECT COUNT(*) AS n FROM purchases').n,0);
  const unconfirmed=await api.inject({url:`/api/extractions/${extraction.id}/confirm`,method:'POST',headers,payload:{actor:'luisina',confirmed:false}});assert.equal(unconfirmed.statusCode,400);assert.equal(store.one('SELECT COUNT(*) AS n FROM purchases').n,0);
  const revised=await api.inject({url:`/api/extractions/${extraction.id}`,method:'PATCH',headers,payload:{actor:'luisina',fields:proposed}});assert.equal(revised.statusCode,200,revised.body);
  const confirmed=await api.inject({url:`/api/extractions/${extraction.id}/confirm`,method:'POST',headers,payload:{actor:'luisina',confirmed:true}});assert.equal(confirmed.statusCode,200,confirmed.body);assert.equal(confirmed.json().purchase.total_cents,1000);assert.equal(store.one('SELECT COUNT(*) AS n FROM purchases').n,1);
  const retry=await api.inject({url:`/api/extractions/${extraction.id}/confirm`,method:'POST',headers,payload:{actor:'luisina',confirmed:true}});assert.equal(retry.statusCode,200);assert.equal(retry.json().duplicate,true);assert.equal(store.one('SELECT COUNT(*) AS n FROM purchases').n,1);
  const comparison=(await api.inject({url:'/api/shopping/compare?q=Leche',headers})).json();assert.equal(comparison.rows.length,1);assert.equal(comparison.rows[0].line_total_cents,1000);assert.equal(comparison.rows[0].base_unit,'litro');assert.equal(comparison.rows[0].pricePerBaseMicroCents,1000000000);assert.deepEqual(files.read(documentId).bytes,original);
  const incompatible=await api.inject({url:'/api/shopping/purchases',method:'POST',headers,payload:{actor:'kevin',merchant:'Disco',occurredAt:'2026-11-18T15:00:00.000Z',currency:'ARS',totalCents:5000,idempotencyKey:'incompatible-size',lines:[{rawLabel:'Leche entera 1 litro',quantityMilli:1000,packageSizeBase:1000,unit:'g',lineTotalCents:5000}]}});assert.equal(incompatible.statusCode,200,incompatible.body);assert.equal(store.one('SELECT product_id FROM purchase_lines WHERE purchase_id=?',incompatible.json().purchase.id).product_id,null,'No relacionar ml con g por similitud de texto.');
 }finally{await api.close();store.close();rmSync(dir,{recursive:true,force:true});}
});

test('KEVIN OS coordina hasta tres consultas locales, registra auditoría mínima y no finge investigación web',()=>{
 const dir=mkdtempSync(join('.test-data','agents-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();const engine=new Engine(store,'local',()=> '2026-11-18T12:00:00.000Z'),files=new Files(store,'local_only','local'),os=new KevinOSOrchestrator(store,engine);
 try{
  const bill=engine.create({kind:'bill',title:'Seguro del auto',amount:100000,currency:'ARS',assignees:['kevin'],due:'2026-11-24',dateOnly:true},'kevin',engine.now());const bytes=Buffer.from('comprobante de póliza sintético');const documentId=files.save({id:'agent-fixture',name:'poliza.txt',mime:'text/plain',size:bytes.length,targetId:bill.id,purpose:'Póliza del auto'},bytes);
  const cross=os.runQuery('¿Qué pagos relacionados con el auto tenemos próximos?','kevin');assert.equal(cross.maxSteps,3);assert.deepEqual(cross.agents,['orden.correlation','orden.agenda','orden.finance']);assert.equal(cross.steps[0].data[0].id,bill.id);assert.equal(cross.steps[0].data[0].documents[0].id,documentId);assert.equal(cross.externalSearch,false);
  const log=store.one('SELECT * FROM agent_executions WHERE id=?',cross.id);assert.equal(log.status,'completed');assert.deepEqual(JSON.parse(log.agents),cross.agents);assert.equal(log.result.includes('Seguro del auto'),false,'La auditoría no copia contenido familiar.');
  const research=os.runQuery('Investiga promociones vigentes en Coto','luisina');assert.equal(research.status,'partial');assert.deepEqual(research.agents,['orden.research']);assert.equal(research.steps[0].data.available,false);assert.equal(research.externalSearch,false);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
