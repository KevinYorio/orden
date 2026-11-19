import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { RuntimeController } from '../apps/service/src/runtime.js';
import { MemoryService } from '../apps/service/src/memory.js';
import { BraveSearchProvider,ResearchService,type ResearchProvider } from '../apps/service/src/research.js';

mkdirSync('.test-data',{recursive:true});

test('public research requires consent, rejects household data, caps usage, and does not persist query text',async()=>{
 const dir=mkdtempSync(join('.test-data','research-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();let calls=0;
 const provider:ResearchProvider={id:'synthetic_public_search',search:async(query)=>{calls++;assert.equal(query,'public coffee price in Argentina');return {provider:'synthetic_public_search',fetchedAt:'2026-11-18T12:00:00.000Z',sources:[{title:'Public source',url:'https://example.org/source',snippet:'Public information',pageAge:null,pageFetched:null}]};}};
 const research=new ResearchService(store,provider,1,()=> '2026-11-18T12:00:00.000Z');
 try{
  const memory=new MemoryService(store);memory.createEntity({kind:'person',name:'Kevin Private Name',aliases:['Kev Private Alias'],actor:'kevin',at:'2026-11-18T12:00:00.000Z'});
  await assert.rejects(()=>research.search('public coffee price in Argentina',false,'kevin'),/consent|Confirmar/i);assert.equal(calls,0);assert.equal(research.status().enabled,false);
  await assert.rejects(()=>research.search('public coffee price in Argentina',true,'kevin'),/Cada usuario/);research.setAgreement('kevin',true);assert.equal(research.status().enabled,false);await assert.rejects(()=>research.search('public coffee price in Argentina',true,'kevin'),/Cada usuario/);research.setAgreement('luisina',true);assert.equal(research.status().enabled,true);
  await assert.rejects(()=>research.search('Kevin Private Name public coffee',true,'kevin'),/memoria familiar/i);await assert.rejects(()=>research.search('public price at my home address',true,'kevin'),/personal o familiar/i);assert.equal(calls,0);
  const result=await research.search('public coffee price in Argentina',true,'luisina');assert.equal(result.sources.length,1);assert.equal(result.usage.count,1);assert.equal(research.status().maximumMonthlyCostUsd,0.01);assert.equal(research.status().queryStoredByApplication,false);
  assert.equal(store.get<{count:number}>('researchUsage')?.count,1);assert.equal(store.all('SELECT * FROM agent_executions')[0].result.includes('public coffee'),false);assert.equal(store.all('SELECT * FROM audit').some((row:any)=>JSON.stringify(row).includes('public coffee')),false);
  await assert.rejects(()=>research.search('public coffee price in Argentina',true,'kevin'),/local de 1/);assert.equal(calls,1);research.setAgreement('luisina',false);assert.equal(research.status().enabled,false);await assert.rejects(()=>research.search('public coffee price in Argentina',true,'kevin'),/Cada usuario/);assert.equal(calls,1);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('Brave adapter sends only the confirmed public query and returns safe HTTPS sources',async()=>{
 let capturedUrl:URL|undefined,capturedInit:RequestInit|undefined;
 const request=(async(input:RequestInfo|URL,init?:RequestInit)=>{capturedUrl=new URL(String(input));capturedInit=init;return Response.json({web:{results:[{title:'HTTPS result',url:'https://example.org/info',description:'Public snippet',page_age:'2 days ago'},{title:'HTTP is removed',url:'http://example.org/info',description:'unsafe'}]}});}) as typeof fetch;
 const provider=new BraveSearchProvider('synthetic-search-key-123456',request,()=> '2026-11-18T12:00:00.000Z'),result=await provider.search('public regulation Argentina');
 assert.equal(capturedUrl?.hostname,'api.search.brave.com');assert.equal(capturedUrl?.pathname,'/res/v1/web/search');assert.equal(capturedUrl?.searchParams.get('country'),'AR');assert.equal(capturedUrl?.searchParams.get('search_lang'),'es');assert.equal(capturedUrl?.searchParams.get('q'),'public regulation Argentina');assert.equal((capturedInit?.headers as Record<string,string>)['x-subscription-token'],'synthetic-search-key-123456');assert.equal(capturedInit?.redirect,'error');assert.equal(result.fetchedAt,'2026-11-18T12:00:00.000Z');assert.equal(result.sources.length,1);assert.equal(result.sources[0].url,'https://example.org/info');
});
