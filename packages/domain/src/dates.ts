import { DateTime } from 'luxon';
import type { Item } from './types.js';
export interface NotificationPolicy {billLeadDays:number[];appointmentLeadHours:number[];serviceHour:number;taskHour:number;overdueHour:number;quietStart:number;quietEnd:number;}
export const defaultPolicy:NotificationPolicy={billLeadDays:[3,1,0],appointmentLeadHours:[24,2],serviceHour:15,taskHour:9,overdueHour:9,quietStart:22,quietEnd:8};
export const ZONE='America/Argentina/Buenos_Aires';
export const local=(iso:string)=>DateTime.fromISO(iso,{zone:ZONE}).setZone(ZONE);
export const iso=(date:DateTime)=>date.toUTC().toISO()!;
export const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\brecordama\b/g,'recordame').trim();
export function resolveDate(text:string,at:string,defaultHour=9):{due?:string;dateOnly?:boolean;explicitTime?:boolean;error?:string}{
 const t=normalize(text),base=local(at);if(!base.isValid)return {error:'Fecha del mensaje inválida.'};
 let day:DateTime|undefined,forcedHour:number|undefined;
 const dm=t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
 if(dm){day=DateTime.fromObject({year:dm[3]?+dm[3]:base.year,month:+dm[2],day:+dm[1]},{zone:ZONE});if(!day.isValid)return {error:'Fecha de calendario inválida.'};}
 else if(t.includes('pasado manana'))day=base.plus({days:2}).startOf('day');
 else if(t.includes('manana'))day=base.plus({days:1}).startOf('day');
 else if(/\bhoy\b/.test(t))day=base.startOf('day');
 else {
  const names=['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];const n=names.findIndex(x=>new RegExp(`\\b${x}\\b`).test(t));
  if(n>=0){let delta=(n+1-base.weekday+7)%7;if(delta===0)delta=7;day=base.plus({days:delta}).startOf('day');if(/antes del lunes/.test(t)){day=day.minus({days:1});forcedHour=18;}}
 }
 const hm=t.match(/(?:a las?\s+|\bhora\s+)(\d{1,2})(?::(\d{2}))?(?:\s*(?:de la|por la)\s*(manana|tarde|noche))?/);
 let hour=hm?+hm[1]:forcedHour,minute=hm?.[2]?+hm[2]:0;
 if(hm){if(hour!>23||minute>59)return {error:'Hora inválida.'};if(hm[3]==='tarde'||hm[3]==='noche'){if(hour!<12)hour!+=12;}else if(hm[3]==='manana'&&hour===12)hour=0;else if(!hm[3]&&hour!>0&&hour!<8)return {error:'Indicar mañana/tarde u hora de 24 horas.'};}
 if(!day&&hour!==undefined){day=base.startOf('day');if(day.set({hour,minute})<=base)return {error:'Esa hora ya pasó hoy. Indicar fecha.'};}
 if(!day)return {};
 if(hour===undefined)return {due:day.toISODate()!,dateOnly:true,explicitTime:false};
 return {due:iso(day.set({hour:hour??defaultHour,minute})),dateOnly:false,explicitTime:true};
}
export function displayDate(due?:string,dateOnly=false){if(!due)return 'sin fecha';return local(due).toFormat(dateOnly?'dd/MM/yyyy':'dd/MM/yyyy HH:mm');}
export function deadline(item:Item){return item.due?(item.dateOnly?local(item.due).plus({days:1}).startOf('day'):local(item.due)):undefined;}
export function retention(resolvedAt:string){return iso(local(resolvedAt).plus({months:1}).startOf('month').plus({days:7}));}
export function monthOccurrence(year:number,month:number,day:number,hour=9){const first=DateTime.fromObject({year,month,day:1,hour},{zone:ZONE});return first.set({day:Math.min(day,first.daysInMonth!)});}
export function allowedTime(d:DateTime,service=false,explicit=false,advanceWeekend=false,p:NotificationPolicy=defaultPolicy):DateTime{
 let r=d.setZone(ZONE);
 if(service){r=r.set({hour:p.serviceHour,minute:0,second:0,millisecond:0});while(r.weekday>5)r=r.plus({days:advanceWeekend?-1:1});}
 else if(!explicit){if(r.hour>=p.quietStart)r=r.plus({days:1}).startOf('day').set({hour:p.quietEnd});else if(r.hour<p.quietEnd)r=r.startOf('day').set({hour:p.quietEnd});}
 return r;
}
export function reminderTimes(item:Item,now:string,p:NotificationPolicy=defaultPolicy):string[]{
 if(!item.due||item.status!=='active')return [];
 const n=local(now),d=local(item.due),service=item.kind==='bill'||item.kind==='card_statement';let times:DateTime[]=[];
 if(item.kind==='appointment')times=p.appointmentLeadHours.map(hours=>d.minus({hours})).map(x=>allowedTime(x,false,item.explicitTime,false,p));
 else if(service)times=p.billLeadDays.map(days=>allowedTime(d.minus({days}),true,item.explicitTime,true,p));
 else times=[allowedTime(item.dateOnly?d.set({hour:p.taskHour}):d,false,item.explicitTime,false,p)];
 times=times.filter(t=>t>=n);
 if(!times.length){let next=allowedTime(n.set({hour:service?p.serviceHour:p.overdueHour,minute:0,second:0,millisecond:0}),service,false,false,p);if(next<n)next=allowedTime(next.plus({days:1}),service,false,false,p);times=[next];}
 if(item.snoozedUntil){const snooze=local(item.snoozedUntil);times=times.filter(t=>t>=snooze);times.push(snooze);}
 return [...new Set(times.map(iso))].sort();
}
export function nextRepeat(item:Item,now:string,p:NotificationPolicy=defaultPolicy){const service=item.kind==='bill'||item.kind==='card_statement';return iso(allowedTime(local(now).plus({days:1}).startOf('day').set({hour:service?p.serviceHour:p.overdueHour}),service,false,false,p));}
