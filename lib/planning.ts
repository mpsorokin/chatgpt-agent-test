import { addDays, dateKey, type Sprint, type Task } from './model';

export const dayMs = 86400000;
export function parseDay(iso:string):Date {
 return new Date(iso+'T12:00:00');
}
export function validDay(iso:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
 const d=parseDay(iso);
 return Number.isFinite(d.getTime())&&dateKey(d)===iso;
}
export const daysBetween=(start:string,end:string):number=>{
 if(!validDay(start)||!validDay(end))return 0;
 const a=parseDay(start),b=parseDay(end);
 return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/dayMs);
};
export function datesForView(start:string,days:number):string[]{
 return Array.from({length:days},(_,i)=>dateKey(addDays(parseDay(start),i)));
}
// Tasks with only a due date are valid one-day Gantt milestones.
// timelineStart is derived; the user's original startDate is never overwritten.
export type PlannedTask=Task & {timelineStart:string;due:string;deadlineOnly:boolean};
export function plannedTasks(tasks:Task[]):PlannedTask[]{
 return tasks.flatMap(t=>{
  if(!validDay(t.due))return [];
  const explicitStart=Boolean(t.startDate&&validDay(t.startDate)&&t.startDate<=t.due);
  return [{...t,timelineStart:explicitStart?t.startDate!:t.due,deadlineOnly:!explicitStart}];
 });
}
export const estimateHours=(tasks:Task[]):number=>tasks.reduce((sum,t)=>sum+(t.estimateHours||0),0);
export function sprintStats(sprint:Sprint,tasks:Task[]){
 const assigned=tasks.filter(t=>t.sprintId===sprint.id);
 const completed=assigned.filter(t=>t.status==='done');
 const assignedHours=estimateHours(assigned);
 const completedHours=estimateHours(completed);
 return {assigned,completed,remaining:assigned.length-completed.length,completionRate:assigned.length?Math.round(completed.length/assigned.length*100):0,assignedHours,completedHours,remainingHours:Math.max(0,assignedHours-completedHours)};
}
export function sprintBurndown(sprint:Sprint,tasks:Task[]){
 const {assigned}=sprintStats(sprint,tasks);
 const duration=daysBetween(sprint.start,sprint.end)+1;
 if(duration<1||duration>366)return [];
 const total=assigned.length;
 return datesForView(sprint.start,duration).map((date,index)=>{
  const completedByDate=assigned.filter(t=>t.status==='done'&&t.completedAt&&dateKey(new Date(t.completedAt))<=date).length;
  return {date,ideal:Math.max(0,total*(1-index/Math.max(duration-1,1))),remaining:total-completedByDate};
 });
}
export function weeklyThroughput(tasks:Task[],weeks=8){
 const today=parseDay(dateKey());
 return Array.from({length:weeks},(_,index)=>{
  const start=dateKey(addDays(today,-(weeks-1-index)*7-6));
  const end=dateKey(addDays(parseDay(start),6));
  return {start,end,done:tasks.filter(t=>t.status==='done'&&t.completedAt&&dateKey(new Date(t.completedAt))>=start&&dateKey(new Date(t.completedAt))<=end).length};
 });
}
export function deliveryMetrics(tasks:Task[]){
 const completed=tasks.filter(t=>t.status==='done');
 const dated=completed.filter(t=>t.completedAt&&Number.isFinite(t.completedAt)&&t.completedAt>=t.created);
 const avgLeadDays=dated.length?dated.reduce((acc,t)=>acc+((t.completedAt!-t.created)/dayMs),0)/dated.length:0;
 const overdue=tasks.filter(t=>t.status!=='done'&&t.due&&validDay(t.due)&&t.due<dateKey()).length;
 const estimated=estimateHours(tasks);
 const doneEstimates=estimateHours(completed);
 return {total:tasks.length,completed:completed.length,completionRate:tasks.length?Math.round(completed.length/tasks.length*100):0,avgLeadDays,overdue,estimated,doneEstimates};
}
export function sprintVelocity(sprints:Sprint[],tasks:Task[]){
 return [...sprints].sort((a,b)=>a.start.localeCompare(b.start)).map(s=>{
  const stat=sprintStats(s,tasks);
  return {id:s.id,name:s.name,status:s.status,planned:stat.assignedHours,completed:stat.completedHours,completedTasks:stat.completed.length};
 });
}
