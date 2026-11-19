import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { RuntimeController } from '../apps/service/src/runtime.js';
import { KevinOSOrchestrator } from '../apps/service/src/kevin-os.js';

mkdirSync('.test-data',{recursive:true});
test('KEVIN OS: memoria de cumpleaños, relaciones, procedencia, deduplicación y autorización numérica',()=>{
 const dir=mkdtempSync(join('.test-data','memory-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();
 const engine=new Engine(store,'local',()=> '2026-11-18T12:00:00.000Z'),os=new KevinOSOrchestrator(store,engine,{chatId:'-100123',people:{kevin:'101',luisina:'202'}});
 const incoming=(id:string,author:'kevin'|'luisina',senderId:string,text:string)=>({id,author,senderId,groupId:'-100123',at:'2026-11-18T12:00:00.000Z',text});
 try{
  const birthday=incoming('tg:-100123:1','luisina','202','Guardá que Carlos cumple años el 18 de marzo.');
  assert.match(os.receive(birthday)[0],/18 de marzo/);assert.deepEqual(os.receive(birthday),[]);
  const result=os.receive(incoming('tg:-100123:2','kevin','101','¿Cuándo cumple Carlos?'));assert.match(result[0],/Carlos cumple el 18 de marzo/);
  const relation=os.receive(incoming('tg:-100123:3','kevin','101','Guardá que Carlos es hermano de Luisina.'));assert.match(relation[0],/son hermanos/);
  assert.equal(store.one("SELECT source_message_id FROM memory_relations WHERE relation_type='sibling'").source_message_id,'tg:-100123:3');
  assert.match(os.receive(incoming('tg:-100123:4','luisina','202','¿Qué familiares de Luisina tenemos registrados?'))[0],/Carlos: hermano\/a/);
  os.receive(incoming('tg:-100123:5','kevin','101','El teléfono del electricista es 11-5555-0101.'));
  os.receive(incoming('tg:-100123:6','kevin','101','Actualizá el teléfono del electricista a 11-5555-0202.'));
  const electrician=os.memory.search('electricista');assert.ok(electrician);assert.equal(electrician.facts.filter((f:any)=>f.status==='active').length,1);assert.equal(electrician.facts[0].value,'11-5555-0202');
  assert.equal(store.all("SELECT * FROM memory_facts WHERE predicate='phone' AND status='superseded'").length,1);
  assert.equal(store.one('SELECT COUNT(*) AS n FROM memory_entities').n,3);
  assert.equal(store.one("SELECT COUNT(*) AS n FROM migrations").n,5);
  assert.throws(()=>os.receive(incoming('tg:-100123:7','kevin','999','¿Quién es Carlos?')),/no autorizada/);
  assert.equal(store.one('SELECT COUNT(*) AS n FROM inbox WHERE id=?','tg:-100123:7').n,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('KEVIN OS conserva finanzas existentes y deja trazabilidad de fuente',()=>{
 const dir=mkdtempSync(join('.test-data','kevin-os-')),store=new Store(dir);new RuntimeController(store,'local').initLocal();const engine=new Engine(store),os=new KevinOSOrchestrator(store,engine,{chatId:'-100123',people:{kevin:'101',luisina:'202'}});
 try{
  os.receive({id:'tg:-100123:expense',groupId:'-100123',senderId:'101',author:'kevin',at:'2026-11-18T12:00:00.000Z',text:'gaste 10mil en kiosco'});
  assert.equal(store.items('expense').length,1);assert.equal(store.items('expense')[0].amount,1000000);
  const fact=os.receive({id:'tg:-100123:fact',groupId:'-100123',senderId:'101',author:'kevin',at:'2026-11-18T12:00:00.000Z',text:'Guardá que Carlos cumple años el 18 de marzo.'});
  assert.ok(fact.length);assert.equal(store.one('SELECT source_message_id FROM memory_facts').source_message_id,'tg:-100123:fact');
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
