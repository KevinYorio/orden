import { z } from 'zod';

export interface AIProvider {
 status():Promise<{enabled:boolean;available:boolean;provider:string;model:string;embeddingModel:string;version?:string;modelInstalled?:boolean;embeddingModelInstalled?:boolean;localOnly:true;error?:string}>;
 structured<T>(schema:z.ZodType<T>,system:string,prompt:string,options?:{image?:Buffer;images?:Buffer[];maxTokens?:number}):Promise<T>;
 embed?(text:string):Promise<number[]>;
}

type FetchLike=typeof fetch;
type OllamaTags={models?:{name?:string}[]};
type OllamaChat={message?:{content?:string};error?:string};

export class OllamaLocalProvider implements AIProvider {
 private readonly base:string;
 private inferenceActive=false;
 constructor(private readonly model:string,private readonly embeddingModel:string,baseUrl='http://127.0.0.1:11434',private readonly request:FetchLike=fetch){
  const url=new URL(baseUrl);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]','::1'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Ollama debe usar una URL HTTP loopback local, sin credenciales ni rutas externas.');
  this.base=url.origin;
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(model)||!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(embeddingModel))throw new Error('Nombre de modelo Ollama inválido.');
 }
 private async json(path:string,body?:unknown,timeout=5000){
  const response=await this.request(`${this.base}${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error('Ollama local no respondió correctamente.');return data as any;
 }
 async status(){
  try{const [version,tags]=await Promise.all([this.json('/api/version'),this.json('/api/tags')]),names=new Set(((tags as OllamaTags).models??[]).map(m=>m.name??''));return {enabled:true,available:true,provider:'ollama_local',model:this.model,embeddingModel:this.embeddingModel,version:String(version.version??''),modelInstalled:names.has(this.model),embeddingModelInstalled:names.has(this.embeddingModel),localOnly:true as const};}
  catch{return {enabled:true,available:false,provider:'ollama_local',model:this.model,embeddingModel:this.embeddingModel,modelInstalled:false,embeddingModelInstalled:false,localOnly:true as const,error:'Servicio local o modelos no disponibles.'};}
 }
 async structured<T>(schema:z.ZodType<T>,system:string,prompt:string,options:{image?:Buffer;images?:Buffer[];maxTokens?:number}={}){
  if(this.inferenceActive)throw new Error('El modelo local ya está ocupado; reintentar cuando termine.');this.inferenceActive=true;
  try{
  if(Buffer.byteLength(prompt,'utf8')>12000||Buffer.byteLength(system,'utf8')>6000)throw new Error('Solicitud local excede el límite de texto.');
  const images=options.images??(options.image?[options.image]:[]);if(images.length>5||images.reduce((sum,image)=>sum+image.byteLength,0)>10000000)throw new Error('La solicitud local no puede superar cinco imágenes ni 10 MB.');
  const messages=[{role:'system',content:system},{role:'user',content:prompt,...(images.length?{images:images.map(image=>image.toString('base64'))}:{})}];
  const response=await this.json('/api/chat',{model:this.model,messages,format:z.toJSONSchema(schema),stream:false,keep_alive:'2m',options:{temperature:0,num_predict:options.maxTokens??1200,num_ctx:4096}},120000) as OllamaChat;
  if(!response.message?.content)throw new Error('El modelo local no devolvió contenido estructurado.');
  let parsed:unknown;try{parsed=JSON.parse(response.message.content);}catch{throw new Error('La salida del modelo local no es JSON válido.');}
  return schema.parse(parsed);
  }finally{this.inferenceActive=false;}
 }
 async embed(text:string){
  if(this.inferenceActive)throw new Error('El modelo local ya está ocupado; reintentar cuando termine.');this.inferenceActive=true;
  try{
  if(!text.trim()||Buffer.byteLength(text,'utf8')>8000)throw new Error('Texto de búsqueda vacío o demasiado largo.');
  const response=await this.json('/api/embed',{model:this.embeddingModel,input:text,truncate:false,keep_alive:'2m'},30000);
  const vector=response.embeddings?.[0];if(!Array.isArray(vector)||vector.length<64||vector.some((n:unknown)=>typeof n!=='number'||!Number.isFinite(n)))throw new Error('Embedding local inválido.');return vector as number[];
  }finally{this.inferenceActive=false;}
 }
}
