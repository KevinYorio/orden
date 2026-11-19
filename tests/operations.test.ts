import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../apps/service/src/store.js';
import { Engine } from '../apps/service/src/engine.js';
import { Files } from '../apps/service/src/files.js';
import { RuntimeController } from '../apps/service/src/runtime.js';
import { SimulatedPlatform,RailwayPlatform } from '../apps/service/src/platform.js';
import { RailwayCostReader } from '../apps/service/src/cost-reader.js';
const BASE='2026-10-16T12:00:00.000Z';mkdirSync('.test-data',{recursive:true});
function fixture(){const dir=mkdtempSync(join('.test-data','operations-')),s=new Store(dir);new RuntimeController(s,'local').initLocal();const e=new Engine(s,'local',()=>BASE);let seq=0;return {s,e,dir,send:(text:string)=>e.receive({id:`op:${++seq}`,groupId:'synthetic',author:'kevin',at:BASE,text}),close:()=>{s.close();rmSync(dir,{recursive:true,force:true});}};}
test('Recepción esperada y compra vinculada: completar el mismo registro sin duplicar',()=>{
 const f=fixture();try{
  f.s.tx(()=>f.e.create({kind:'recurrence',title:'gas',assignees:['kevin'],data:{day:25,expectedDay:10}},'kevin',BASE));f.e.tick();const before=f.s.items('bill').length;
  const replies=f.send('factura gas periodo 2026-10 importe 40mil vence 25/10 para Kevin');assert.match(replies.join(' '),/recibida/);assert.equal(f.s.items('bill').length,before);assert.equal(f.s.items('bill').find(b=>b.period==='2026-10')!.amount,4000000);
  f.send('compre harina');f.send('gaste 20mil en la compra');assert.equal(f.s.items('expense').length,1);assert.equal(f.s.drafts().filter(d=>d.payload.purchaseIds).length,0);assert.ok(f.s.items('shopping')[0].data.expenseId);
  f.send('transferi 10mil de efectivo a mercado pago');assert.equal(f.s.items('transfer').length,1);assert.equal(f.e.balances().find(a=>a.id==='mp')!.balance,1000000);assert.equal(f.e.totals().ARS,2000000);
 }finally{f.close();}
});
test('Diferencias de pago explícitas: total ajustado o crédito, sin duplicar gastos',()=>{
 const f=fixture();try{
  const a=f.s.tx(()=>f.e.create({kind:'bill',title:'Gas',amount:5000000,due:'2026-10-25',dateOnly:true,assignees:['kevin']},'kevin',BASE));const m={id:'structured',groupId:'pc',author:'kevin' as const,at:BASE,text:'Pago declarado'};
  f.s.tx(()=>f.e.pay(a,{type:'pay',amount:4000000,data:{settlement:'adjust_total',reason:'Descuento informado'}},m));assert.equal(f.s.item(a.id)!.amount,4000000);assert.equal(f.e.totals().ARS,4000000);
  const b=f.s.tx(()=>f.e.create({kind:'bill',title:'Internet',amount:1000000,due:'2026-10-25',dateOnly:true,assignees:['kevin']},'kevin',BASE));f.s.tx(()=>f.e.pay(b,{type:'pay',amount:1200000,data:{settlement:'credit',reason:'Saldo a favor informado',accountId:'mp'}},m));assert.equal(f.s.item(b.id)!.status,'resolved');assert.equal(f.e.totals().ARS,5000000);assert.equal(f.e.balances().find(a=>a.id==='mp')!.balance,-1200000);assert.equal(f.s.items('allocation')[0].amount,200000);
 }finally{f.close();}
});
test('Cuotas de archivos y persistencia incompleta: nunca se amplía ni se guarda un sexto archivo',()=>{
 const f=fixture();try{const files=new Files(f.s,'local_only','local',()=>BASE),b=f.s.tx(()=>f.e.create({kind:'bill',title:'Gas',due:'2026-10-25',dateOnly:true,assignees:['kevin']},'kevin',BASE)),bytes=Buffer.from('fixture opaco');
  for(let n=0;n<5;n++)files.save({id:`p${n}`,name:`p${n}.txt`,mime:'text/plain',size:bytes.length,targetId:b.id,purpose:'Fixture'},bytes);assert.throws(()=>files.save({id:'sixth',name:'sexto.txt',mime:'text/plain',size:bytes.length,targetId:b.id,purpose:'Fixture'},bytes));assert.equal(files.list().length,5);assert.equal(f.s.all('SELECT * FROM blobs').length,1);
 }finally{f.close();}
});
test('Parada fallida simulada: exportación final conservada, escrituras y segundo emisor bloqueados',async()=>{
 const f=fixture();try{f.s.set('runtime',{mode:'railway_active',owner:'railway',generation:2,localRequested:false});const r=new RuntimeController(f.s,'railway',()=>BASE),p=new SimulatedPlatform();r.persistFence();p.failStop=true;await assert.rejects(r.prepareHandoff('local',p));assert.equal(r.barrier(),false);assert.equal(f.s.runtime().mode,'recovery_required');assert.ok(f.s.get('finalSnapshot'));assert.equal(f.s.get('platformError').attempt,3);assert.throws(()=>new Engine(f.s,'railway').receive({id:'blocked',groupId:'synthetic',author:'kevin',at:BASE,text:'gaste 10mil'}));
 }finally{f.close();}
});
test('Railway: el adaptador rechaza otro servicio antes de cualquier mutación',async()=>{
 const p=new RailwayPlatform({projectId:'bot-project',environmentId:'env',serviceId:'erp',deploymentId:'dep'},'synthetic-token');const calls:string[]=[];p.query=async(query)=>{calls.push(query);return query.includes('projectToken')?{projectToken:{projectId:'bot-project',environmentId:'env'}}:{service:{id:'erp',name:'ERP',projectId:'bot-project'}};};await assert.rejects(p.stop());assert.ok(calls.every(q=>!q.includes('mutation')));
});
test('Lector de costos: consultas reales con unidades calibradas ficticias, sin mezclar Railway Agent',async()=>{
 const calibration={workspaceId:'synthetic',botProjectId:'bot',cycleStart:'2026-10-01T00:00:00Z',cycleEnd:'2026-11-01T00:00:00Z',verifiedCalibration:true as const,evidence:'CALIBRACIÓN SINTÉTICA PARA TEST, NO TARIFAS REALES',residualMicrousd:10000,measurements:['CPU','MEMORY','VOLUME','EGRESS'].map(measurement=>({measurement,microusdNumerator:'1000000',unitDenominator:'1'}))};
 const calls:string[]=[];const reader=new RailwayCostReader(calibration,async(q,v)=>{calls.push(q);if(q.includes('__type'))return {__type:{enumValues:calibration.measurements.map(m=>({name:m.measurement}))}};const field=q.includes('estimatedUsage')?'estimatedUsage':'usage';return {[field]:calibration.measurements.map(m=>({measurement:m.measurement,estimatedValue:v.workspaceId?'0.5':'0.1',value:'0.01'}))};},()=>BASE);
 const sample=await reader.read();assert.equal(sample.botProjectedMicrousd,400000);assert.equal(sample.existingProjectedMicrousd,1600000);assert.equal(sample.botCurrentMicrousd,40000);assert.ok(calls.every(q=>!q.includes('agentUsage')&&!q.includes('mutation')));
});
