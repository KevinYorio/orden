import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { createHash,timingSafeEqual } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync,existsSync,renameSync,readdirSync,unlinkSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { validateSnapshot } from './runtime.js';
import { hash } from './files.js';
import { local } from '../../../packages/domain/src/dates.js';
import type { Config } from './api.js';
export async function startProxy(c:Config){
 const remote=new URL(c.remoteUrl!);if(remote.protocol!=='https:'||remote.username||remote.password||!c.remoteToken)throw new Error('Proxy requiere URL HTTPS y token remoto fuera del navegador.');
 const app=Fastify({logger:false,bodyLimit:14000000}),cache=join(c.dir,'remote-cache');mkdirSync(cache,{recursive:true});
 const digest=(s:string)=>createHash('sha256').update(s).digest(),base=`http://127.0.0.1:${c.port}`;
 app.addContentTypeParser('application/octet-stream',{parseAs:'buffer'},(_r,b,d)=>d(null,b));
 app.addHook('onRequest',async(req,reply)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');if(![new URL(base).host,`localhost:${c.port}`].includes(req.headers.host??'')||req.headers.origin&&![base,`http://localhost:${c.port}`].includes(req.headers.origin))return reply.code(403).send({error:'Host/origen no permitido.'});if(req.url.startsWith('/api/')){const token=req.headers.authorization?.replace(/^Bearer /,'')??'';if(!timingSafeEqual(digest(token),digest(c.token)))return reply.code(401).send({error:'Token local requerido.'});}});
 const remoteFetch=(path:string,init:RequestInit={})=>fetch(new URL(path,remote),{...init,headers:{...init.headers,authorization:`Bearer ${c.remoteToken}`},signal:AbortSignal.timeout(30000),redirect:'error'});
 app.post('/api/stop',async(_req,reply)=>{reply.send({stopping:true});clearInterval(timer);setTimeout(()=>{void app.close();},100);});
 app.all('/api/*',async(req,reply)=>{try{
  const response=await remoteFetch(req.url,{method:req.method,headers:req.headers['content-type']?{'content-type':req.headers['content-type']}:{},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.isBuffer(req.body)?new Uint8Array(req.body):JSON.stringify(req.body)});
  const buffer=Buffer.from(await response.arrayBuffer());if(req.url==='/api/state'&&response.ok)writeFileSync(join(cache,'state.json'),JSON.stringify({at:new Date().toISOString(),data:JSON.parse(buffer.toString())}));
  if(req.url==='/api/status'&&response.ok){const status=JSON.parse(buffer.toString());return {...status,localController:true,cacheReadOnly:true};}
  reply.code(response.status).type(response.headers.get('content-type')??'application/json');const disposition=response.headers.get('content-disposition');if(disposition)reply.header('content-disposition',disposition);return reply.send(buffer);
 }catch{if(req.url==='/api/state'&&existsSync(join(cache,'state.json'))){const saved=JSON.parse(readFileSync(join(cache,'state.json'),'utf8'));return {...saved.data,stale:true,cachedAt:saved.at,readOnly:true};}return reply.code(503).send({error:'Remoto no disponible. La caché es sólo lectura y no permite activar la PC.'});}});
 let busy=false;const backup=async()=>{if(busy)return;busy=true;try{
  const stamp=join(cache,'last-backup.json'),last=existsSync(stamp)?JSON.parse(readFileSync(stamp,'utf8')):null,now=new Date().toISOString();const statusResponse=await remoteFetch('/api/status');if(!statusResponse.ok)return;const status=await statusResponse.json() as any;if(last&&(last.day===local(now).toISODate()||last.revision===status.revision))return;
  const response=await remoteFetch('/api/export',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(!response.ok)return;const data:any=await response.json(),id=data.id;
  if(!/^(backup)-[\w-]+$/.test(id))throw new Error('ID de respaldo inválido.');const dir=join(cache,'snapshots',id);mkdirSync(dir,{recursive:true});for(const filename of ['manifest.json','state.sqlite']){const r=await remoteFetch(`/api/snapshots/${id}/${filename}`);if(!r.ok)throw new Error('Descarga de respaldo falló.');writeFileSync(join(dir,filename),Buffer.from(await r.arrayBuffer()));}
  const m=validateSnapshot(dir);writeFileSync(stamp,JSON.stringify({day:local(now).toISODate(),at:now,cursor:m.cursor,revision:status.revision}));
  const originals=join(cache,'originals');mkdirSync(originals,{recursive:true});for(const doc of m.documents){const path=join(originals,doc.hash);if(existsSync(path)&&hash(readFileSync(path))===doc.hash)continue;const r=await remoteFetch(`/api/documents/${doc.id}`);if(!r.ok)continue;const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>10000000||hash(bytes)!==doc.hash)continue;writeFileSync(path+'.tmp',bytes);renameSync(path+'.tmp',path);await remoteFetch(`/api/documents/${doc.id}/local-copy`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hash:doc.hash})});}
  const dirs=readdirSync(join(cache,'snapshots')).sort().reverse(),valid:string[]=[];for(const d of dirs)try{validateSnapshot(join(cache,'snapshots',d));valid.push(d);}catch{}for(const d of valid.slice(7))for(const filename of ['state.sqlite','manifest.json'])unlinkSync(join(cache,'snapshots',d,filename));
 }finally{busy=false;}};
 if(existsSync(resolve('apps/web/build')))await app.register(fastifyStatic,{root:resolve('apps/web/build')});
 const timer=setInterval(()=>{void backup().catch(()=>{});},60000);process.on('SIGINT',()=>{clearInterval(timer);void app.close();});process.on('SIGTERM',()=>{clearInterval(timer);void app.close();});await app.listen({host:'127.0.0.1',port:c.port});void backup().catch(()=>{});console.log(`Controlador PC: ${base}. API del propietario remoto; caché sin propiedad.`);
}
