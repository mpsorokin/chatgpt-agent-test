import { dateKey, uid, type Task } from './model';

export const TIME_STORAGE_KEY = 'ship-it:time:v1';

export interface TimerTarget {
 taskId:string|null;
 taskTitle:string;
 project:string;
 description:string;
}
export interface ActiveTimer extends TimerTarget { startedAt:number; }
export interface TimeEntry extends TimerTarget {
 id:string;
 startedAt:number;
 endedAt:number;
 durationMs:number;
}
export interface TimeState { entries:TimeEntry[]; active:ActiveTimer|null; }
export const emptyTimeState = ():TimeState => ({entries:[],active:null});
const string = (input:unknown,max:number) => typeof input==='string'?input.trim().slice(0,max):'';
const object = (value:unknown):Record<string,unknown>|null => value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const finite = (x:unknown):x is number => typeof x==='number'&&Number.isFinite(x);
const validMs = (x:unknown):x is number => finite(x)&&x>0&&x<4102444800000;
export const targetFromTask = (task:Task):TimerTarget => ({
 taskId:task.id,taskTitle:task.text,project:task.project,description:''
});
export function normalizeTimeState(raw:unknown):TimeState|null {
 const data=object(raw);if(!data||!Array.isArray(data.entries))return null;
 const ids=new Set<string>();
 const entries:TimeEntry[]=[];
 for(const value of data.entries.slice(0,10000)){
  const item=object(value);if(!item||!validMs(item.startedAt)||!validMs(item.endedAt))continue;
  const durationMs=item.endedAt-item.startedAt;
  if(durationMs<=0||durationMs>30*24*3600000)continue;
  const id=string(item.id,100)||uid();
  if(ids.has(id))continue;ids.add(id);
  entries.push({
   id,taskId:string(item.taskId,100)||null,taskTitle:string(item.taskTitle,180)||'Untitled task',
   project:string(item.project,50)||'Work',description:string(item.description,300),
   startedAt:item.startedAt,endedAt:item.endedAt,durationMs
  });
 }
 const rawActive=object(data.active);
 const active:ActiveTimer|null=rawActive&&validMs(rawActive.startedAt)&&rawActive.startedAt<=Date.now()+60000
  ?{taskId:string(rawActive.taskId,100)||null,taskTitle:string(rawActive.taskTitle,180)||'Untitled task',
    project:string(rawActive.project,50)||'Work',description:string(rawActive.description,300),startedAt:rawActive.startedAt}
  :null;
 return {entries,active};
}
export function startTimer(state:TimeState,target:TimerTarget,now:number):TimeState {
 if(!validMs(now))return state;
 const stopped=state.active?stopTimer(state,now):state;
 return {...stopped,active:{...target,startedAt:now}};
}
export function stopTimer(state:TimeState,now:number):TimeState {
 const active=state.active;if(!active)return state;
 const endedAt=Math.max(now,active.startedAt+1000);
 if(!validMs(endedAt))return state;
 const entry:TimeEntry={...active,id:uid(),endedAt,durationMs:endedAt-active.startedAt};
 return {active:null,entries:[entry,...state.entries].slice(0,10000)};
}
export function addManualEntry(state:TimeState,target:TimerTarget,day:string,durationMinutes:number):TimeState {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!finite(durationMinutes)||durationMinutes<=0||durationMinutes>1440)return state;
 const date=new Date(day+'T12:00:00');
 if(Number.isNaN(date.getTime())||dateKey(date)!==day)return state;
 const startedAt=date.getTime();
 const durationMs=Math.round(durationMinutes*60000);
 const entry:TimeEntry={...target,id:uid(),startedAt,endedAt:startedAt+durationMs,durationMs};
 return {...state,entries:[entry,...state.entries].slice(0,10000)};
}
export function deleteTimeEntry(state:TimeState,id:string):TimeState{
 return {...state,entries:state.entries.filter(entry=>entry.id!==id)};
}
export const loggedMs = (entries:TimeEntry[])=>entries.reduce((sum,e)=>sum+e.durationMs,0);
export function clock(ms:number):string{
 const sec=Math.max(0,Math.floor(ms/1000));
 return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(x=>String(x).padStart(2,'0')).join(':');
}
export function humanDuration(ms:number):string{
 const mins=Math.floor(Math.max(ms,0)/60000),hours=Math.floor(mins/60);
 return hours?hours+'h '+String(mins%60).padStart(2,'0')+'m':mins?mins+'m':ms>0?'<1m':'0m';
}
export function betweenDates(entry:TimeEntry,from:string,to:string):boolean{
 const key=dateKey(new Date(entry.startedAt));
 return key>=from&&key<=to;
}
export function csvEntries(entries:TimeEntry[]):string{
 const esc=(v:string|number)=>'"'+String(v).replace(/"/g,'""')+'"';
 return [
 ['Task','Project','Description','Start (local)','End (local)','Duration (hours)','Duration (minutes)'].map(esc).join(','),
 ...entries.map(e=>[e.taskTitle,e.project,e.description,new Date(e.startedAt).toLocaleString(),new Date(e.endedAt).toLocaleString(),(e.durationMs/3600000).toFixed(3),(e.durationMs/60000).toFixed(2)].map(esc).join(','))
 ].join('\r\n');
}
