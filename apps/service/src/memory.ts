import { randomUUID } from 'node:crypto';
import { normalize } from '../../../packages/domain/src/dates.js';
import type { Incoming,Person } from '../../../packages/domain/src/types.js';
import { Store } from './store.js';

type EntityKind='person'|'place'|'vehicle'|'organization'|'item'|'other';
type FactInput={subject:string;predicate:string;value:unknown;sourceMessageId?:string;sourceNote?:string;actor:Person;at:string};
const months:Record<string,number>={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
const cleanName=(value:string)=>value.trim().replace(/^[\s,.:;!?]+|[\s,.:;!?]+$/g,'').replace(/\s+/g,' ');
const displayName=(value:string)=>cleanName(value).replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase('es-AR'));
const relationLabels:Record<string,string>={sibling:'hermano/a',parent:'progenitor/a',child:'hijo/a',partner:'pareja',friend:'amistad',relative:'familiar'};

export class MemoryService {
 constructor(public store:Store){}
 entities(query=''){
  const rows=query?this.store.all('SELECT * FROM memory_entities WHERE normalized_name LIKE ? ORDER BY name LIMIT 50',`%${normalize(query)}%`):this.store.all('SELECT * FROM memory_entities ORDER BY normalized_name LIMIT 250');
  return rows.map((row:any)=>({...row,aliases:JSON.parse(row.aliases),attributes:JSON.parse(row.attributes)}));
 }
 private entityByName(name:string){
  const key=normalize(cleanName(name));if(!key)return undefined;
  const exact=this.store.one('SELECT * FROM memory_entities WHERE normalized_name=? LIMIT 1',key);
  if(exact)return exact;
  return this.store.all('SELECT * FROM memory_entities ORDER BY normalized_name').find((row:any)=>JSON.parse(row.aliases).some((a:string)=>normalize(a)===key));
 }
 private ensureEntity(name:string,kind:EntityKind,actor:Person,at:string){
  const clean=cleanName(name);if(!clean||clean.length>160)throw new Error('Nombre de memoria inválido.');
  const old=this.entityByName(clean);if(old)return old;
  const id=`ME-${randomUUID()}`;this.store.run('INSERT INTO memory_entities(id,kind,name,normalized_name,created_at,created_by,updated_at) VALUES(?,?,?,?,?,?,?)',id,kind,clean,normalize(clean),at,actor,at);
  return this.store.one('SELECT * FROM memory_entities WHERE id=?',id);
 }
 createEntity(input:{kind:EntityKind;name:string;aliases?:string[];attributes?:Record<string,unknown>;actor:Person;at:string}){
  const entity=this.ensureEntity(input.name,input.kind,input.actor,input.at);
  const aliases=[...new Set([...JSON.parse(entity.aliases),...(input.aliases??[]).map(cleanName).filter(Boolean)])];
  const attributes={...JSON.parse(entity.attributes),...(input.attributes??{})};
  this.store.run('UPDATE memory_entities SET aliases=?,attributes=?,updated_at=?,version=version+1 WHERE id=?',JSON.stringify(aliases),JSON.stringify(attributes),input.at,entity.id);
  this.store.audit(input.at,input.actor,'memory_entity',entity.id,{kind:entity.kind,name:entity.name});
  return this.entity(entity.id);
 }
 recordFact(input:FactInput){
  const subject=this.ensureEntity(input.subject,'person',input.actor,input.at),predicate=normalize(input.predicate).replace(/\s+/g,'_');
  if(!/^[a-z0-9_]{2,64}$/.test(predicate))throw new Error('Campo de memoria inválido.');
  const value=JSON.stringify(input.value),normalizedValue=normalize(typeof input.value==='string'?input.value:JSON.stringify(input.value));
  const previous=this.store.one("SELECT * FROM memory_facts WHERE subject_id=? AND predicate=? AND status='active' ORDER BY created_at DESC LIMIT 1",subject.id,predicate);
  if(previous&&previous.normalized_value===normalizedValue)return {entity:subject,changed:false,id:previous.id};
  if(input.sourceMessageId&&!this.store.one('SELECT id FROM inbox WHERE id=?',input.sourceMessageId))throw new Error('El origen de memoria no está registrado en inbox.');
  if(previous)this.store.run("UPDATE memory_facts SET status='superseded',updated_at=? WHERE id=?",input.at,previous.id);
  const id=`MF-${randomUUID()}`;this.store.run('INSERT INTO memory_facts(id,subject_id,predicate,value,normalized_value,source_message_id,source_note,created_at,created_by,updated_at,replaces_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,subject.id,predicate,value,normalizedValue,input.sourceMessageId??null,input.sourceNote??null,input.at,input.actor,input.at,previous?.id??null);
  this.store.run('UPDATE memory_entities SET updated_at=?,version=version+1 WHERE id=?',input.at,subject.id);
  this.store.audit(input.at,input.actor,previous?'memory_fact_updated':'memory_fact_created',subject.id,{id,predicate,replaces:previous?.id??null,sourceMessageId:input.sourceMessageId??null});
  return {entity:this.store.one('SELECT * FROM memory_entities WHERE id=?',subject.id),changed:true,id};
 }
 setRelation(input:{subject:string;object:string;relation:string;sourceMessageId?:string;sourceNote?:string;actor:Person;at:string}){
  const subject=this.ensureEntity(input.subject,'person',input.actor,input.at),object=this.ensureEntity(input.object,'person',input.actor,input.at),relation=normalize(input.relation).replace(/\s+/g,'_');
  if(subject.id===object.id)throw new Error('Una persona no puede relacionarse consigo misma.');
  if(!/^[a-z0-9_]{2,64}$/.test(relation))throw new Error('Relación inválida.');
  if(input.sourceMessageId&&!this.store.one('SELECT id FROM inbox WHERE id=?',input.sourceMessageId))throw new Error('El origen de memoria no está registrado en inbox.');
  const existing=this.store.one("SELECT id FROM memory_relations WHERE subject_id=? AND object_id=? AND relation_type=? AND status='active'",subject.id,object.id,relation);
  if(existing)return {id:existing.id,changed:false,subject:subject.name,object:object.name,relation};
  const id=`MR-${randomUUID()}`;this.store.run('INSERT INTO memory_relations(id,subject_id,object_id,relation_type,source_message_id,source_note,created_at,created_by) VALUES(?,?,?,?,?,?,?,?)',id,subject.id,object.id,relation,input.sourceMessageId??null,input.sourceNote??null,input.at,input.actor);
  this.store.audit(input.at,input.actor,'memory_relation_created',subject.id,{id,objectId:object.id,relation,sourceMessageId:input.sourceMessageId??null});
  return {id,changed:true,subject:subject.name,object:object.name,relation};
 }
 entity(id:string){
  const entity=this.store.one('SELECT * FROM memory_entities WHERE id=?',id);if(!entity)return null;
  const facts=this.store.all("SELECT * FROM memory_facts WHERE subject_id=? AND status='active' ORDER BY predicate",id).map((f:any)=>({...f,value:JSON.parse(f.value)}));
  const relations=this.store.all("SELECT r.*,a.name AS subject_name,b.name AS object_name FROM memory_relations r JOIN memory_entities a ON a.id=r.subject_id JOIN memory_entities b ON b.id=r.object_id WHERE (r.subject_id=? OR r.object_id=?) AND r.status='active' ORDER BY r.created_at",id,id);
  return {...entity,aliases:JSON.parse(entity.aliases),attributes:JSON.parse(entity.attributes),facts,relations};
 }
 search(name:string){const entity=this.entityByName(name);return entity?this.entity(entity.id):null;}
 relatives(name:string){
  const entity=this.entityByName(name);if(!entity)return null;
  return this.store.all("SELECT r.relation_type,a.id AS subject_id,a.name AS subject_name,b.id AS object_id,b.name AS object_name FROM memory_relations r JOIN memory_entities a ON a.id=r.subject_id JOIN memory_entities b ON b.id=r.object_id WHERE r.status='active' AND (r.subject_id=? OR r.object_id=?) ORDER BY a.name,b.name",entity.id,entity.id).map((row:any)=>({name:row.subject_id===entity.id?row.object_name:row.subject_name,relation:row.relation_type,relationLabel:relationLabels[row.relation_type]??row.relation_type}));
 }
 birthday(name:string){const e=this.entityByName(name);if(!e)return null;const fact=this.store.one("SELECT value FROM memory_facts WHERE subject_id=? AND predicate='birthday' AND status='active' ORDER BY created_at DESC LIMIT 1",e.id);return fact?{name:e.name,...JSON.parse(fact.value)}:null;}
 recognizes(text:string){const t=normalize(text).replace(/^[¿¡\s]+/,'');return /^(?:guarda|anota que|registra que|actualiza|actualizar|corrige|(?:el )?telefono (?:de|del|de la)|(?:el )?(?:correo|email) (?:de|del|de la)|(?:la )?direccion (?:de|del|de la))\b/.test(t)||/^(?:cuando cumple|cuando es el cumpleanos|quien es|que datos tenemos de|que familiares de)\b/.test(t);}
 handle(message:Incoming){
  const raw=message.text.trim(),t=normalize(raw).replace(/^[¿¡\s]+/,'');let reply:string[]|undefined;
  const sibling=t.match(/^(?:guarda(?: que)?|anota que|registra que)\s+(.+?)\s+es\s+(?:hermano|hermana)\s+de\s+(.+?)[.!]?$/);
  const birthday=t.match(/^(?:guarda(?: que)?|anota que|registra que)\s+(.+?)\s+(?:cumple|cumpleanos(?: es)?)\s+(?:anos?\s+)?(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?[.!]?$/);
  const phone=t.match(/^(?:(?:guarda(?: que)?|anota que|registra que|actualiza(?: el)?)\s+)?(?:el\s+)?telefono\s+(?:de|del|de la)\s+(.+?)\s+(?:es|a)\s+(.+?)[.!]?$/);
  const email=t.match(/^(?:(?:guarda(?: que)?|anota que|registra que|actualiza(?: el)?)\s+)?(?:el\s+)?(?:correo|email)\s+(?:de|del|de la)\s+(.+?)\s+(?:es|a)\s+(.+?)[.!]?$/);
  const address=t.match(/^(?:(?:guarda(?: que)?|anota que|registra que|actualiza(?: la)?)\s+)?(?:la\s+)?direccion\s+(?:de|del|de la)\s+(.+?)\s+(?:es|a)\s+(.+?)[.!]?$/);
  const birthdayQuery=t.match(/^(?:cuando cumple|cuando es el cumpleanos de)\s+(.+?)[?!.]*$/);
  const relativesQuery=t.match(/^que familiares de\s+(.+?)\s+(?:tenemos registrados|tenemos|hay registrados)[?!.]*$/);
  const personQuery=t.match(/^(?:quien es|que datos tenemos de)\s+(.+?)(?:\s+y\s+que datos tenemos)?[?!.]*$/);
  const month=birthday&&months[birthday[3]];
  return this.store.tx(()=>{
   if(this.store.one('SELECT id FROM inbox WHERE id=?',message.id))return [];
   this.store.run('INSERT INTO inbox VALUES(?,?,?,?)',message.id,message.author,message.at,JSON.stringify(message));
   if(sibling){const a=displayName(sibling[1]),b=displayName(sibling[2]);const result=this.setRelation({subject:a,object:b,relation:'sibling',sourceMessageId:message.id,actor:message.author,at:message.at});reply=[result.changed?`Relación registrada: ${result.subject} y ${result.object} son hermanos.`:'Esa relación familiar ya estaba registrada.'];}
   else if(birthday){if(!month||Number(birthday[2])<1||Number(birthday[2])>31)reply=['No pude validar el cumpleaños. Indicar día y mes, por ejemplo 18 de marzo.'];else{const subject=displayName(birthday[1]),value={day:Number(birthday[2]),month,year:birthday[4]?Number(birthday[4]):null};const result=this.recordFact({subject,predicate:'birthday',value,sourceMessageId:message.id,actor:message.author,at:message.at});reply=[result.changed?`Cumpleaños de ${result.entity.name} guardado para el ${value.day} de ${Object.keys(months).find(k=>months[k]===month)}${value.year?` de ${value.year}`:''}.`:`El cumpleaños de ${result.entity.name} ya estaba guardado.`];}}
   else if(phone||email||address){const match=phone??email??address!,subject=displayName(match[1]),predicate=phone?'phone':email?'email':'address',value=cleanName(match[2]);const result=this.recordFact({subject,predicate,value,sourceMessageId:message.id,actor:message.author,at:message.at});reply=[result.changed?`${predicate==='phone'?'Teléfono':predicate==='email'?'Correo':'Dirección'} de ${result.entity.name} guardado/actualizado.`:`Ese dato de ${result.entity.name} ya estaba guardado.`];}
   else if(birthdayQuery){const result=this.birthday(birthdayQuery[1]);reply=[result?`${displayName(result.name)} cumple el ${result.day} de ${Object.keys(months).find(k=>months[k]===result.month)}${result.year?` de ${result.year}`:''}.`:`No hay un cumpleaños registrado para ${displayName(birthdayQuery[1])}.`];}
   else if(relativesQuery){const result=this.relatives(relativesQuery[1]);reply=[result===null?`No tengo registrada a ${displayName(relativesQuery[1])}.`:result.length?result.map((r:any)=>`${displayName(r.name)}: ${r.relationLabel}`).join('\n'):`No hay familiares registrados para ${displayName(relativesQuery[1])}.`];}
   else if(personQuery){const result=this.search(personQuery[1]);reply=[result?`${result.name}${result.facts.length?`\n${result.facts.map((f:any)=>`${f.predicate}: ${typeof f.value==='string'?f.value:JSON.stringify(f.value)}`).join('\n')}`:''}${result.relations.length?`\nRelaciones: ${result.relations.map((r:any)=>`${r.subject_name} — ${r.relation_type} — ${r.object_name}`).join('; ')}`:''}`:`No tengo datos registrados para ${cleanName(personQuery[1])}.`];}
   else reply=['No pude identificar el dato de memoria. Indicá persona, relación o campo concreto (cumpleaños, teléfono, correo o dirección).'];
   for(const [index,text] of reply.entries())this.store.enqueue(`reply:${message.id}:${index}`,message.at,{text,mentions:[]});
   this.store.audit(message.at,message.author,'memory_message',null,{messageId:message.id});return reply;
  });
 }
}
