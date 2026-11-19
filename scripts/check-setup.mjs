import { mkdirSync,mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { Store } from '../dist/apps/service/src/store.js';
import { Engine } from '../dist/apps/service/src/engine.js';
mkdirSync('.test-data',{recursive:true});const dir=mkdtempSync(resolve('.test-data/setup-')),data=join(dir,'data'),script=resolve('scripts/setup.mjs'),env={...process.env,APP_LOCATION:'local',APP_DATA_DIR:data,APP_API_TOKEN:'synthetic-setup-only-000000000000000000000000'};
try{execFileSync(process.execPath,[script],{cwd:dir,env});let s=new Store(data);assert.equal(s.items().length,0);assert.ok(s.all('SELECT * FROM accounts').every(a=>a.opening_amount===null));s.tx(()=>new Engine(s).create({kind:'expense',title:'Dato sintético para comprobar instalación idempotente',amount:100000},'kevin',new Date().toISOString()));s.close();const token=readFileSync(join(data,'api-token'),'utf8');execFileSync(process.execPath,[script],{cwd:dir,env});s=new Store(data);assert.equal(s.items().length,1);assert.equal(readFileSync(join(data,'api-token'),'utf8'),token);s.close();console.log('Setup compilado: inicialización vacía, credencial externa e instalación idempotente comprobadas en carpeta temporal.');}finally{rmSync(dir,{recursive:true,force:true});}
