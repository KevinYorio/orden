import { mkdirSync,writeFileSync,existsSync,readFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if(!process.version.startsWith('v24.'))throw new Error('Se requiere Node 24 LTS.');
if(existsSync('.env'))process.loadEnvFile('.env');
const dir=resolve(process.env.APP_DATA_DIR||join(process.env.LOCALAPPDATA??homedir(),'AsistenteHogar'));
if((process.env.APP_LOCATION??'local')!=='local')throw new Error('Setup inicial sólo PC. Remoto requiere traspaso.');
mkdirSync(dir,{recursive:true});const credential=join(dir,'api-token');if(!existsSync(credential))writeFileSync(credential,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
if(!process.env.APP_BACKUP_ENCRYPTION_KEY){const key=randomBytes(32).toString('hex');if(!existsSync('.env'))writeFileSync('.env',`APP_LOCATION=local\nAPP_DATA_DIR=${dir.replaceAll('\\','/')}\nAPP_PORT=4317\nMESSAGING_ADAPTER=simulated\nSTORAGE_MODE=local_only\nAPP_BACKUP_ENCRYPTION_KEY=${key}\n`,{flag:'wx'});else writeFileSync('.env',readFileSync('.env','utf8').replace(/\s*$/,'')+`\nAPP_BACKUP_ENCRYPTION_KEY=${key}\n`);process.env.APP_BACKUP_ENCRYPTION_KEY=key;}
if(!existsSync('.env'))writeFileSync('.env',`APP_LOCATION=local\nAPP_DATA_DIR=${dir.replaceAll('\\','/')}\nAPP_PORT=4317\nMESSAGING_ADAPTER=simulated\nSTORAGE_MODE=local_only\n`,{flag:'wx'});
if(!existsSync(join(dir,'hogar.sqlite'))){const result=spawnSync(process.execPath,['--env-file-if-exists=.env',fileURLToPath(new URL('../dist/apps/service/src/cli.js',import.meta.url)),'init-local'],{stdio:'inherit',env:{...process.env,APP_DATA_DIR:dir}});if(result.status!==0)throw new Error('Falta compilar o no se pudo inicializar. Ejecutar npm.cmd run build.');}
console.log(`Datos y credencial en ${dir}. No se vincularon cuentas ni se inició Railway.`);
console.log('Para ver la credencial local: Get-Content -LiteralPath "'+credential+'"');
