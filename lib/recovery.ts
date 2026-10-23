import type { Workspace } from './model';
import type { TimeState } from './time-tracking';
import { normalizeWorkspace } from './storage';
import { normalizeTimeState } from './time-tracking';

export interface RecoveryDraft {
 version:1;
 userId:string;
 revision:number;
 savedAt:number;
 workspace:Workspace;
 time:TimeState;
}
export const recoveryKey=(userId:string)=>'shipit:unsynced:v1:'+userId;
export function makeRecoveryDraft(userId:string,revision:number,workspace:Workspace,time:TimeState,now=Date.now()):RecoveryDraft{
 return {version:1,userId,revision,savedAt:now,workspace,time};
}
export function parseRecoveryDraft(raw:string|null,expectedUser:string):RecoveryDraft|null{
 if(!raw||raw.length>4*1024*1024)return null;
 try {
  const obj:unknown=JSON.parse(raw);
  if(!obj||typeof obj!=='object')return null;
  const x=obj as Record<string,unknown>;
  if(x.version!==1||x.userId!==expectedUser||typeof x.revision!=='number'||!Number.isSafeInteger(x.revision)||x.revision<0
  ||typeof x.savedAt!=='number'||!Number.isFinite(x.savedAt))return null;
  const workspace=normalizeWorkspace(x.workspace),time=normalizeTimeState(x.time);
  return workspace&&time?{version:1,userId:expectedUser,revision:x.revision,savedAt:x.savedAt,workspace,time}:null;
 }catch{return null;}
}
export function sameRecoveryContent(a:RecoveryDraft,workspace:Workspace,time:TimeState){
 return JSON.stringify({workspace:a.workspace,time:a.time})===JSON.stringify({workspace,time});
}
