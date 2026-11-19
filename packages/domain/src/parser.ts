import { normalize,resolveDate,local,iso } from './dates.js';
import { parseMoney } from './money.js';
import type { Intent,Person } from './types.js';
export function assignees(t:string):Person[]{t=normalize(t);if(/\b(ambos|los dos|tenemos|gastamos)\b/.test(t))return ['kevin','luisina'];return [...(/\b(?:para|responsable:?|a cargo de)\s+kevin\b/.test(t)?['kevin' as Person]:[]),...(/\b(?:para|responsable:?|a cargo de)\s+luisina\b/.test(t)?['luisina' as Person]:[])];}
function performed(t:string,author:Person):Person|'both'{if(/\bgastamos\b/.test(t))return 'both';if(/luisina (?:gasto|compro|pago)/.test(t))return 'luisina';if(/kevin (?:gasto|compro|pago)/.test(t))return 'kevin';return author;}
export function parse(text:string,at:string,author:Person):Intent[]{
 return text.split(/\s*;\s*|\s+y\s+(?=(?:tengo que|recordame|recorda|agrega|llamar|mañana tenemos))/i).filter(Boolean).map(raw=>parseOne(raw,at,author));
}
function parseOne(raw:string,at:string,author:Person):Intent{
 const t=normalize(raw),target=t.match(/\b[a-z]-\d{4,}\b/i)?.[0].toUpperCase(),people=assignees(t),data:Record<string,any>={raw};
 if(/^\/(?:start|help|settings)(?:@[a-z0-9_]+)?$/.test(t))return {type:'help',data};
 if(/^(ok|gracias|visto|dale|si|no|todavia no)[.!\s]*$/.test(t))return {type:'ack',data};
 if(/^(pasame|enviame|dame|manda|mandame).*(factura|archivo|comprobante|documento)|^archivo\s/.test(t))return {type:'file',target,title:t.replace(/^(pasame|enviame|dame|manda|mandame)\s+(la |el )?(factura|archivo|comprobante|documento)( del? | de la )?/,'').trim(),data};
 if(/\b(mapa|como llego)\b/.test(t))return {type:'map',target,title:raw.match(/(?:mapa de |mapa a |como llego a )(.+)/i)?.[1],data};
 if(/^(borrar|borra|eliminar|elimina)\b/.test(t))return {type:'delete',target,data};
 if(/^(pospone|posponer|posponelo|posponerlo)\b/.test(t)){
  let due:string|undefined;const hours=t.match(/(una?|\d+)\s+horas?/),mins=t.match(/(\d+)\s+minutos?/);
  if(hours)due=iso(local(at).plus({hours:hours[1].startsWith('un')?1:+hours[1]}));else if(mins)due=iso(local(at).plus({minutes:+mins[1]}));else {const d=resolveDate(t,at);due=d.due?iso(d.dateOnly?local(d.due).set({hour:9}):local(d.due)):undefined;}
  return {type:'snooze',target,due,missing:due?[]:['próximo aviso'],data};
 }
 if(/\b(reprograma|reprogramar|corregi|corrigi|eran|cambia|cambiar|anula|reabri)\b/.test(t)){
  const d=resolveDate(t,at),m=/\b(eran|importe|monto)\b/.test(t)?parseMoney(t.replace(/\b[a-z]-\d+\b/gi,'')):null;
  return {type:/\banula/.test(t)?'cancel':/\breabri/.test(t)?'reopen':'edit',target,title:raw.match(/(?:gasto del?|factura del?)\s+(.+)/i)?.[1],amount:m?.amount,currency:m?.currency,due:d.due,dateOnly:d.dateOnly,assignees:people,data:{...data,ambiguous:m?.ambiguous}};
 }
 if(/\b(ya pague|pague|pagado|pago parcial)\b/.test(t)&&!/^recorda|^recordame|^tengo que/.test(t)){
  const clean=t.replace(/\b[a-z]-\d+\b/gi,'');const m=parseMoney(clean);return {type:'pay',target,title:t.replace(/^(ya )?(pague|pagado|pago parcial)\s*/,'').replace(/\b\d[\d.,]*\s*(mil|k)?\b/g,'').replace(/^(el |la |del? )/,''),amount:m.amount,currency:m.currency,performedBy:performed(t,author),data:{...data,partial:/parcial/.test(t),ambiguous:m.ambiguous}};
 }
 if(/^(ya )?(hice|hecho|realizado|listo|complete|completado|ya llame|llame)\b/.test(t))return {type:'complete',target,title:t.replace(/^(ya )?(hice|hecho|realizado|listo|complete|completado|llame)\s*/,'').replace(/^(a |el |la )/,''),data};
 if(/^(transferi|transferimos)\b/.test(t)){
  const m=parseMoney(t),parts=t.match(/\bde\s+(.+?)\s+a\s+(.+)$/);return {type:'transfer',title:'Transferencia entre cuentas',amount:m.amount,currency:m.currency,performedBy:author,missing:[...(!m.amount||m.ambiguous?['importe y escala']:[]),...(!parts?['cuenta de origen y destino']:[])],data:{...data,origin:parts?.[1],destination:parts?.[2]}};
 }
 if(/\b(que pagos|que tengo que pagar|vencimientos|pendientes|saldo|resumen|cuanto gaste|gastos de)\b/.test(t)){
  const future=/^(manana|pasado manana|hoy|el \w+|\d{1,2}\/\d{1,2}).*\b(recordame|avisame)\b/.test(t)||/^avisame (manana|pasado manana|el |hoy)/.test(t);
  const d=resolveDate(t,at);return {type:future?'query':'consult',title:/saldo/.test(t)?'saldos':/gaste|gastos|resumen/.test(t)?'dinero':/pendientes/.test(t)?'pendientes':'vencimientos',due:future?(d.dateOnly?iso(local(d.due!).set({hour:9})):d.due):undefined,dateOnly:false,assignees:people,missing:future?[...(!d.due?['fecha']:[]),...(!people.length?['responsable']:[])]:[],data:{...data,filterDate:future?undefined:d.due?local(d.due).toISODate():undefined}};
 }
 if(/\b(gaste|gasto |gastamos|cobre|ingreso |recibi)\b/.test(t)){
  const m=parseMoney(t),type=/cobre|ingreso|recibi/.test(t)?'income':'expense';const title=raw.match(/\b(?:en|de)\s+(.+)/i)?.[1]??(type==='expense'?'Gasto':'Ingreso');return {type,title,amount:m.amount,currency:m.currency,performedBy:performed(t,author),missing:!m.amount||m.ambiguous?['importe y escala']:[],data:{...data,ambiguous:m.ambiguous}};
 }
 if(/^compre\b/.test(t)){
  const cuotas=t.match(/\ben\s+(\d+)\s+cuotas/);const amountText=t.match(/\b(?:por|total|gaste)\s+(.+)/)?.[1];const m=amountText?parseMoney(amountText):{amount:null,currency:'ARS' as const,ambiguous:false};
  if(cuotas)return {type:'card_purchase',title:raw.replace(/^compre\s+/i,'').replace(/\s+por\s+.+/i,''),amount:m.amount,currency:m.currency,performedBy:author,missing:[...(!m.amount||m.ambiguous?['importe y escala']:[]),'tarjeta','primer vencimiento'],data:{...data,count:+cuotas[1]}};
  const products=raw.replace(/^compre\s+/i,'').replace(/\s+(por|total|gaste)\s+.+/i,'').split(/,|\s+y\s+/).map(x=>x.trim()).filter(Boolean);
  return {type:'bought',amount:m.amount,currency:m.currency,performedBy:author,data:{...data,products,ambiguous:m.ambiguous}};
 }
 if(/^(agrega|agregar|anota)\b/.test(t))return {type:'shopping',title:raw.replace(/^(agrega|agregá|agregar|anota|anotá)\s+/i,''),assignees:['kevin','luisina'],data};
 if(/\b(reserve|guarde)\b/.test(t)){const m=parseMoney(t);return {type:'allocation',title:raw.match(/para\s+(.+?)(?:\s+en\s+|$)/i)?.[1],amount:m.amount,currency:m.currency,performedBy:author,missing:!m.amount||m.ambiguous?['importe y escala']:[],data:{...data,place:raw.match(/\ben\s+(.+)$/i)?.[1]}};}
 if(/\b(turno|llamar|tengo que|recordame|recorda|pagar|vence|vencimiento|factura|comprar)\b/.test(t)){
  const type=/turno/.test(t)?'appointment':/factura|vence|vencimiento|recorda(?:me)? pagar|tengo que pagar/.test(t)?'bill':'task';const d=resolveDate(t,at);const amt=t.match(/(?:importe|monto|por|de)\s+((?:ars |usd |\$)?\d[\d.,]*(?:\s*(?:mil|k))?)/);const m=amt?parseMoney(amt[1]):null;
  const missing=[...(!d.due?[d.error??'fecha']:[]),...(!people.length?['responsable']:[]),...(type==='appointment'&&d.dateOnly?['hora del turno']:[]),...(m?.ambiguous?['importe y escala']:[])];
  if(type==='bill'&&d.explicitTime&&local(d.due!).hour!==15)missing.push('confirmar ventana de servicios: lunes a viernes a las 15');
  const title=raw.replace(/^(recordame|recordá|recorda|tengo que)\s+/i,'').replace(/\b(?:para|responsable:?|a cargo de)\s+(kevin|luisina|ambos)\b/gi,'').replace(/\b(?:hoy|mañana|manana|pasado mañana|pasado manana)\b/gi,'').replace(/\ba las?\s+\d{1,2}(?::\d{2})?(?:\s+de la\s+(mañana|tarde|noche))?/gi,'').trim();
  const period=t.match(/\bperiodo\s+(\d{4}-\d{2})\b/)?.[1],concept=t.match(/\b(?:factura(?: del?| de la)?|pagar)\s+(.+?)(?=\s+(?:periodo|vence|vencimiento|importe|monto|para|el \d)|$)/)?.[1];
  return {type,title:concept??title,target,amount:m?.amount??null,currency:m?.currency??'ARS',due:d.due,dateOnly:d.dateOnly,explicitTime:d.explicitTime,assignees:people,missing,data:{...data,period,concept}};
 }
 return {type:'unknown',data};
}
