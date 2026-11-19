import { normalize,local } from '../../../packages/domain/src/dates.js';
import { parse } from '../../../packages/domain/src/parser.js';
import type { Incoming,Person } from '../../../packages/domain/src/types.js';
import { Engine } from './engine.js';
import { MemoryService } from './memory.js';
import { ShoppingService } from './shopping.js';
import { Store } from './store.js';
import { randomUUID } from 'node:crypto';

export type AgentId='orden.agenda'|'orden.memory'|'orden.shopping'|'orden.documents'|'orden.finance'|'orden.research'|'orden.correlation'|'orden.security';
export interface AgentContract {id:AgentId;name:string;status:'implemented'|'partial'|'pending';responsibilities:string[];tools:string[];route(message:Incoming,intents:ReturnType<typeof parse>):boolean;}
const definitions:AgentContract[]=[
 {id:'orden.memory',name:'ORDEN Memoria',status:'partial',responsibilities:['Personas, hechos estructurados, cumpleaños y relaciones familiares'],tools:['memory.read','memory.write'],route:(m)=>/^(?:guarda|anota que|registra que|actualiza|actualizar|corrige|cuando cumple|cuando es el cumpleanos|quien es|que datos tenemos de|que familiares de)\b/i.test(normalize(m.text))},
 {id:'orden.correlation',name:'ORDEN Correlaciones',status:'partial',responsibilities:['Consultas cruzadas sobre registros próximos y documentos vinculados'],tools:['agenda.read','finance.read','documents.read','memory.read'],route:(m)=>/\b(relacionad[oa]s? con|vinculad[oa]s? a)\b/i.test(normalize(m.text))},
 {id:'orden.agenda',name:'ORDEN Agenda',status:'partial',responsibilities:['Tareas, turnos, obligaciones, fechas y avisos persistentes'],tools:['agenda.read','agenda.write'],route:(_m,i)=>i.some(x=>['task','appointment','bill','complete','snooze','query','consult'].includes(x.type))},
 {id:'orden.finance',name:'ORDEN Finanzas',status:'partial',responsibilities:['Gastos, pagos, cuentas, cuotas, presupuestos y metas'],tools:['finance.read','finance.write'],route:(_m,i)=>i.some(x=>['expense','income','pay','transfer','card_purchase','card_statement','allocation','budget','goal','adjustment'].includes(x.type))},
 {id:'orden.shopping',name:'ORDEN Compras',status:'partial',responsibilities:['Lista compartida y compras declaradas; histórico comparable pendiente'],tools:['shopping.read','shopping.write','finance.write'],route:(_m,i)=>i.some(x=>['bought','shopping'].includes(x.type))},
 {id:'orden.documents',name:'ORDEN Documentos',status:'partial',responsibilities:['Asociación, conservación y recuperación de originales; OCR pendiente'],tools:['documents.read','documents.write'],route:(m,i)=>!!m.attachment||i.some(x=>x.type==='file')},
 {id:'orden.research',name:'ORDEN Investigación',status:'pending',responsibilities:['Investigación web verificable y comparación externa de precios'],tools:['research.web.read'],route:(m)=>/\b(investiga|busca en internet|busca online|precio actual|compar[aá] precios)\b/i.test(normalize(m.text))},
 {id:'orden.security',name:'ORDEN Seguridad',status:'implemented',responsibilities:['Autorización por identidad numérica y chat permitido en el transporte'],tools:['security.authorize'],route:()=>false}
];

export class AgentRegistry {
 readonly agents:AgentContract[];
 constructor(memory:MemoryService){this.agents=definitions.map(a=>a.id==='orden.memory'?{...a,route:(m:Incoming)=>memory.recognizes(m.text)}:a);}
 get(id:AgentId){return this.agents.find(agent=>agent.id===id)!;}
 select(message:Incoming,intents:ReturnType<typeof parse>){return this.agents.find(agent=>agent.id!=='orden.security'&&agent.route(message,intents));}
}

function words(text:string){return normalize(text).split(/[^a-z0-9]+/).filter(w=>w.length>2);}
export class KevinOSOrchestrator {
 readonly memory:MemoryService;
 readonly registry:AgentRegistry;
 readonly shopping:ShoppingService;
 constructor(public store:Store,public engine:Engine,private telegram?:{chatId:string;people:Record<Person,string>}){this.memory=new MemoryService(store);this.registry=new AgentRegistry(this.memory);this.shopping=new ShoppingService(store);}
 private authorize(message:Incoming){
  if(!['kevin','luisina'].includes(message.author))throw new Error('Usuario familiar no autorizado.');
  if(!this.telegram)return;
  const allowed=message.author==='kevin'?this.telegram.people.kevin:this.telegram.people.luisina;
  if(message.groupId!==this.telegram.chatId||!message.senderId||message.senderId!==allowed)throw new Error('Identidad Telegram no autorizada.');
 }
 private reply(message:Incoming,text:string){
  this.engine.assertActive();return this.store.tx(()=>{
   if(this.store.one('SELECT id FROM inbox WHERE id=?',message.id))return [];
   this.store.run('INSERT INTO inbox VALUES(?,?,?,?)',message.id,message.author,message.at,JSON.stringify(message));
   this.store.enqueue(`reply:${message.id}:0`,this.engine.now(),{text,mentions:[]});
   this.store.audit(this.engine.now(),message.author,'agent_reply',null,{messageId:message.id});return [text];
  });
 }
 private correlate(message:Incoming){
  const raw=normalize(message.text),match=raw.match(/(?:relacionad[oa]s? con|vinculad[oa]s? a)\s+(?:el\s+|la\s+|los\s+|las\s+)?(.+?)[?!.]*$/),term=match?.[1]??'';
  if(!term)return this.reply(message,'Indicar el concepto a relacionar, por ejemplo: pagos relacionados con el auto.');
  const tokens=words(term),records=this.store.items().filter(item=>item.status==='active'&&item.due&&[item.title,item.category,item.reference,item.location,...Object.values(item.data??{}).filter(v=>typeof v==='string')].some(value=>tokens.some(token=>normalize(String(value??'')).includes(token))));
  const rows=records.map(item=>{const docs=this.store.all('SELECT d.id,d.name,d.purpose FROM documents d JOIN document_links l ON l.document_id=d.id WHERE l.record_id=?',item.id);return `${item.id}. ${item.title}. ${item.due}${docs.length?` — ${docs.map((d:any)=>`${d.id} ${d.purpose}`).join(', ')}`:''}`;});
  return this.reply(message,rows.length?rows.join('\n'):`No encontré registros próximos vinculados textualmente con ${term}.`);
 }
 runQuery(text:string,actor:Person){
  this.engine.assertActive();if(text.trim().length<2||text.length>400)throw new Error('La consulta debe tener entre 2 y 400 caracteres.');
  const normalized=normalize(text),ids:AgentId[]=[],correlation=/\b(relacionad[oa]s? con|vinculad[oa]s? a|proxim[oa]s? pagos|que pagos|que tenemos proximo)\b/.test(normalized),asksMemory=/\b(quien es|que datos tenemos|cuando cumple|cumpleanos|familiares de|telefono de|direccion de)\b/.test(normalized),asksAgenda=/\b(agenda|pendientes|pendiente|recordatorios|proxim[oa]s?|vencimientos|turnos|manana)\b/.test(normalized),asksFinance=/\b(gasto|gastamos|factura|facturas|cuotas|finanzas|pagos|pago|servicios)\b/.test(normalized),asksShopping=/\b(compra|compras|supermercado|precio|precios|barata|barato|leche|arroz|carrito|ticket)\b/.test(normalized),asksDocuments=/\b(documento|documentos|archivo|archivos|comprobante|poliza)\b/.test(normalized),asksResearch=/\b(investiga|internet|web|precio actual|promocion|promociones|vigente)\b/.test(normalized);
  if(correlation)ids.push('orden.correlation');if(asksMemory)ids.push('orden.memory');if(asksAgenda)ids.push('orden.agenda');if(asksFinance)ids.push('orden.finance');if(asksShopping)ids.push('orden.shopping');if(asksDocuments)ids.push('orden.documents');if(asksResearch)ids.push('orden.research');
  const unique=[...new Set(ids)],selected=unique.slice(0,3),kind=correlation?'cross_domain_analysis':asksResearch?'research_public_information':asksShopping?'shopping_history':asksMemory?'family_memory':asksFinance?'finance_summary':asksAgenda?'agenda_query':asksDocuments?'document_search':'unknown',now=local(this.engine.now()),month=now.startOf('month'),term=text.replace(/^[¿?¡\s]+/,'').replace(/^(?:quien es|que datos tenemos de|cuando cumple|cuando es el cumpleanos de|que familiares de|donde compramos|donde compramos mas barata|precio de)\s+/i,'').replace(/[¿?¡!.,]+$/g,'').trim();
  const results:any[]=[],audit:any[]=[];let status:'completed'|'partial'|'failed'='completed';
  for(const id of selected){let data:unknown,ok=true;try{
   if(id==='orden.memory'){const name=term.replace(/\s+(?:cumple|cumpleanos|tenemos registrados).*/i,'').trim();data=this.memory.search(name);}
   else if(id==='orden.agenda'){const items=this.store.items().filter(i=>i.status==='active'&&i.due&&Date.parse(i.due)>=Date.parse(now.toISO()!)&&Date.parse(i.due)<=Date.parse(now.plus({days:45}).toISO()!)).sort((a,b)=>a.due!.localeCompare(b.due!)).slice(0,100);data=items.map(i=>({id:i.id,kind:i.kind,title:i.title,due:i.due,dateOnly:i.dateOnly,assignees:i.assignees,amount:['bill','card_statement'].includes(i.kind)?i.amount:null,currency:i.currency}));}
   else if(id==='orden.finance'){const totals=this.engine.totals({from:month.toISODate()!,to:month.endOf('month').toISODate()!});data={scope:month.toFormat('yyyy-MM'),totals,knownOnly:true,excludes:{cardPayments:true,unknownAmountCount:totals.unknown}};}
   else if(id==='orden.shopping'){const rows=this.shopping.compare(term);data={query:term,rows,warning:'Historial observado, no cotización vigente.'};}
   else if(id==='orden.documents'){const key=normalize(term),rows=this.store.all('SELECT d.id,d.name,d.purpose,d.created_at,l.record_id FROM documents d JOIN document_links l ON l.document_id=d.id ORDER BY d.created_at DESC LIMIT 300').filter((r:any)=>!key||[r.name,r.purpose,this.store.item(r.record_id)?.title??''].some(value=>normalize(String(value)).includes(key))).slice(0,30);data=rows;}
   else if(id==='orden.correlation'){const tokens=words(term),items=this.store.items().filter(i=>i.status==='active'&&i.due&&(!tokens.length||[i.title,i.category,i.reference,i.location,...Object.values(i.data??{}).filter(v=>typeof v==='string')].some(value=>tokens.some(token=>normalize(String(value??'')).includes(token))))).slice(0,50);data=items.map(i=>({id:i.id,kind:i.kind,title:i.title,due:i.due,amount:i.amount,currency:i.currency,documents:this.store.all('SELECT d.id,d.name,d.purpose FROM documents d JOIN document_links l ON l.document_id=d.id WHERE l.record_id=?',i.id)}));}
   else {status='partial';ok=false;data={available:false,reason:'No hay proveedor de investigación web configurado; no se consultó Internet.'};}
   results.push({agent:id,ok,data});audit.push({agent:id,count:Array.isArray(data)?data.length:Array.isArray((data as any)?.rows)?(data as any).rows.length:data?1:0,ids:Array.isArray(data)?data.slice(0,30).map((item:any)=>item.id).filter(Boolean):[]});
  }catch(error){status='partial';results.push({agent:id,ok:false,error:(error as Error).message});audit.push({agent:id,count:0,ids:[]});}}
  if(!selected.length){status='partial';results.push({agent:'none',ok:false,error:'No pude asignar la consulta a una capacidad local implementada.'});}
  const id=`AX-${randomUUID()}`;this.store.run('INSERT INTO agent_executions(id,request_kind,status,agents,result,error_code,started_at,ended_at,actor) VALUES(?,?,?,?,?,?,?,?,?)',id,kind,status,JSON.stringify(selected),JSON.stringify(audit),status==='completed'?null:selected.includes('orden.research')?'research_provider_not_configured':'unsupported_query',this.engine.now(),this.engine.now(),actor);
  return {id,requestKind:kind,status,agents:selected,steps:results,maxSteps:3,externalSearch:false};
 }
 receive(message:Incoming){
  this.authorize(message);const intents=parse(message.text,message.at,message.author),agent=this.registry.select(message,intents);
  if(agent?.id==='orden.memory')return this.memory.handle(message);
  if(agent?.id==='orden.correlation')return this.correlate(message);
  if(agent?.id==='orden.research')return this.reply(message,'La investigación web externa todavía no está habilitada. No consulté precios ni envié datos a un proveedor.');
  return this.engine.receive(message);
 }
}
