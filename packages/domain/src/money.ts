import type { Currency } from './types.js';
export function parseMoney(raw:string,allowSmall=false):{amount:number|null;currency:Currency;ambiguous:boolean}{
 const currency:Currency=/\busd\b|u\$s|dolares/i.test(raw)?'USD':'ARS',m=raw.match(/(?:\b(?:ars|usd)\b\s*|u\$s\s*|\$\s*)?(\d[\d.,]*)(?:\s*(mil|k|millones?|millon))?/i);
 if(!m)return {amount:null,currency,ambiguous:false};let n=m[1],ambiguous=false;
 if(n.includes(',')&&n.includes('.')){if(!/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(n))ambiguous=true;n=n.replaceAll('.','').replace(',','.');}
 else if(n.includes(',')){if(!/^\d+,\d{1,2}$/.test(n))ambiguous=true;n=n.replace(',','.');}
 else if(n.includes('.')){if(/^\d{1,3}(\.\d{3})+$/.test(n))n=n.replaceAll('.','');else ambiguous=true;}
 const [whole,dec='']=n.split('.'),scale=m[2]?.startsWith('millon')?1000000:m[2]?1000:1,amount=(Number(whole)*100+Number(dec.padEnd(2,'0')))*scale;
 if(!Number.isSafeInteger(amount)||amount<=0||amount>9000000000000)throw new Error('Importe fuera de rango.');
 if(!allowSmall&&currency==='ARS'&&!m[2]&&!/[.,$]|\bars\b/i.test(m[0])&&amount<100000)ambiguous=true;
 return {amount,currency,ambiguous};
}
export function money(n:number|null,currency:Currency){return n===null?`${currency} importe sin informar`:`${currency} ${new Intl.NumberFormat('es-AR',{minimumFractionDigits:n%100?2:0,maximumFractionDigits:2}).format(n/100)}`;}
export function installments(total:number,count:number):number[]{if(!Number.isSafeInteger(total)||total<=0||!Number.isInteger(count)||count<1||count>120)throw new Error('Cuotas inválidas.');const base=Math.floor(total/count),rest=total%count;return Array.from({length:count},(_,i)=>base+(i<rest?1:0));}
