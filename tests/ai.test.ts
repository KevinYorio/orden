import test from 'node:test';
import assert from 'node:assert/strict';
import { OllamaLocalProvider } from '../apps/service/src/ai.js';
import { z } from 'zod';

test('Ollama provider is loopback-only and validates structured outputs',async()=>{
 assert.throws(()=>new OllamaLocalProvider('gemma3:latest','embeddinggemma:latest','https://example.com'),/loopback local/);
 const calls:{url:string;body:any}[]=[];
 const fake=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input),body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({url,body});
  if(url.endsWith('/api/version'))return Response.json({version:'test'});
  if(url.endsWith('/api/tags'))return Response.json({models:[{name:'gemma3:latest'},{name:'embeddinggemma:latest'}]});
  if(url.endsWith('/api/chat'))return Response.json({message:{content:'{"intent":"save_memory"}'}});
  if(url.endsWith('/api/embed'))return Response.json({embeddings:[Array.from({length:128},(_,i)=>i/128)]});
  throw new Error('Unexpected endpoint');
 }) as typeof fetch;
 const ai=new OllamaLocalProvider('gemma3:latest','embeddinggemma:latest','http://127.0.0.1:11434',fake);
 assert.deepEqual(await ai.status(),{enabled:true,available:true,provider:'ollama_local',model:'gemma3:latest',embeddingModel:'embeddinggemma:latest',version:'test',modelInstalled:true,embeddingModelInstalled:true,localOnly:true});
 const schema=z.object({intent:z.enum(['save_memory','unknown'])}).strict();
 assert.deepEqual(await ai.structured(schema,'Only JSON','Guardá un dato.'),{intent:'save_memory'});
 assert.equal(calls.find(c=>c.url.endsWith('/api/chat'))?.body.stream,false);
 assert.equal(calls.find(c=>c.url.endsWith('/api/chat'))?.body.options.temperature,0);
 assert.deepEqual((await ai.embed('consulta local')).slice(0,2),[0,1/128]);
 await assert.rejects(()=>ai.structured(schema,'s','x',{image:Buffer.alloc(10000001)}),/10 MB/);
});

test('Ollama provider rejects responses that fail the domain schema',async()=>{
 const fake=(async()=>Response.json({message:{content:'{"intent":"execute_sql"}'}})) as typeof fetch;
 const ai=new OllamaLocalProvider('gemma3:latest','embeddinggemma:latest','http://localhost:11434',fake);
 await assert.rejects(()=>ai.structured(z.object({intent:z.enum(['unknown'])}),'safe','untrusted'),z.ZodError);
});
