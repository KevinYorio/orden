import { z } from 'zod';
import type { CostSample } from './platform.js';
// La unidad y tarifa de cada measurement se calibran contra Railway antes de usarlo.
// No se infiere que estimatedValue esté en USD ni que el heap sea RAM facturada.
export const calibrationSchema=z.object({workspaceId:z.string().min(1),botProjectId:z.string().min(1),cycleStart:z.string().datetime({offset:true}),cycleEnd:z.string().datetime({offset:true}),verifiedCalibration:z.literal(true),evidence:z.string().min(10),additionalJustification:z.string().optional(),residualMicrousd:z.number().int().nonnegative(),measurements:z.array(z.object({measurement:z.string().regex(/^[A-Z_]+$/),microusdNumerator:z.string().regex(/^\d+$/),unitDenominator:z.string().regex(/^[1-9]\d*$/)})).min(4).max(20)});
type Calibration=z.infer<typeof calibrationSchema>;
type GraphQL=(query:string,variables:any)=>Promise<any>;
function cost(value:unknown,numerator:string,denominator:string){
 const str=String(value);if(!/^\d+(?:\.\d+)?$/.test(str))throw new Error('Valor de consumo no válido; no se inventa conversión de unidades.');
 const [w,d='']=str.split('.'),n=BigInt(w+d)*BigInt(numerator),den=10n**BigInt(d.length)*BigInt(denominator),result=(n+den-1n)/den;
 if(result>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Costo fuera de rango.');return Number(result);
}
export class RailwayCostReader {
 config:Calibration;
 constructor(raw:unknown,private query:GraphQL,private now:()=>string=()=>new Date().toISOString()){this.config=calibrationSchema.parse(raw);}
 static fromToken(raw:unknown,token:string,now?:()=>string){if(!token)throw new Error('Falta credencial de lectura de costos.');return new RailwayCostReader(raw,async(query,variables)=>{const r=await fetch('https://backboard.railway.com/graphql/v2',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000)}),b:any=await r.json();if(!r.ok||b.errors?.length||!b.data)throw new Error('Railway no permitió leer costos/esquema.');return b.data;},now);}
 async read():Promise<CostSample>{
  const c=this.config,measurements=c.measurements.map(m=>m.measurement),schema=await this.query('query { __type(name:"MetricMeasurement") { enumValues { name } } }',{});
  if(!schema.__type?.enumValues||measurements.some(m=>!schema.__type.enumValues.some((v:any)=>v.name===m)))throw new Error('Calibración incompatible con las mediciones de la API actual.');
  const estimatedQuery='query estimatedUsage($includeDeleted: Boolean, $measurements: [MetricMeasurement!]!, $projectId: String, $workspaceId: String) { estimatedUsage(includeDeleted:$includeDeleted,measurements:$measurements,projectId:$projectId,workspaceId:$workspaceId) { estimatedValue measurement projectId } }';
  const currentQuery='query usage($endDate: DateTime, $groupBy: [MetricTag]!, $includeDeleted: Boolean, $measurements: [MetricMeasurement!]!, $projectId: String, $startDate: DateTime, $workspaceId: String) { usage(endDate:$endDate,groupBy:$groupBy,includeDeleted:$includeDeleted,measurements:$measurements,projectId:$projectId,startDate:$startDate,workspaceId:$workspaceId) { measurement value } }';
  const at=this.now(),values=await Promise.all([this.query(estimatedQuery,{measurements,includeDeleted:true,workspaceId:c.workspaceId}),this.query(estimatedQuery,{measurements,includeDeleted:true,projectId:c.botProjectId}),this.query(currentQuery,{measurements,groupBy:[],includeDeleted:true,projectId:c.botProjectId,startDate:c.cycleStart,endDate:at})]);
  const sum=(rows:any[],field:string)=>{if(!Array.isArray(rows)||measurements.some(m=>!rows.some(r=>r.measurement===m)))throw new Error('Respuesta de costos incompleta.');let n=0;for(const row of rows){const spec=c.measurements.find(m=>m.measurement===row.measurement);if(!spec)throw new Error('Medición inesperada.');n+=cost(row[field],spec.microusdNumerator,spec.unitDenominator);}if(!Number.isSafeInteger(n))throw new Error('Costo fuera de rango.');return n;};
  const workspace=sum(values[0].estimatedUsage,'estimatedValue'),bot=sum(values[1].estimatedUsage,'estimatedValue'),current=sum(values[2].usage,'value');if(bot>workspace)throw new Error('La proyección del workspace no incluye correctamente al proyecto bot.');
  return {at,cycleStart:c.cycleStart,cycleEnd:c.cycleEnd,existingProjectedMicrousd:workspace-bot,botProjectedMicrousd:bot,botCurrentMicrousd:current,residualMicrousd:c.residualMicrousd,source:`Railway usage + estimatedUsage. Calibración: ${c.evidence}. Fecha de recopilación; métricas pueden tener demora.`,verified:true,additionalJustification:c.additionalJustification};
 }
}
