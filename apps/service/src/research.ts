import { randomUUID } from 'node:crypto';
import { normalize,local } from '../../../packages/domain/src/dates.js';
import { Store } from './store.js';

export type ResearchSource={title:string;url:string;snippet:string;pageAge:string|null;pageFetched:string|null};
export type ResearchResult={provider:string;fetchedAt:string;sources:ResearchSource[]};
export interface ResearchProvider {readonly id:string;search(query:string):Promise<ResearchResult>;}
type FetchLike=typeof fetch;
type BraveResponse={web?:{results?:{title?:string;url?:string;description?:string;page_age?:string|null;page_fetched?:string|null}[]}};

export class BraveSearchProvider implements ResearchProvider {
 readonly id='brave_search';
 constructor(private readonly key:string,private readonly request:FetchLike=fetch,private readonly now:()=>string=()=>new Date().toISOString()){
  if(key.length<12||key.length>300||/[\r\n\0]/.test(key))throw new Error('Clave de búsqueda inválida.');
 }
 async search(query:string):Promise<ResearchResult>{
  const url=new URL('https://api.search.brave.com/res/v1/web/search');url.searchParams.set('q',query);url.searchParams.set('country','AR');url.searchParams.set('search_lang','es');url.searchParams.set('ui_lang','es-AR');url.searchParams.set('count','5');url.searchParams.set('safesearch','strict');url.searchParams.set('spellcheck','false');url.searchParams.set('result_filter','web');url.searchParams.set('text_decorations','false');url.searchParams.set('include_fetch_metadata','true');
  let response:Response;try{response=await this.request(url,{headers:{accept:'application/json','x-subscription-token':this.key,'cache-control':'no-cache'},signal:AbortSignal.timeout(8000),redirect:'error'});}catch{throw new Error('No se pudo conectar con el proveedor de búsqueda. No se guardó el contenido de la consulta.');}
  if(!response.ok)throw new Error(`El proveedor de búsqueda respondió ${response.status}; consultar su cuota y configuración.`);
  const data=await response.json() as BraveResponse;const sources=(data.web?.results??[]).slice(0,5).flatMap(result=>{if(typeof result.title!=='string'||typeof result.url!=='string')return [];let url:URL;try{url=new URL(result.url);}catch{return [];}if(url.protocol!=='https:'||url.username||url.password)return [];return [{title:result.title.slice(0,240),url:url.toString(),snippet:String(result.description??'').slice(0,700),pageAge:typeof result.page_age==='string'?result.page_age:null,pageFetched:typeof result.page_fetched==='string'?result.page_fetched:null}];});
  return {provider:this.id,fetchedAt:this.now(),sources};
 }
}

export function assertPublicQuery(query:string,privateNames:string[]=[]){
 const text=query.trim(),normalized=normalize(text);if(text.length<3||text.length>200||/[\x00-\x1f]/.test(text)||text.split(/\s+/).length>30)throw new Error('La búsqueda pública debe tener entre 3 y 200 caracteres y no superar 30 palabras.');
 if(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text)||/(?:\+?\d[\d ().-]{7,}\d)/.test(text)||/\b(?:dni|cuil|cuit|domicilio|direccion|telefono|cumpleanos|mi familia|mi casa|mi hijo|mi hija|mi pareja|mi auto|nuestra casa|nuestro hogar|my family|my home|my address|my son|my daughter|my partner|my car|our home|our family)\b/.test(normalized))throw new Error('La consulta parece incluir información personal o familiar; no se envió.');
 for(const name of privateNames){const candidate=normalize(name).trim();if(candidate.length<3||candidate.length>100)continue;const escaped=candidate.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(normalized))throw new Error('La consulta menciona una entidad de la memoria familiar; no se envió.');}
 return text;
}

export class ResearchService {
 constructor(private store:Store,readonly provider:ResearchProvider|undefined,private readonly monthlyLimit=100,private readonly now:()=>string=()=>new Date().toISOString()){}
 readonly agreementVersion='brave-search-end-user-v1';
 private agreements(){return Object.fromEntries((['kevin','luisina'] as const).map(actor=>{const value=this.store.get<{accepted:boolean;acceptedAt:string;version:string}>(`researchAgreement:${actor}`);return [actor,{accepted:value?.accepted===true&&value.version===this.agreementVersion,acceptedAt:value?.accepted===true&&value.version===this.agreementVersion?value.acceptedAt:null}];})) as Record<'kevin'|'luisina',{accepted:boolean;acceptedAt:string|null}>;}
 status(){const month=local(this.now()).toFormat('yyyy-MM'),usage=this.store.get<{month:string;count:number}>('researchUsage'),agreements=this.agreements(),endUserAgreementComplete=agreements.kevin.accepted&&agreements.luisina.accepted;return {provider:this.provider?.id??'none',providerConfigured:!!this.provider,enabled:!!this.provider&&endUserAgreementComplete,agreements,endUserAgreementComplete,agreementVersion:this.agreementVersion,month,count:usage?.month===month?usage.count:0,monthlyLimit:this.monthlyLimit,unitPriceUsd:0.005,maximumMonthlyCostUsd:Number((this.monthlyLimit*0.005).toFixed(2)),requiresPerQueryConsent:true,queryStoredByApplication:false};}
 setAgreement(actor:'kevin'|'luisina',accepted:boolean){const key=`researchAgreement:${actor}`,previous=this.store.get<{accepted:boolean;version:string}>(key),value={accepted,acceptedAt:this.now(),version:this.agreementVersion};this.store.tx(()=>{this.store.set(key,value);this.store.audit(this.now(),actor,accepted?'public_research_agreement_accepted':'public_research_agreement_revoked',null,{version:this.agreementVersion});});return {actor,accepted,previouslyAccepted:previous?.accepted===true,status:this.status()};}
 async search(rawQuery:string,confirmedPublicQuery:boolean,actor:'kevin'|'luisina'){
  if(!this.provider)throw new Error('Investigación web deshabilitada. Configurar un proveedor externo por decisión de la familia.');if(confirmedPublicQuery!==true)throw new Error('Confirmar que sólo se enviará una consulta pública, sin información familiar.');
  if(!this.status().endUserAgreementComplete)throw new Error('Cada usuario de la familia debe aceptar el acuerdo de uso de resultados antes de habilitar la investigación web.');
  const names=this.store.all('SELECT name,aliases FROM memory_entities').flatMap((row:any)=>[row.name,...JSON.parse(row.aliases)]);const query=assertPublicQuery(rawQuery,names),month=local(this.now()).toFormat('yyyy-MM'),current=this.store.get<{month:string;count:number}>('researchUsage'),count=current?.month===month?current.count:0;if(count>=this.monthlyLimit)throw new Error(`Límite local de ${this.monthlyLimit} búsquedas alcanzado para ${month}.`);
  const usage={month,count:count+1};this.store.tx(()=>{this.store.set('researchUsage',usage);this.store.audit(this.now(),actor,'public_research_reserved',null,{provider:this.provider!.id,month,count:usage.count,queryStored:false});});
  const executionId=`AX-${randomUUID()}`;try{const result=await this.provider.search(query);this.store.run('INSERT INTO agent_executions(id,request_kind,status,agents,result,error_code,started_at,ended_at,actor) VALUES(?,?,?,?,?,?,?,?,?)',executionId,'research_public_information','completed',JSON.stringify(['orden.research']),JSON.stringify({sourceCount:result.sources.length,provider:result.provider,queryStored:false}),null,this.now(),this.now(),actor);return {...result,usage:{...usage,monthlyLimit:this.monthlyLimit},query};}
  catch(error){this.store.run('INSERT INTO agent_executions(id,request_kind,status,agents,result,error_code,started_at,ended_at,actor) VALUES(?,?,?,?,?,?,?,?,?)',executionId,'research_public_information','failed',JSON.stringify(['orden.research']),JSON.stringify({queryStored:false}), 'provider_error',this.now(),this.now(),actor);throw error;}
 }
}
