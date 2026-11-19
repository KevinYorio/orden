import { mkdirSync,readdirSync,copyFileSync } from 'node:fs';
mkdirSync('dist/apps/service/migrations',{recursive:true});
for(const name of readdirSync('apps/service/migrations').filter(name=>name.endsWith('.sql'))){
 copyFileSync(`apps/service/migrations/${name}`,`dist/apps/service/migrations/${name}`);
}
