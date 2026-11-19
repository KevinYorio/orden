// Verificación opcional con Chrome/Edge ya instalado; no es dependencia del bot.
import { spawn } from 'node:child_process';
import { mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync } from 'node:fs';
import { resolve,join } from 'node:path';
import assert from 'node:assert/strict';
import { Store } from '../dist/apps/service/src/store.js';
import { RuntimeController } from '../dist/apps/service/src/runtime.js';
const workspace=resolve('.test-data');mkdirSync(workspace,{recursive:true});const dir=mkdtempSync(join(workspace,'ui-')),db=new Store(dir);new RuntimeController(db,'local').initLocal();db.close();
const token='synthetic-ui-only-credential-000000000000000000000000',port=4329,base=`http://127.0.0.1:${port}`;
const service=spawn(process.execPath,['dist/apps/service/src/main.js'],{env:{...process.env,APP_LOCATION:'local',APP_DATA_DIR:dir,APP_API_TOKEN:token,APP_BACKUP_ENCRYPTION_KEY:'1'.repeat(64),APP_PORT:String(port),PORT:String(port),MESSAGING_ADAPTER:'simulated',AI_PROVIDER:'none',RESEARCH_PROVIDER:'none',BRAVE_SEARCH_API_KEY:'',REMOTE_APP_URL:'',APP_RECOVERY_ONLY:'false'},windowsHide:true,stdio:['ignore','pipe','pipe']});let serviceLog='';service.stderr.on('data',b=>serviceLog+=b);
const browserPath=process.env.TEST_BROWSER_PATH??'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';let browser,socket;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await delay(100);}
 assert.equal((await fetch(base+'/health')).status,200,serviceLog);
 const profile=join(dir,'chrome');browser=spawn(browserPath,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const active=join(profile,'DevToolsActivePort');for(let i=0;i<100&&!existsSync(active);i++)await delay(100);assert.ok(existsSync(active),'Chrome no inició el protocolo de prueba.');const debugPort=readFileSync(active,'utf8').split('\n')[0];
 const tab=await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(base)}`,{method:'PUT'})).json();socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((ok,bad)=>{socket.addEventListener('open',ok,{once:true});socket.addEventListener('error',bad,{once:true});});
 let seq=0;const pending=new Map(),exceptions=[];socket.addEventListener('message',ev=>{const data=JSON.parse(String(ev.data));if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params.exceptionDetails.text);if(data.id&&pending.has(data.id)){const {ok,bad}=pending.get(data.id);pending.delete(data.id);if(data.error)bad(new Error(JSON.stringify(data.error)));else ok(data.result);}});
 const call=(method,params={})=>new Promise((ok,bad)=>{const id=++seq;pending.set(id,{ok,bad});socket.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);bad(new Error(`Timeout CDP ${method}`));}},10000).unref();});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 for(let i=0;i<50;i++){if(await evaluate('!!document.querySelector("input[type=password]")'))break;await delay(100);}
 await evaluate(`sessionStorage.setItem('hogar-token',${JSON.stringify(token)}); location.reload();`);await delay(600);
 await evaluate('document.querySelector("form").requestSubmit()');
 for(let i=0;i<50;i++){if(await evaluate('!!document.querySelector("nav")'))break;await delay(100);}
 assert.equal(await evaluate('!!document.querySelector("nav")'),true,'No se abrió el tablero.');
 assert.equal(await evaluate('document.querySelector("h1").textContent'),'Inicio');assert.ok((await evaluate('document.body.innerText')).includes('0'));
 for(const page of ['Agenda','Facturas','Dinero','Compras','Documentos','Memoria','KEVIN OS','Conversación','Operación','Simulador','Inicio']){
  await evaluate(`Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes(${JSON.stringify(page)})).click()`);await delay(80);assert.equal(await evaluate('document.querySelector("h1").textContent'),page);
 }
 await evaluate(`Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('KEVIN OS')).click()`);await delay(150);
 assert.equal(await evaluate('document.body.innerText.includes("Investigacion publica en Internet")'),true,'KEVIN OS no muestra el panel de investigacion publica.');
 assert.equal(await evaluate('document.querySelector("section.panel input[placeholder*=Argentina]").disabled'),true,'La busqueda externa debe estar desactivada por defecto.');
 mkdirSync('docs/evidencia',{recursive:true});const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('docs/evidencia/tablero-desktop.png',Buffer.from(screenshot.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(100);assert.equal(await evaluate('document.documentElement.scrollWidth <= 391'),true,'El tablero desborda en móvil.');
 const mobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('docs/evidencia/tablero-movil.png',Buffer.from(mobile.data,'base64'));
 await evaluate(`Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('Memoria')).click()`);await delay(100);
 await evaluate(`(()=>{const s=document.querySelector('select[name=memory-author]');s.value='luisina';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await evaluate(`(()=>{const i=document.querySelector('input[name=name]');i.value='Entidad sintética de interfaz';i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();})()`);
 for(let i=0;i<50;i++){if((await evaluate('document.body.innerText')).includes('Entidad sintética de interfaz'))break;await delay(100);}
 const memoryText=await evaluate('document.body.innerText');assert.ok(memoryText.includes('Entidad sintética de interfaz'),'La vista de memoria no guardó una entidad desde el tablero.');assert.ok(memoryText.includes('Creada por luisina'),'La vista de memoria no conservó la autoría seleccionada.');
 assert.deepEqual(exceptions,[]);await fetch(base+'/api/stop',{method:'POST',headers:{authorization:`Bearer ${token}`}});await delay(500);console.log('Tablero: login, once vistas, KEVIN OS sin proveedor externo por defecto, memoria editable, estado vacío, escritorio/móvil y cero excepciones JS verificados.');
}finally{
 socket?.close();browser?.kill();service.kill();await delay(500);
 // Sólo se elimina el directorio temporal concreto creado por esta ejecución.
 if(!resolve(dir).startsWith(workspace+'\\')&&!resolve(dir).startsWith(workspace+'/'))throw new Error('Ruta temporal fuera del espacio de pruebas.');
 try{rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{console.log('Perfil de navegador temporal retenido en .test-data; no contiene datos reales.');}
}
