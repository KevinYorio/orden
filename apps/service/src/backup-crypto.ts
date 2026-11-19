import { createCipheriv,createDecipheriv,createHash,randomBytes,scryptSync } from 'node:crypto';
import { deflateSync,inflateSync } from 'node:zlib';

const magic=Buffer.from('ORDEN-BACKUP-V1\n','ascii'),maxExpanded=512_000_000;
export type BackupEncryption={algorithm:'AES-256-GCM';keyDerivation:'scrypt';version:1;salt:string;iv:string;tag:string};
export type BackupOriginal={hash:string;bytes:Buffer};
export function backupHash(bytes:Uint8Array){return createHash('sha256').update(bytes).digest('hex');}
function masterKey(value:string){if(!/^[a-f\d]{64}$/i.test(value))throw new Error('APP_BACKUP_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales aleatorios.');return Buffer.from(value,'hex');}
export function encryptBackupBundle(key:string,id:string,state:Buffer,originals:BackupOriginal[]){
 if(state.length>100_000_000||originals.length>10000)throw new Error('El respaldo excede los límites de empaquetado.');
 const normalized=originals.map(({hash,bytes})=>{if(!/^[a-f\d]{64}$/.test(hash)||backupHash(bytes)!==hash||bytes.length>10_000_000)throw new Error('Un original no coincide con su checksum o tamaño.');return {hash,bytes};});
 const meta={format:1,stateHash:backupHash(state),stateLength:state.length,originals:normalized.map(o=>({hash:o.hash,size:o.bytes.length}))},metaBytes=Buffer.from(JSON.stringify(meta)),header=Buffer.alloc(4);header.writeUInt32BE(metaBytes.length);
 const plain=Buffer.concat([magic,header,metaBytes,state,...normalized.map(o=>o.bytes)]),compressed=deflateSync(plain),salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',scryptSync(masterKey(key),salt,32),iv);cipher.setAAD(Buffer.from(id,'utf8'));const ciphertext=Buffer.concat([cipher.update(compressed),cipher.final()]);
 return {artifact:ciphertext,encryption:{algorithm:'AES-256-GCM' as const,keyDerivation:'scrypt' as const,version:1 as const,salt:salt.toString('hex'),iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex')}};
}
export function decryptBackupBundle(key:string,id:string,artifact:Buffer,encryption:BackupEncryption){
 if(artifact.length<16||artifact.length>maxExpanded)throw new Error('Paquete de respaldo cifrado fuera de límite.');
 if(encryption.algorithm!=='AES-256-GCM'||encryption.keyDerivation!=='scrypt'||encryption.version!==1||!/^[a-f\d]{32}$/.test(encryption.salt)||!/^[a-f\d]{24}$/.test(encryption.iv)||!/^[a-f\d]{32}$/.test(encryption.tag))throw new Error('Metadatos de cifrado de respaldo inválidos.');
 try{
  const decipher=createDecipheriv('aes-256-gcm',scryptSync(masterKey(key),Buffer.from(encryption.salt,'hex'),32),Buffer.from(encryption.iv,'hex'));decipher.setAAD(Buffer.from(id,'utf8'));decipher.setAuthTag(Buffer.from(encryption.tag,'hex'));const compressed=Buffer.concat([decipher.update(artifact),decipher.final()]),plain=inflateSync(compressed,{maxOutputLength:maxExpanded});
  if(plain.length<magic.length+4||!plain.subarray(0,magic.length).equals(magic))throw new Error();const metaLength=plain.readUInt32BE(magic.length),metaStart=magic.length+4,metaEnd=metaStart+metaLength;if(metaLength>1_000_000||metaEnd>plain.length)throw new Error();const meta=JSON.parse(plain.subarray(metaStart,metaEnd).toString('utf8')) as {format:number;stateHash:string;stateLength:number;originals:{hash:string;size:number}[]};
  if(meta.format!==1||!Number.isSafeInteger(meta.stateLength)||meta.stateLength<1||!/^[a-f\d]{64}$/.test(meta.stateHash)||!Array.isArray(meta.originals)||meta.originals.length>10000)throw new Error();let offset=metaEnd;const state=plain.subarray(offset,offset+meta.stateLength);offset+=meta.stateLength;if(state.length!==meta.stateLength||backupHash(state)!==meta.stateHash)throw new Error();const originals=new Map<string,Buffer>();
  for(const item of meta.originals){if(!/^[a-f\d]{64}$/.test(item.hash)||!Number.isSafeInteger(item.size)||item.size<1||item.size>10_000_000||originals.has(item.hash))throw new Error();const bytes=plain.subarray(offset,offset+item.size);offset+=item.size;if(bytes.length!==item.size||backupHash(bytes)!==item.hash)throw new Error();originals.set(item.hash,Buffer.from(bytes));}
  if(offset!==plain.length)throw new Error();return {state:Buffer.from(state),originals};
 }catch{throw new Error('No se pudo autenticar o leer el respaldo. Verificar clave e integridad.');}
}
