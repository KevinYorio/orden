import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { Files } from '../apps/service/src/files.js';
import { RuntimeController } from '../apps/service/src/runtime.js';
import { SimulatedMessaging } from '../apps/service/src/messaging.js';
import { buildApi,Serial,type Config } from '../apps/service/src/api.js';
mkdirSync('.test-data',{recursive:true});
test('API: autenticación, orígenes, filtros, edición, migración y descarga sin conexiones externas',async()=>{
 const dir=mkdtempSync(join('.test-data','api-')),s=new Store(dir),backupKey='a'.repeat(64),runtime=new RuntimeController(s,'local',undefined,backupKey);runtime.initLocal();const engine=new Engine(s),files=new Files(s,'local_only','local'),transport=new SimulatedMessaging();
 const config:Config={location:'local',port:4317,dir,token:'a'.repeat(64),adapter:'simulated',storage:'local_only',backupEncryptionKey:backupKey,research:{provider:'none',apiKey:undefined,monthlyLimit:100},ai:{provider:'none',baseUrl:'http://127.0.0.1:11434',model:'gemma3:latest',embeddingModel:'embeddinggemma:latest'},recovery:false,remoteUrl:undefined,remoteToken:undefined,publicOrigin:undefined,whatsapp:{groupId:'',people:{kevin:[],luisina:[]},botIds:[],activatedAt:''},telegram:{token:'',chatId:'',people:{kevin:'',luisina:''},activatedAt:''}},app=await buildApi(config,engine,files,runtime,transport,new Serial());
 const headers={host:'127.0.0.1:4317',authorization:`Bearer ${config.token}`};
 try{
  assert.equal((await app.inject({url:'/api/state',headers:{host:headers.host}})).statusCode,401);assert.equal((await app.inject({url:'/api/state',headers:{...headers,origin:'https://evil.example'}})).statusCode,403);assert.equal((await app.inject({url:'/api/state',headers:{...headers,host:'evil.example'}})).statusCode,403);
   const stateResponse=await app.inject({url:'/api/state',headers});assert.equal(stateResponse.statusCode,200,stateResponse.body);const empty=stateResponse.json();assert.equal(empty.records.length,0);assert.ok(empty.accounts.every((a:any)=>a.opening_amount===null));
  const researchStatus=await app.inject({url:'/api/research/status',headers});assert.equal(researchStatus.statusCode,200);assert.equal(researchStatus.json().enabled,false);assert.equal(researchStatus.json().requiresPerQueryConsent,true);
  const agreement=await app.inject({url:'/api/research/agreement',method:'POST',headers,payload:{actor:'kevin',accepted:true}});assert.equal(agreement.statusCode,200,agreement.body);assert.equal(agreement.json().status.agreements.kevin.accepted,true);assert.equal(agreement.json().status.enabled,false);
  const noConsent=await app.inject({url:'/api/research/search',method:'POST',headers,payload:{actor:'kevin',query:'public government information'}});assert.equal(noConsent.statusCode,400);assert.equal(s.get('researchUsage'),undefined);
  const invalid=await app.inject({url:'/api/records',method:'POST',headers,payload:{item:{kind:'task',title:'Sin fecha'}}});assert.equal(invalid.statusCode,400);assert.equal(s.items().length,0);
  const expense=await app.inject({url:'/api/records',method:'POST',headers,payload:{item:{kind:'expense',title:'Gasto sintético',amount:123400,currency:'ARS',performedBy:'luisina'}}});assert.equal(expense.statusCode,200);const item=expense.json();
  assert.equal((await app.inject({url:'/api/state?person=kevin',headers})).json().records.length,0);assert.equal((await app.inject({url:'/api/state?person=luisina',headers})).json().totals.ARS,123400);
  const corrected=await app.inject({url:`/api/records/${item.id}`,method:'PATCH',headers,payload:{version:1,changes:{amount:250000}}});assert.equal(corrected.statusCode,200,corrected.body);assert.equal(s.items().length,1);assert.equal(s.item(item.id)!.amount,250000);
  assert.equal((await app.inject({url:`/api/records/${item.id}`,method:'PATCH',headers,payload:{version:1,changes:{amount:100000}}})).statusCode,400);
  const bytes=Buffer.from('No interpretar ni ejecutar este texto.');const q=new URLSearchParams({id:'synthetic-file',name:'prueba.txt',mime:'text/plain',size:String(bytes.length),targetId:item.id,purpose:'Evidencia sintética'});
  const saved=await app.inject({url:'/api/files?'+q,method:'POST',headers:{...headers,'content-type':'application/octet-stream'},payload:bytes});assert.equal(saved.statusCode,200,saved.body);const id=saved.json().id;const downloaded=await app.inject({url:`/api/documents/${id}`,headers});assert.deepEqual(downloaded.rawPayload,bytes);assert.match(downloaded.headers['content-disposition'] as string,/attachment/);assert.equal(s.items().length,1);
  const brokenUrl=await app.inject({url:`/api/records/${item.id}`,method:'PATCH',headers,payload:{version:2,changes:{paymentUrl:'javascript:alert(1)'}}});assert.equal(brokenUrl.statusCode,400);assert.equal(s.item(item.id)!.paymentUrl,undefined);
  const backup=await app.inject({url:'/api/backup',method:'POST',headers,payload:{}});assert.equal(backup.statusCode,200);
 }finally{await app.close();s.close();rmSync(dir,{recursive:true,force:true});}
});
test('recovery_only: no admite intenciones, exportaciones nuevas ni planificador por API',async()=>{
 const dir=mkdtempSync(join('.test-data','recovery-')),s=new Store(dir),engine=new Engine(s,'railway'),files=new Files(s,'bounded_remote','railway'),runtime=new RuntimeController(s,'railway'),config:Config={location:'railway',port:4317,dir,token:'b'.repeat(64),adapter:'simulated',storage:'bounded_remote',backupEncryptionKey:undefined,research:{provider:'none',apiKey:undefined,monthlyLimit:100},ai:{provider:'none',baseUrl:'http://127.0.0.1:11434',model:'gemma3:latest',embeddingModel:'embeddinggemma:latest'},recovery:true,remoteUrl:undefined,remoteToken:undefined,publicOrigin:'https://hogar.example',whatsapp:{groupId:'',people:{kevin:[],luisina:[]},botIds:[],activatedAt:''},telegram:{token:'',chatId:'',people:{kevin:'',luisina:''},activatedAt:''}},app=await buildApi(config,engine,files,runtime,new SimulatedMessaging(),new Serial());
 try{const headers={authorization:`Bearer ${config.token}`};const status=await app.inject({url:'/api/status',headers});assert.equal(status.statusCode,200,status.body);assert.equal(status.json().runtime.mode,'recovery_only');for(const path of ['/api/messages','/api/export','/api/records'])assert.equal((await app.inject({url:path,method:'POST',headers,payload:{}})).statusCode,423);assert.equal(s.items().length,0);}finally{await app.close();s.close();rmSync(dir,{recursive:true,force:true});}
});
