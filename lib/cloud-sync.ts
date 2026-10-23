import type { Workspace } from './model';
import type { TimeState } from './time-tracking';

export const serializeCloudState=(workspace:Workspace,time:TimeState):string=>
 JSON.stringify({workspace,time});

export const hasUnsavedCloudChanges=(workspace:Workspace,time:TimeState,baseline:string):boolean=>
 serializeCloudState(workspace,time)!==baseline;

export const cloudRetryDelay=(failures:number,initialMs=850):number=>
 initialMs*Math.pow(2,Math.min(5,Math.max(0,Math.floor(failures))));
