import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Store } from '../dist/apps/service/src/store.js';
import { RuntimeController } from '../dist/apps/service/src/runtime.js';
const b=await import('@whiskeysockets/baileys');assert.equal(typeof b.default,'function');
const dir=mkdtempSync('/tmp/asistente-check-'),s=new Store(dir);new RuntimeController(s,'local').initLocal();assert.equal(s.items().length,0);s.close();
const token='synthetic-linux-check-000000000000000000000000',base='http://127.0.0.1:4361',child=spawn(process.execPath,['dist/apps/service/src/main.js'],{env:{...process.env,APP_LOCATION:'local',APP_DATA_DIR:dir,APP_API_TOKEN:token,APP_PORT:'4361',PORT:'4361',MESSAGING_ADAPTER:'simulated',REMOTE_APP_URL:'',APP_RECOVERY_ONLY:'false'},stdio:['ignore','pipe','pipe']});let errors='';child.stderr.on('data',b=>errors+=b);const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await delay(100);}
 const r=await fetch(base+'/api/messages',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({text:'gaste 10mil en kiosco',author:'kevin',id:'linux-synthetic'})});assert.equal(r.status,200,await r.text());
 const state=await (await fetch(base+'/api/state',{headers:{authorization:`Bearer ${token}`}})).json();assert.equal(state.records.length,1);assert.equal(state.records[0].amount,1000000);assert.equal(state.accounts.length,5);
 await fetch(base+'/api/stop',{method:'POST',headers:{authorization:`Bearer ${token}`}});await new Promise(ok=>child.once('exit',ok));assert.equal(child.exitCode,0,errors);
 console.log(`Linux ${process.version}: importación Baileys, migración SQLite, arranque, carga HTTP, estado y cierre comprobados sin red externa.`);
}finally{child.kill();rmSync(dir,{recursive:true,force:true});}
