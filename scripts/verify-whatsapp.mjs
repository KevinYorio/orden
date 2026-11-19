import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const b=await import('@whiskeysockets/baileys');
for(const k of ['default','initAuthCreds','downloadMediaMessage','generateMessageIDV2','normalizeMessageContent'])assert.equal(typeof b[k],'function',k);
assert.equal(typeof b.BufferJSON,'object');
const pkg=JSON.parse(readFileSync('node_modules/@whiskeysockets/baileys/package.json','utf8'));
console.log(JSON.stringify({version:pkg.version,license:pkg.license,imports:'correctos',linked:false,productionVerified:false}));
