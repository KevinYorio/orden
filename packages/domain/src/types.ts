export type Person = 'kevin' | 'luisina';
export type Currency = 'ARS' | 'USD';
export type Kind = 'task' | 'appointment' | 'bill' | 'expense' | 'income' | 'transfer' | 'card_purchase' | 'card_statement' | 'adjustment' | 'goal' | 'allocation' | 'budget' | 'shopping' | 'query' | 'recurrence';
export type RuntimeMode = 'railway_active' | 'handoff_to_local' | 'local_ready_remote_stopped' | 'local_active' | 'recovery_only' | 'recovery_required';
export interface Item {
 id:string; kind:Kind; title:string; status:'active'|'resolved'|'cancelled'; version:number;
 createdAt:string; occurredAt:string; reportedBy:Person; performedBy?:Person|'both'; assignees:Person[];
 currency:Currency; amount:number|null; due?:string; dateOnly?:boolean; explicitTime?:boolean;
 resolvedAt?:string; snoozedUntil?:string; category:string; accountId?:string; destinationAccountId?:string;
 location?:string; paymentUrl?:string; period?:string; reference?:string; parentId?:string; data:Record<string,any>;
}
export interface AttachmentRef {id:string;name:string;mime:string;size:number;targetId?:string;purpose?:string;}
export interface Incoming {id:string;groupId:string;author:Person;senderId?:string;at:string;text:string;event?:'new'|'edit'|'delete';quotedId?:string;attachment?:AttachmentRef;}
export interface Draft {id:string;author:Person;messageId:string;at:string;payload:Record<string,any>;question:string;followups:number;status:string;}
export interface RuntimeState {mode:RuntimeMode;owner:'local'|'railway'|null;generation:number;localRequested:boolean;reason?:string;cycle?:string;}
export interface Intent {type:string;title?:string;amount?:number|null;currency?:Currency;target?:string;due?:string;dateOnly?:boolean;explicitTime?:boolean;assignees?:Person[];performedBy?:Person|'both';missing?:string[];data?:Record<string,any>;}
export const PEOPLE:Person[]=['kevin','luisina'];
export const prefixes:Record<Kind,string>={task:'T',appointment:'T',bill:'F',expense:'G',income:'I',transfer:'X',card_purchase:'C',card_statement:'R',adjustment:'J',goal:'M',allocation:'A',budget:'P',shopping:'L',query:'Q',recurrence:'U'};
