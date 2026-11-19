import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { Files } from '../apps/service/src/files.js';
import { RuntimeController } from '../apps/service/src/runtime.js';
import { BaileysMessaging } from '../apps/service/src/messaging.js';
mkdirSync('.test-data',{recursive:true});
test('Transporte simulado en la interfaz real: identidades, grupo, frontera, cambios y adjunto rechazado',async()=>{
 const dir=mkdtempSync(join('.test-data','transport-')),s=new Store(dir);new RuntimeController(s,'local').initLocal();const e=new Engine(s,'local',()=> '2026-10-16T12:00:00.000Z'),files=new Files(s,'local_only','local'),group='synthetic@g.us',participants=[{id:'synthetic-kevin@lid'},{id:'synthetic-luisina@lid'},{id:'synthetic-bot@lid'}];const a=new BaileysMessaging(s,files,{groupId:group,people:{kevin:['synthetic-kevin@lid'],luisina:['synthetic-luisina@lid']},botIds:['synthetic-bot@lid'],activatedAt:'2026-10-16T00:00:00Z'},async m=>{e.receive(m);},()=>true);a.socket={groupMetadata:async()=>({participants})} as any;
 const message=(id:string,remoteJid=group,participant='synthetic-kevin@lid')=>({key:{id,remoteJid,participant,fromMe:false},messageTimestamp:1792152000,message:{conversation:'gaste 10mil en kiosco'}});
 try{
  await (a as any).receive(message('other-group','other@g.us'));await (a as any).receive(message('other-author',group,'stranger@lid'));assert.equal(s.items().length,0);
  await (a as any).receive({...message('old'),messageTimestamp:1});await (a as any).receive({...message('self'),key:{...message('self').key,fromMe:true}});await (a as any).receive({...message('edited'),message:{protocolMessage:{}}});assert.equal(s.items().length,0);
  const oversized={...message('big'),message:{documentMessage:{fileName:'grande.pdf',mimetype:'application/pdf',fileLength:10000001,caption:'gaste 10mil en kiosco'}}};await (a as any).receive(oversized);assert.equal(s.items('expense').length,1);assert.equal(s.all('SELECT * FROM documents').length,0);assert.equal(s.all('SELECT * FROM pending_attachments').length,0);assert.ok(s.one("SELECT id FROM outbox WHERE id='file-rejected:big'"));
  participants.push({id:'stranger@lid'});await assert.rejects((a as any).receive(message('new-person')));assert.equal(s.get('groupPaused'),true);assert.equal(s.items('expense').length,1);
 }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
