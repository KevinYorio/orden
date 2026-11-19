import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
const dir=process.env.APP_DATA_DIR||join(process.env.LOCALAPPDATA??homedir(),'AsistenteHogar'),token=process.env.APP_API_TOKEN||readFileSync(join(dir,'api-token'),'utf8').trim(),port=process.env.APP_PORT||4317;
if((process.env.APP_LOCATION??'local')!=='local')throw new Error('Este comando sólo detiene la app local.');
const r=await fetch(`http://127.0.0.1:${port}/api/stop`,{method:'POST',headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('El proceso local no aceptó la parada.');
let stopped=false;for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,500));try{await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(500)});}catch{stopped=true;break;}}
if(!stopped)throw new Error('El proceso todavía responde; revisar estado.');console.log('Asistente Hogar local detenido.');
