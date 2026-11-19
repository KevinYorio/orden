import { z } from 'zod';
import { local } from '../../../packages/domain/src/dates.js';
export const costSchema=z.object({at:z.string().datetime({offset:true}),cycleStart:z.string().datetime({offset:true}),cycleEnd:z.string().datetime({offset:true}),existingProjectedMicrousd:z.number().int().nonnegative(),botProjectedMicrousd:z.number().int().nonnegative(),botCurrentMicrousd:z.number().int().nonnegative(),residualMicrousd:z.number().int().nonnegative(),source:z.string().min(1),verified:z.literal(true),additionalJustification:z.string().optional()});
export type CostSample=z.infer<typeof costSchema>;
export function costDecision(raw:unknown,now:string){
 const parsed=costSchema.safeParse(raw);if(!parsed.success)return {allow:false,reason:'Muestra de costo verificada ausente.'};const s=parsed.data,n=local(now);
 if(local(s.cycleStart)>=local(s.cycleEnd)||s.botProjectedMicrousd<s.botCurrentMicrousd)return {allow:false,reason:'Ciclo o proyección de costos inconsistente.'};
 if(!local(s.at).isValid||n.diff(local(s.at),'minutes').minutes>60||local(s.at)>n||n<local(s.cycleStart)||n>=local(s.cycleEnd))return {allow:false,reason:'Métricas viejas, futuras o fuera del ciclo real.'};
 const total=Math.max(5000000,s.existingProjectedMicrousd+s.botProjectedMicrousd+s.residualMicrousd),increment=total-Math.max(5000000,s.existingProjectedMicrousd);
 if(total>5400000||increment>400000)return {allow:false,reason:'Umbral preventivo superado.',total,increment};
 if(increment>0&&!s.additionalJustification)return {allow:false,reason:'Falta justificar costo adicional.',total,increment};return {allow:true,reason:'Margen según muestra; no es hard limit de Railway.',total,increment};
}
export interface DeploymentScope {projectId:string;environmentId:string;serviceId:string;deploymentId:string;}
export interface Platform {simulated:boolean;scope:DeploymentScope;verify():Promise<void>;stop():Promise<void>;stopped():Promise<boolean>;}
export class SimulatedPlatform implements Platform {
 simulated=true;halted=false;failStop=false;scope={projectId:'sim-project',environmentId:'sim-env',serviceId:'sim-bot',deploymentId:'sim-deployment'};
 async verify(){} async stop(){if(this.failStop)throw new Error('Fallo simulado de parada.');this.halted=true;} async stopped(){return this.halted;}
}
export class RailwayPlatform implements Platform {
 simulated=false;
 constructor(public scope:DeploymentScope,private token:string){if(Object.values(scope).some(v=>!v)||!token)throw new Error('Faltan IDs/token de plataforma de esta app.');}
 async query(query:string,variables:unknown):Promise<any>{const response=await fetch('https://backboard.railway.com/graphql/v2',{method:'POST',headers:{'content-type':'application/json','Project-Access-Token':this.token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000)});const body:any=await response.json();if(!response.ok||body.errors?.length||!body.data)throw new Error(`Railway rechazó operación (${response.status}); revisar permisos/esquema sin exponer token.`);return body.data;}
 async deployments(){const data=await this.query('query deployments($input: DeploymentListInput!, $first: Int) { deployments(input:$input,first:$first) { edges { node { id status } } } }',{input:{projectId:this.scope.projectId,environmentId:this.scope.environmentId,serviceId:this.scope.serviceId},first:100});const rows=data.deployments.edges.map((x:any)=>x.node);if(rows.length>=100)throw new Error('No se puede demostrar alcance: completar paginación antes de operar.');return rows as {id:string;status:string}[];}
 async verify(){const token=await this.query('query { projectToken { projectId environmentId } }',{});if(token.projectToken.projectId!==this.scope.projectId||token.projectToken.environmentId!==this.scope.environmentId)throw new Error('Token fuera del proyecto/entorno de esta app.');const data=await this.query('query service($id: String!) { service(id:$id) { id name projectId } }',{id:this.scope.serviceId});if(data.service.name!=='asistente-hogar'||data.service.projectId!==this.scope.projectId)throw new Error('El servicio debe ser la app independiente asistente-hogar del proyecto configurado. No se opera otro servicio.');if(!(await this.deployments()).some(d=>d.id===this.scope.deploymentId))throw new Error('Deployment no pertenece al servicio configurado.');}
 async stop(){await this.verify();await this.query('mutation deploymentStop($id: String!) { deploymentStop(id:$id) }',{id:this.scope.deploymentId});}
 async stopped(){await this.verify();const rows=await this.deployments();return rows.every(d=>['REMOVED','SKIPPED','FAILED'].includes(d.status));}
}
