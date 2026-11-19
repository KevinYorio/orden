import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { Files } from '../apps/service/src/files.js';
import { RuntimeController,importSnapshot } from '../apps/service/src/runtime.js';
import { ReturnStager } from '../apps/service/src/return-stager.js';
mkdirSync('.test-data',{recursive:true});
test('Regreso remoto simulado: estado final, ticket, bytes opacos, importación y propietario único',async()=>{
 const dir=mkdtempSync(join('.test-data','return-source-')),dest=mkdtempSync(join('.test-data','return-dest-')),s=new Store(dir),r=new RuntimeController(s,'local');r.initLocal();const e=new Engine(s),bytes=Buffer.from('original sintético opaco'),files=new Files(s,'local_only','local'),record=s.tx(()=>e.create({kind:'expense',title:'Fixture',amount:100000},'kevin',new Date().toISOString())),documentId=files.save({id:'fixture',name:'fixture.txt',mime:'text/plain',size:bytes.length,targetId:record.id,purpose:'Fixture de regreso'},bytes);
 const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString(),end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString(),cost={at:now.toISOString(),cycleStart:start,cycleEnd:end,existingProjectedMicrousd:1000000,botProjectedMicrousd:1000000,botCurrentMicrousd:1000,residualMicrousd:1000,source:'SIMULADO',verified:true as const};
 let imported:Store|undefined;try{
  const snapshot=await r.prepareHandoff('railway',undefined,cost);assert.equal(r.barrier(),false);const stager=new ReturnStager(dest),m=snapshot.manifest;assert.throws(()=>stager.manifest({manifest:m,ticket:{localReleased:false,generation:m.generation,cursor:m.cursor,hash:m.hash}}));stager.manifest({manifest:m,ticket:{localReleased:true,generation:m.generation,cursor:m.cursor,hash:m.hash}});assert.throws(()=>stager.commit(m.id));
  stager.state(m.id,readFileSync(join(snapshot.dir,'state.sqlite')));stager.original(m.id,m.documents[0].hash,bytes);const ready=stager.commit(m.id);await importSnapshot(ready.dir,dest,'railway',{localStopped:true,cost});imported=new Store(dest);assert.equal(imported.items('expense').length,1);assert.equal(imported.runtime().owner,'railway');assert.equal(new RuntimeController(imported,'railway').barrier(),true);assert.equal(r.barrier(),false);assert.deepEqual(new Files(imported,'bounded_remote','railway').read(documentId).bytes,bytes);
 }finally{imported?.close();s.close();rmSync(dir,{recursive:true,force:true});rmSync(dest,{recursive:true,force:true});}
});
