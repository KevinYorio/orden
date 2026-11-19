import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './store.js';
import { RuntimeController } from './runtime.js';
import { parse,assignees } from '../../../packages/domain/src/parser.js';
import { local,iso,normalize,resolveDate,displayDate,reminderTimes,deadline,nextRepeat,allowedTime,monthOccurrence } from '../../../packages/domain/src/dates.js';
import { parseMoney,money,installments } from '../../../packages/domain/src/money.js';
import type { Incoming,Intent,Item,Kind,Person,Draft } from '../../../packages/domain/src/types.js';
import { defaultPolicy,type NotificationPolicy } from '../../../packages/domain/src/dates.js';

const amountSchema=z.number().int().positive().max(9000000000000).nullable();
const kindSchema=z.enum(['task','appointment','bill','expense','income','transfer','card_purchase','card_statement','adjustment','goal','allocation','budget','shopping','query','recurrence']);
export const createSchema=z.object({kind:kindSchema,title:z.string().trim().min(1).max(400),amount:amountSchema.default(null),currency:z.enum(['ARS','USD']).default('ARS'),assignees:z.array(z.enum(['kevin','luisina'])).max(2).default([]),due:z.string().max(40).optional(),dateOnly:z.boolean().optional(),explicitTime:z.boolean().optional(),performedBy:z.enum(['kevin','luisina','both']).optional(),category:z.string().max(80).default('sin clasificar'),accountId:z.string().max(80).optional(),destinationAccountId:z.string().max(80).optional(),location:z.string().max(300).optional(),paymentUrl:z.string().max(2000).optional(),period:z.string().max(80).optional(),reference:z.string().max(120).optional(),parentId:z.string().max(80).optional(),data:z.record(z.string(),z.unknown()).default({})});
export function safeUrl(raw:string){
 const u=new URL(raw),host=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!host.includes('.')||host==='localhost'||['.localhost','.local','.internal','.lan','.home'].some(s=>host.endsWith(s))||/^[\d.]+$|:|\[|\]/.test(host))throw new Error('Usar un enlace HTTPS público sin credenciales.');return u.toString();
}
const pendingKinds:Kind[]=['task','appointment','bill','card_statement','query'];
export class Engine {
 constructor(public store:Store,public location:'local'|'railway'='local',public now:()=>string=()=>new Date().toISOString()){}
 policy():NotificationPolicy{return {...defaultPolicy,...this.store.get('notificationPolicy')};}
 quotedOutbox(id:string){return this.store.one("SELECT o.* FROM outbox o WHERE o.evidence=? OR EXISTS (SELECT 1 FROM settings s WHERE s.key='outgoing:'||o.id AND json_extract(s.value,'$')=?) LIMIT 1",id,id);}
 quotedRecord(id:string){const o=this.quotedOutbox(id);if(o?.record_id)return o.record_id;const source=o?.id.match(/^reply:(.+):\d+$/)?.[1]??id,items=this.store.items().filter(i=>i.data.sourceMessageId===source);return items.length===1?items[0].id:undefined;}
 assertActive(){if(!new RuntimeController(this.store,this.location).barrier())throw new Error('Escrituras y envíos bloqueados: verificar propietario y recuperación.');if(this.store.get('groupPaused'))throw new Error('Operaciones pausadas: verificar participantes del grupo.');}
 receive(m:Incoming):string[]{
  this.assertActive();if(m.event&&m.event!=='new')return [];
  if(this.store.one('SELECT id FROM inbox WHERE id=?',m.id))return [];
  return this.store.tx(()=>{
   this.store.run('INSERT INTO inbox VALUES(?,?,?,?)',m.id,m.author,m.at,JSON.stringify(m));let replies:string[]=[];
   const answer=this.answer(m);if(answer)replies=answer;else for(const i of parse(m.text,m.at,m.author)){if(!i.target&&m.quotedId&&['pay','complete','snooze','edit','cancel','reopen','bill','file'].includes(i.type))i.target=this.quotedRecord(m.quotedId);replies.push(...this.apply(i,m));}
   if(m.attachment){this.store.run('INSERT OR IGNORE INTO pending_attachments VALUES(?,?,?,?)',m.attachment.id,m.author,JSON.stringify({...m.attachment,messageId:m.id,quotedId:m.quotedId}),m.at);replies.push('Adjunto recibido como referencia. Falta persistir y comprobar los bytes con concepto y registro completo.');}
   replies.forEach((text,n)=>this.store.enqueue(`reply:${m.id}:${n}`,this.now(),{text,mentions:[]}));
   this.store.audit(this.now(),m.author,'message',null,{messageId:m.id});return replies;
  });
 }
 question(i:Intent,m:Incoming,question:string){const id=this.store.draft(m.author,m.id,m.at,{intent:i},question);return [`${id}. ${question}`];}
 private answer(m:Incoming):string[]|undefined {
  const t=normalize(m.text),all=this.store.drafts(),id=m.text.match(/\bB-[\da-f]{8}\b/i)?.[0],quote=m.quotedId?this.quotedOutbox(m.quotedId):undefined,quoteText=quote?JSON.parse(quote.payload).text??'':'';let candidates=id?all.filter(d=>d.id.toLowerCase()===id.toLowerCase()):m.quotedId?all.filter(d=>d.messageId===m.quotedId||quoteText.includes(d.id)):all.filter(d=>d.author===m.author);
  if(candidates.length!==1)return undefined;const d=candidates[0],p=d.payload;
  if(!id&&!m.quotedId&&/\b(gaste|gasto|cobre|pague|compre|agrega|tenemos|tengo que)\b/.test(t))return undefined;
  const answerLike=/^(?:b-[\da-f]{8}\s*[:,]?\s*)?(?:para |kevin\b|luisina\b|ambos\b|\d|ars\b|usd\b|\$|eran |a las |el (?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)|manana\b|hoy\b|no se\b|no lo registres\b|cancelar\b|confirmar\b|deuda independiente\b|[a-z]-\d{4}|tarjeta\b)/.test(t);
  if(!answerLike)return undefined;
  if(/^(no se|no lo registres|cancelar)/.test(t)){this.store.run("UPDATE drafts SET status='closed' WHERE id=?",d.id);return ['Borrador cerrado. Los hechos ya registrados se conservan.'];}
  if(p.deleteId){if(!/confirmar/.test(t))return [`${d.id}. Para anular ${p.deleteId}, responder confirmar ${d.id}.`];const item=this.store.item(p.deleteId)!;this.resolve(item,m.author,'cancelled');this.store.run("UPDATE drafts SET status='closed' WHERE id=?",d.id);return [`${item.id} anulado. Trazabilidad conservada.`];}
  if(p.paymentId||p.purchaseIds){
   const a=parseMoney(t.replace(/b-[\da-f]{8}/g,''),/\b(?:exactos|pesos|ars)\b/.test(t));if(!a.amount||a.ambiguous)return [`${d.id}. Indicar importe y escala explícita, por ejemplo ARS 20 o 20mil.`];
   if(p.paymentId){const payment=this.store.one('SELECT * FROM payments WHERE id=?',p.paymentId);if(payment.currency!==a.currency)throw new Error('La moneda debe coincidir con el pago.');this.store.run('UPDATE payments SET amount=? WHERE id=? AND amount IS NULL',a.amount,p.paymentId);this.store.audit(this.now(),m.author,'payment_amount',payment.record_id,{paymentId:p.paymentId,amount:a.amount});}
   else {const expense=this.create({kind:'expense',title:'Compra informada',amount:a.amount,currency:a.currency,performedBy:d.author,data:{shoppingIds:p.purchaseIds}},m.author,m.at);for(const itemId of p.purchaseIds){const item=this.store.item(itemId)!;item.data.expenseId=expense.id;item.version++;this.store.save(item);}}
   this.store.run("UPDATE drafts SET status='closed' WHERE id=?",d.id);return [`Importe completado: ${money(a.amount,a.currency)}. Un solo movimiento.`];
  }
  const i:Intent=structuredClone(p.intent);if(!i)return undefined;
  if(t.includes('deuda independiente')){i.data={...i.data,allowDuplicate:true};i.missing=(i.missing??[]).filter(x=>x!=='confirmar deuda independiente');}
  const people=assignees(t);if(people.length)i.assignees=people;else if(/^ambos/.test(t))i.assignees=['kevin','luisina'];else if(/^kevin/.test(t))i.assignees=['kevin'];else if(/^luisina/.test(t))i.assignees=['luisina'];
  const target=t.match(/\b[a-z]-\d{4,}\b/)?.[0];if(target)i.target=target.toUpperCase();
  const date=resolveDate(t,m.at);if(date.due){i.due=date.due;i.dateOnly=date.dateOnly;i.explicitTime=date.explicitTime;}
  if(/\d/.test(t.replace(/b-[\da-f]{8}|[a-z]-\d{4,}|\d{1,2}\/\d{1,2}(?:\/\d{4})?|a las? \d{1,2}(?::\d{2})?/g,''))&&i.missing?.some(x=>/importe/.test(x))){const a=parseMoney(t.replace(/b-[\da-f]{8}/g,''),/\b(?:exactos|pesos|ars)\b/.test(t));i.amount=a.amount;i.currency=a.currency;if(a.ambiguous)return [`${d.id}. Indicar escala explícita.`];i.data={...i.data,ambiguous:false};}
  i.missing=(i.missing??[]).filter(x=>!(x==='responsable'&&i.assignees?.length)&&!(x==='fecha'&&i.due)&&!(x==='hora del turno'&&i.due&&!i.dateOnly)&&!(/importe/.test(x)&&i.amount));
  this.store.run("UPDATE drafts SET status='closed' WHERE id=?",d.id);return this.apply(i,{...m,at:d.at});
 }
 private find(i:Intent,kinds?:Kind[],activeOnly=true):Item[]{
  if(i.target){const v=this.store.item(i.target);return v&&(!kinds||kinds.includes(v.kind))?[v]:[];}
  const title=normalize(i.title??'').replace(/^(el |la |de |del )/,'').trim();
  return this.store.items().filter(v=>(!activeOnly||v.status==='active')&&(!kinds||kinds.includes(v.kind))&&(!title||normalize(v.title).includes(title)));
 }
 apply(i:Intent,m:Incoming):string[]{
  const s=this.store;
  if(i.type==='help')return ['ORDEN puede registrar gastos, pagos, compras, turnos, pendientes y datos familiares. Escribí en español normal, por ejemplo: “Recordame pagar Internet el martes a las 10”. La configuración se administra en el tablero privado.'];
  if(i.type==='ack')return /^(no|todavia no)$/.test(normalize(m.text))?['El pendiente sigue activo. Indicar ID y cuándo volver a avisar.']:[];
  if(i.type==='unknown')return ['No pude interpretar el texto. Indicar acción, concepto y los datos necesarios.'];
  if(i.type==='consult')return [this.query(i.title??'pendientes',i.data?.filterDate)];
  if(i.type==='bill'&&(i.data?.period||i.target)){
   const expected=s.items('bill').filter(b=>!b.data.received&&!!b.parentId&&(i.target?b.id===i.target:b.period===i.data?.period&&normalize(b.title)===normalize(i.title??'')));
   if(expected.length>1)return this.question(i,m,'Hay varias recepciones esperadas. Indicar ID.');
   if(expected.length===1){const b=expected[0];if(i.data?.ambiguous||i.missing?.some(x=>x.includes('importe')))return this.question({...i,target:b.id,missing:['importe y escala']},m,'Indicar importe y escala.');if(i.amount!==null&&i.amount!==undefined)b.amount=i.amount;b.data.received=true;if(i.due){b.due=i.due;b.dateOnly=i.dateOnly;}if(i.assignees?.length)b.assignees=i.assignees;b.version++;s.save(b);this.schedule(b);s.audit(this.now(),m.author,'bill_received',b.id,{sourceMessageId:m.id,amount:b.amount});return [`${b.id}. Factura recibida para el período ${b.period}. ${money(b.amount,b.currency)}. Aviso de falta de recepción cancelado.`];}
  }
  if(['complete','pay','snooze','edit','cancel','reopen','delete','map','file'].includes(i.type)){
   if(i.type==='map'&&!i.target&&i.title)return [`Mapa: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(i.title)}`];
   let kinds:Kind[]|undefined=i.type==='pay'?['bill','card_statement']:i.type==='complete'?['task','appointment','shopping']:undefined;
   let matches=this.find(i,kinds,!['edit','reopen','file','map'].includes(i.type));
   if(matches.length!==1)return this.question(i,m,matches.length?`Indicar ID: ${matches.map(x=>`${x.id} ${x.title}`).join('; ')}.`:'Indicar un ID de registro existente.');
   const item=matches[0];
   if(i.type==='file'){
    const docs=s.all('SELECT d.*,b.present FROM documents d JOIN document_links l ON l.document_id=d.id JOIN blobs b ON b.hash=d.hash WHERE l.record_id=?',item.id);
    if(!docs.length)return ['No hay original disponible asociado a ese registro.'];
    for(const d of docs){if(d.present)s.enqueue(`file:${m.id}:${d.id}`,this.now(),{documentId:d.id,text:`Archivo ${d.id}. ${d.purpose}`,mentions:[]});}
    return [docs.some(d=>d.present)?'Pedido de archivo encolado. La entrega queda pendiente del transporte.':'El original fue eliminado o no está disponible en esta instalación.'];
   }
   if(i.type==='map')return [item.location?`Mapa: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.location)}`:'Indicar la dirección o destino.'];
   if(i.type==='pay')return this.pay(item,i,m);
   if(i.type==='delete'){const id=s.draft(m.author,m.id,m.at,{deleteId:item.id},`Confirmar anulación de ${item.id} ${item.title}.`);return [`${id}. Se anulará ${item.id} ${item.title}. Responder confirmar ${id}.`];}
   if(i.type==='snooze'){
    if(!i.due||local(i.due)<=local(this.now()))return this.question(i,m,'Indicar una fecha/hora futura para el próximo aviso.');
    item.snoozedUntil=i.due;item.version++;s.save(item);this.schedule(item);s.audit(this.now(),m.author,'snooze',item.id,{until:i.due});return [`${item.id}. Próximo aviso: ${displayDate(i.due)}. Vencimiento conservado: ${displayDate(item.due,item.dateOnly)}.`];
   }
   if(i.type==='edit'){
    if(i.data?.ambiguous)return this.question({...i,missing:['importe y escala']},m,'Indicar importe y escala.');
    if(i.amount!==undefined){if(item.kind==='bill'||item.kind==='card_statement')throw new Error('Corregir factura pagada requiere un ajuste explícito por tablero; no se alteran pagos existentes.');item.amount=amountSchema.parse(i.amount);}
    if(i.due){item.due=i.due;item.dateOnly=i.dateOnly;item.explicitTime=i.explicitTime;}
    if(i.assignees?.length)item.assignees=i.assignees;item.version++;s.save(item);this.schedule(item);s.audit(this.now(),m.author,'edit',item.id,i);return [`${item.id} corregido. ${money(item.amount,item.currency)}. Fecha: ${displayDate(item.due,item.dateOnly)}.`];
   }
   this.resolve(item,m.author,i.type==='cancel'?'cancelled':i.type==='reopen'?'active':'resolved');return [`${item.id} ${item.status==='active'?'reabierto':item.status==='cancelled'?'cancelado':'realizado'}.`];
  }
  if(i.type==='bought'){
   const ids:string[]=[];for(const title of i.data?.products??[]){const matches=s.items('shopping').filter(x=>x.status==='active'&&normalize(x.title)===normalize(title));
    if(matches.length>1){this.question({type:'complete',title},m,`Hay varios productos ${title}. Indicar ID.`);continue;}
    if(matches.length===1&&Number(matches[0].data.quantity??1)>1){this.question({type:'complete',target:matches[0].id},m,'Indicar cantidad comprada por tablero antes de completar toda la cantidad.');continue;}
    const item=matches[0]??this.create({kind:'shopping',title,assignees:['kevin','luisina']},m.author,m.at);this.resolve(item,m.author,'resolved');ids.push(item.id);
   }
   if(!ids.length)return ['Compras pendientes de aclaración.'];
   if(i.amount&&!i.data?.ambiguous){const e=this.create({kind:'expense',title:'Compra informada',amount:i.amount,currency:i.currency,performedBy:i.performedBy,data:{shoppingIds:ids}},m.author,m.at);for(const id of ids){const item=s.item(id)!;item.data.expenseId=e.id;s.save(item);}return [`Productos comprados: ${ids.join(', ')}. Gasto ${e.id}: ${money(e.amount,e.currency)}.`];}
   const id=s.draft(m.author,m.id,m.at,{purchaseIds:ids},'¿Cuál fue el importe total? Puede responder no lo registres o no sé.');return [`Productos comprados: ${ids.join(', ')}. ${id}. ¿Cuál fue el importe total?`];
  }
  if(i.type==='transfer'){
   const findAccount=(name:string|undefined)=>{if(!name)return undefined;const aliases:Record<string,string>={'efectivo':i.currency==='USD'?'cash-usd':'cash-ars','efectivo ars':'cash-ars','efectivo usd':'cash-usd','mercado pago':'mp','banco nacion':'nacion'};return aliases[normalize(name)]??s.all('SELECT id,name FROM accounts').find(a=>normalize(a.name)===normalize(name))?.id;};
   i.data={...i.data,accountId:findAccount(i.data?.origin),destinationAccountId:findAccount(i.data?.destination)};if(!i.data.accountId||!i.data.destinationAccountId)i.missing=[...(i.missing??[]),'cuentas configuradas de origen y destino'];
  }
  if(i.type==='bill'&&i.data?.period&&!i.data.allowDuplicate){const same=s.items('bill').filter(b=>b.period===i.data?.period&&normalize(b.title)===normalize(i.title??''));if(same.length)return this.question({...i,missing:['confirmar deuda independiente']},m,`Posible duplicado de ${same.map(b=>b.id).join(', ')}. Si es otra deuda, responder deuda independiente con este ID de borrador; si es el mismo registro, cancelar el borrador y editarlo.`);}
  if(i.missing?.length)return this.question(i,m,`Falta: ${i.missing.join(', ')}.`);
  if(i.type==='shopping'){const list=s.get('shoppingList');i.assignees=list.assignees;i.due=list.due??undefined;i.dateOnly=!!list.due;}
  if(i.type==='expense'){
   const drafts=s.drafts(m.author).filter(d=>d.payload.purchaseIds&&(i.target?d.payload.purchaseIds.includes(i.target):/\b(?:esta |la )?compra\b/.test(normalize(m.text))));if(drafts.length===1)i.data={...i.data,shoppingIds:drafts[0].payload.purchaseIds};
  }
  if(i.type==='allocation'){const goals=s.items('goal').filter(g=>normalize(g.title)===normalize(i.title??''));if(goals.length===1)i.data={...i.data,parentId:goals[0].id};else if(goals.length>1)return this.question(i,m,'Indicar ID de la meta.');}
  const item=this.create({kind:i.type,title:i.title,amount:i.amount??null,currency:i.currency??'ARS',assignees:i.assignees??[],due:i.due,dateOnly:i.dateOnly,explicitTime:i.explicitTime,performedBy:i.performedBy,period:i.data?.period,parentId:i.data?.parentId,accountId:i.data?.accountId,destinationAccountId:i.data?.destinationAccountId,data:{...i.data,sourceMessageId:m.id}},m.author,m.at);
  if(i.type==='expense'&&i.data?.shoppingIds){for(const id of i.data.shoppingIds){const shopping=s.item(id);if(shopping){shopping.data.expenseId=item.id;shopping.version++;s.save(shopping);}}for(const d of s.drafts().filter(d=>d.payload.purchaseIds?.every((id:string)=>i.data!.shoppingIds.includes(id))))s.run("UPDATE drafts SET status='closed' WHERE id=?",d.id);}
  return [`${item.id} registrado. ${item.title}. ${['expense','income','allocation','card_purchase'].includes(item.kind)?money(item.amount,item.currency)+'. ':''}${item.due?`Fecha: ${displayDate(item.due,item.dateOnly)}. `:''}${item.assignees.length?`Responsables: ${item.assignees.join(', ')}. `:''}${pendingKinds.includes(item.kind)?`Próximo aviso: ${this.nextJob(item.id)}.`:''}`];
 }
 nextJob(id:string){const j=this.store.one("SELECT MIN(due) AS due FROM jobs WHERE record_id=? AND state='pending'",id);return displayDate(j?.due);}
 create(raw:unknown,actor:Person,at:string):Item{
  const p=createSchema.parse(raw),pending=pendingKinds.includes(p.kind);
  if(pending&&(!p.due||!p.assignees.length))throw new Error('El pendiente requiere fecha y responsable.');
  if(p.due&&!local(p.due).isValid)throw new Error('Fecha inválida.');
  if(p.kind==='appointment'&&p.dateOnly)throw new Error('El turno requiere hora.');
  if(['expense','income','transfer','card_purchase','allocation','budget','goal','adjustment'].includes(p.kind)&&p.amount===null)throw new Error('El movimiento requiere importe.');
  if(p.paymentUrl)p.paymentUrl=safeUrl(p.paymentUrl);
  if(p.accountId){const a=this.store.one('SELECT * FROM accounts WHERE id=?',p.accountId);if(!a||a.currency!==p.currency)throw new Error('Cuenta inexistente o moneda incompatible.');}
  if(p.kind==='transfer'){const destination=this.store.one('SELECT * FROM accounts WHERE id=?',p.destinationAccountId??'');if(!p.accountId||!destination||p.destinationAccountId===p.accountId)throw new Error('Indicar origen y destino distintos.');if(destination.currency!==p.currency&&!Number.isSafeInteger(p.data.destinationAmount))throw new Error('Conversión: indicar importe positivo de ambas patas.');if(p.data.destinationAmount!==undefined&&(!Number.isSafeInteger(p.data.destinationAmount)||Number(p.data.destinationAmount)<=0))throw new Error('Importe de destino inválido.');}
  if(p.kind==='card_purchase'){const c=this.store.one('SELECT * FROM accounts WHERE id=? AND card=1',p.accountId??'');if(!c||!p.data.firstDue||!local(String(p.data.firstDue)).isValid)throw new Error('Indicar tarjeta y primer vencimiento.');p.data.installments=installments(p.amount!,Number(p.data.count));p.data.schedule=(p.data.installments as number[]).map((amount,n)=>({amount,due:monthOccurrence(local(String(p.data.firstDue)).year,local(String(p.data.firstDue)).month,local(String(p.data.firstDue)).day).plus({months:n}).toISODate()}));}
  if(p.kind==='card_statement'&&(!p.accountId||!p.period))throw new Error('Indicar tarjeta y período del resumen real.');
  if(p.kind==='bill'&&p.period&&!p.data.allowDuplicate&&this.store.items('bill').some(b=>b.id!==(raw as any)?.id&&b.period===p.period&&normalize(b.title)===normalize(p.title)&&(!p.reference||!b.reference||b.reference===p.reference)))throw new Error('Posible factura duplicada. Editar el registro existente o confirmar que es otra deuda independiente.');
  if(p.kind==='budget'&&(!p.period||!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.period)))throw new Error('Presupuesto mensual requiere período AAAA-MM y base de gastos conocidos.');
  if(p.kind==='allocation'&&p.parentId&&!this.store.item(p.parentId))throw new Error('Meta inexistente.');
  if(p.kind==='recurrence'){if(!p.assignees.length||!Number.isInteger(p.data.day)||Number(p.data.day)<1||Number(p.data.day)>31)throw new Error('Regla mensual requiere día y responsables.');if(p.data.expectedDay!==undefined&&(!Number.isInteger(p.data.expectedDay)||Number(p.data.expectedDay)<1||Number(p.data.expectedDay)>31))throw new Error('Día esperado inválido.');}
  const fact=['expense','income','transfer','card_purchase','adjustment','allocation'].includes(p.kind);
  const item:Item={...p,id:this.store.id(p.kind),status:fact?'resolved':'active',resolvedAt:fact?at:undefined,version:1,createdAt:this.now(),occurredAt:at,reportedBy:actor,performedBy:p.performedBy??(['expense','income','transfer','card_purchase','allocation'].includes(p.kind)?actor:undefined)};
  this.store.save(item);this.schedule(item);this.store.audit(this.now(),actor,'create',item.id,item);return item;
 }
 resolve(item:Item,actor:Person,status:Item['status'],at=this.now()){item.status=status;item.resolvedAt=status==='active'?undefined:at;item.snoozedUntil=undefined;item.version++;this.store.save(item);this.schedule(item);this.store.audit(this.now(),actor,'status',item.id,{status,resolvedAt:item.resolvedAt});}
 outstanding(item:Item):number|null{const paid=Number(this.store.one('SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE record_id=?',item.id).n);return item.amount===null?null:item.amount-paid;}
 pay(item:Item,i:Intent,m:Incoming):string[]{
  if(item.status!=='active')return [`${item.id} ya está resuelto. No se creó otro pago.`];
  if(i.data?.ambiguous)return this.question({...i,target:item.id,missing:['importe y escala']},m,'Indicar importe y escala.');
  const outstanding=this.outstanding(item);let amount=i.amount??outstanding;
  if(i.currency&&i.amount&&i.currency!==item.currency)throw new Error('Moneda del pago distinta de la obligación.');
  if(amount!==null)amountSchema.parse(amount);
  if(i.data?.partial&&amount===null)return this.question({...i,target:item.id,missing:['importe y escala']},m,'Indicar importe del pago parcial.');
  const settlement=i.data?.settlement;
  if(outstanding!==null&&amount!==null&&amount!==outstanding&&(!i.data?.partial||amount>outstanding)&&!['adjust_total','credit'].includes(settlement))return this.question({...i,target:item.id},m,`Saldo: ${money(outstanding,item.currency)}. Indicar pago parcial o total con ajuste/saldo a favor por tablero; la diferencia no se infiere.`);
  if(settlement==='credit'&&(outstanding===null||amount===null||amount<=outstanding))throw new Error('Saldo a favor requiere pago mayor que la deuda conocida.');
  if(settlement==='adjust_total'){if(!String(i.data?.reason??'').trim()||amount===null||outstanding===null)throw new Error('Ajuste total requiere motivo e importes conocidos.');const previous=item.amount!;item.amount=previous+amount-outstanding;item.data.adjustments=[...(item.data.adjustments??[]),{at:m.at,previous,newAmount:item.amount,reason:i.data?.reason}];this.store.audit(this.now(),m.author,'bill_total_adjustment',item.id,item.data.adjustments.at(-1));}
  const parts=i.data?.parts??[];if(!Array.isArray(parts)||parts.length>10)throw new Error('Partes de pago inválidas.');
  if(parts.length){if(parts.some((p:any)=>!Number.isSafeInteger(p.amount)||p.amount<=0)||parts.reduce((n:number,p:any)=>n+p.amount,0)!==amount)throw new Error('Las partes deben sumar el pago una sola vez.');for(const p of parts)if(p.accountId){const a=this.store.one('SELECT * FROM accounts WHERE id=?',p.accountId);if(!a||a.currency!==item.currency)throw new Error('Cuenta de parte inválida.');}}
  if(i.data?.accountId){const a=this.store.one('SELECT * FROM accounts WHERE id=?',i.data.accountId);if(!a||a.currency!==item.currency)throw new Error('Cuenta del pago inválida.');}
  const id=`PAY-${randomUUID()}`;
  this.store.run('INSERT INTO payments(id,record_id,amount,currency,at,author,performed_by,account_id,parts,financial_kind) VALUES(?,?,?,?,?,?,?,?,?,?)',id,item.id,amount,item.currency,m.at,m.author,i.performedBy??m.author,i.data?.accountId??null,JSON.stringify(parts),item.kind==='card_statement'?'card_payment':'expense');
  if(settlement==='credit')this.create({kind:'allocation',title:`Saldo a favor: ${item.title}`,amount:amount!-outstanding!,currency:item.currency,parentId:item.id,data:{type:'supplier_credit',paymentId:id,reason:i.data?.reason}},m.author,m.at);
  if(!i.data?.partial||outstanding!==null&&amount===outstanding)this.resolve(item,m.author,'resolved',m.at);else {item.version++;this.store.save(item);this.schedule(item);}
  this.store.audit(this.now(),m.author,'pay',item.id,{id,amount,parts});
  const replies=[`${item.id}. Pago registrado: ${money(amount,item.currency)}. ${this.store.item(item.id)?.status==='resolved'?'Obligación resuelta.':`Saldo pendiente: ${money(this.outstanding(item),item.currency)}.`}`];
  if(amount===null){const draft=this.store.draft(m.author,m.id,m.at,{paymentId:id},'¿Cuánto fue el pago?');replies.push(`${draft}. ¿Cuánto fue el pago? Se completará el mismo movimiento.`);}return replies;
 }
 schedule(item:Item){
  this.store.run("UPDATE jobs SET state='cancelled' WHERE record_id=? AND state='pending'",item.id);this.store.run("UPDATE outbox SET state='cancelled' WHERE record_id=? AND state='pending'",item.id);
  if(pendingKinds.includes(item.kind)||item.kind==='shopping'&&item.due)for(const due of reminderTimes(item,this.now(),this.policy()))this.store.run('INSERT OR IGNORE INTO jobs(id,record_id,version,due) VALUES(?,?,?,?)',`${item.id}:${item.version}:${due}`,item.id,item.version,due);
 }
 query(kind:string,filterDate?:string):string{
  if(kind==='saldos')return this.balances().map(a=>`${a.name}: ${!a.baseComplete?'base incompleta; según registros':'saldo según registros'} ${money(a.balance,a.currency)}.`).join('\n');
  if(kind==='dinero'){const t=this.totals();return `Gastos conocidos: ${money(t.ARS,'ARS')}; ${money(t.USD,'USD')}. Importes desconocidos: ${t.unknown}. Compras y pagos de tarjeta separados.`;}
  const records=this.store.items().filter(i=>i.status==='active'&&pendingKinds.includes(i.kind)&&i.kind!=='query'&&(!filterDate||i.due&&local(i.due).toISODate()===filterDate)&& (kind!=='vencimientos'||['bill','card_statement'].includes(i.kind)));
  return records.length?records.map(i=>`${i.id}. ${i.title}. ${displayDate(i.due,i.dateOnly)}. ${money(this.outstanding(i),i.currency)}.`).join('\n'):'Sin pendientes para ese filtro.';
 }
 totals(filters:{from?:string;to?:string;currency?:string;person?:string;category?:string;account?:string}={}){
  const result={ARS:0,USD:0,unknown:0};const inside=(at:string,currency:string,person:string,category:string,account:string|undefined)=>{const day=local(at).toISODate()!;return (!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(!filters.currency||currency===filters.currency)&&(!filters.person||person===filters.person||person==='both')&&(!filters.category||category===filters.category)&&(!filters.account||account===filters.account);};
  for(const i of this.store.items())if(i.status!=='cancelled'&&['expense','card_purchase','adjustment'].includes(i.kind)&&inside(i.occurredAt,i.currency,i.performedBy??i.reportedBy,i.category,i.accountId)){if(i.amount===null)result.unknown++;else result[i.currency]+=i.kind==='adjustment'&&i.data.direction==='refund'?-i.amount:i.amount;}
  for(const p of this.store.all("SELECT * FROM payments WHERE financial_kind='expense'")){const item=this.store.item(p.record_id)!;if(inside(p.at,p.currency,p.performed_by,item.category,p.account_id)){const credit=this.store.items('allocation').filter(i=>i.status!=='cancelled'&&i.data.type==='supplier_credit'&&i.data.paymentId===p.id).reduce((n,i)=>n+(i.amount??0),0);if(p.amount===null)result.unknown++;else result[p.currency as 'ARS'|'USD']+=p.amount-credit;}}return result;
 }
 balances(){return this.store.all('SELECT * FROM accounts').map(a=>{let balance=Number(a.opening_amount??0);const after=(at:string)=>!a.opening_at||at>=a.opening_at;
  for(const i of this.store.items()){if(i.status==='cancelled'||!after(i.occurredAt))continue;if(i.accountId===a.id&&i.amount!==null){if(i.kind==='income'||i.kind==='adjustment'&&i.data.direction==='refund')balance+=i.amount;else if(['expense','transfer','adjustment'].includes(i.kind))balance-=i.amount;}if(i.kind==='transfer'&&i.destinationAccountId===a.id)balance+=Number(i.data.destinationAmount??i.amount);}
  for(const p of this.store.all('SELECT * FROM payments WHERE amount IS NOT NULL'))if(after(p.at)){const parts=JSON.parse(p.parts);if(parts.length){for(const part of parts)if(part.accountId===a.id)balance-=part.amount;}else if(p.account_id===a.id)balance-=p.amount;}
  return {...a,balance,baseComplete:a.opening_amount!==null&&!!a.opening_at&&Number.isFinite(Date.parse(a.opening_at))};});}
 planning(){const items=this.store.items().filter(i=>i.status!=='cancelled');return {
  goals:items.filter(i=>i.kind==='goal').map(g=>{const reserved=items.filter(i=>i.kind==='allocation'&&i.parentId===g.id&&i.currency===g.currency&&i.data.type!=='supplier_credit').reduce((n,i)=>n+(i.amount??0),0);return {id:g.id,title:g.title,currency:g.currency,target:g.amount,reserved,remaining:g.amount===null?null:g.amount-reserved};}),
  budgets:items.filter(i=>i.kind==='budget').map(b=>{const month=local(b.period!+'-01'),totals=this.totals({from:month.toISODate()!,to:month.endOf('month').toISODate()!,currency:b.currency,category:['general','sin clasificar'].includes(b.category)?undefined:b.category});return {id:b.id,title:b.title,period:b.period,currency:b.currency,limit:b.amount,knownSpent:totals[b.currency],unknown:totals.unknown,basis:'Gastos conocidos por fecha de operación; compra con tarjeta una vez, pago de resumen excluido.'};}),
  statements:items.filter(i=>i.kind==='card_statement').map(st=>{const estimated=items.filter(i=>i.kind==='card_purchase'&&i.accountId===st.accountId&&i.currency===st.currency).flatMap(i=>i.data.schedule??[]).filter(i=>i.due?.slice(0,7)===st.period).reduce((n,i)=>n+Number(i.amount),0);return {id:st.id,title:st.title,currency:st.currency,period:st.period,estimated,actual:st.amount,difference:st.amount===null?null:st.amount-estimated,charges:st.data.charges??null};})
 };}
 materializeRecurrences(){
  const now=local(this.now());for(const rule of this.store.items('recurrence').filter(x=>x.status==='active'))for(let offset=0;offset<2;offset++){
   const month=now.plus({months:offset}),period=month.toFormat('yyyy-MM');if(this.store.items('bill').some(x=>x.parentId===rule.id&&x.period===period))continue;
   const due=monthOccurrence(month.year,month.month,Number(rule.data.day)).toISODate()!,expected=rule.data.expectedDay?monthOccurrence(month.year,month.month,Number(rule.data.expectedDay),9).toISODate():null;
   this.create({kind:'bill',title:rule.title,amount:rule.data.fixedAmount?rule.amount:null,currency:rule.currency,assignees:rule.assignees,due,dateOnly:true,parentId:rule.id,period,data:{expectedAt:expected,received:!expected}},rule.reportedBy,this.now());
  }
 }
 tick(){
  this.assertActive();const now=this.now(),policy=this.policy();this.store.tx(()=>{
   this.materializeRecurrences();
   for(const d of this.store.drafts().filter(d=>d.followups===0)){
    if(local(now).hour>=policy.quietStart||local(now).hour<policy.quietEnd)continue;
    const due=allowedTime(local(d.at).plus({hours:24}),false,false,false,policy);if(due>local(now))continue;
    this.store.enqueue(`draft:${d.id}`,now,{text:`${d.id}. ${d.question}`,mentions:[d.author]});this.store.run('UPDATE drafts SET followups=1 WHERE id=?',d.id);
   }
   for(const item of this.store.items('bill').filter(x=>x.status==='active'&&x.data.expectedAt&&!x.data.received)){
    if(local(item.data.expectedAt).set({hour:policy.serviceHour})<=local(now)&&local(now).weekday<=5&&local(now).hour===policy.serviceHour){
     const key=`missing:${item.id}:${local(now).toISODate()}`;
     this.store.enqueue(key,now,{text:`${item.id}. Falta cargar ${item.title}, período ${item.period}.`,mentions:item.assignees},item);
    }
   }
   const due=this.store.all("SELECT * FROM jobs WHERE state='pending' AND due<=? ORDER BY due DESC",now),seen=new Set<string>();
   for(const job of due){this.store.run("UPDATE jobs SET state='done' WHERE id=?",job.id);if(seen.has(job.record_id))continue;seen.add(job.record_id);
    const item=this.store.item(job.record_id);if(!item||item.status!=='active'||item.version!==job.version||item.snoozedUntil&&item.snoozedUntil>now)continue;
    const service=['bill','card_statement'].includes(item.kind),n=local(now),j=local(job.due),express=!!item.explicitTime&&j.toISODate()===n.toISODate()&&j.hour===n.hour;
    if(service&&(n.weekday>5||n.hour!==policy.serviceHour)||!service&&!express&&(n.hour>=policy.quietStart||n.hour<policy.quietEnd)){
     let next=allowedTime(n,service,false,false,policy);if(next<=n)next=allowedTime(n.plus({days:1}),service,false,false,policy);const due=iso(next);this.store.run('INSERT OR IGNORE INTO jobs(id,record_id,version,due) VALUES(?,?,?,?)',`${item.id}:${item.version}:${due}`,item.id,item.version,due);continue;
    }
    if(item.kind==='query'){this.store.enqueue(`query:${item.id}`,now,{text:this.query(item.title,item.data.filterDate),mentions:item.assignees});this.resolve(item,item.reportedBy,'resolved');continue;}
    const overdue=deadline(item)!<=local(now),text=`${item.id}. ${overdue?'¿Se realizó o pagó?':'Pendiente:'} ${item.title}. ${item.dateOnly?'Vence':'Fecha'} ${displayDate(item.due,item.dateOnly)}.${item.paymentUrl?` Pago: ${item.paymentUrl} (aportado por usuario).`:''}${item.location?` Mapa: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.location)}`:''} Responder realizado/pagado ${item.id} o posponer ${item.id} indicando cuándo.`;
    this.store.enqueue(`reminder:${job.id}`,now,{text,mentions:item.assignees},item);
    if(!this.store.one("SELECT id FROM jobs WHERE record_id=? AND state='pending'",item.id)){const next=nextRepeat(item,now,policy);this.store.run('INSERT OR IGNORE INTO jobs(id,record_id,version,due) VALUES(?,?,?,?)',`${item.id}:${item.version}:${next}`,item.id,item.version,next);}
   }
  });
 }
}
