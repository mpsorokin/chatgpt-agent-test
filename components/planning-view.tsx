'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GanttChartSquare, Plus } from 'lucide-react';
import { addDays, dateKey, type Task, type Sprint } from '@/lib/model';
import { daysBetween, datesForView, estimateHours, parseDay, plannedTasks, validDay } from '@/lib/planning';
export interface PlanActions {
 tasks:Task[]; sprints:Sprint[]; 
 onPlan:(id:string,start:string,end:string,estimate:number,sprintId:string)=>void;
 openTask:(task:Task)=>void; createTask:()=>void; notify:(message:string)=>void;
}
// Controlled inputs write to the workspace immediately. This keeps Gantt in sync.
function PlanEditor({task,sprints,onPlan,notify}:Pick<PlanActions,'sprints'|'onPlan'|'notify'> & {task:Task}){
 const start=task.startDate||'',end=task.due||'',estimate=task.estimateHours||0,sprintId=task.sprintId||'';
 const update=(changes:Partial<{start:string;end:string;estimate:number;sprintId:string}>)=>{
  let nextStart=changes.start??start;
  let nextEnd=changes.end??end;
  // Preserve the field the user changed and repair a reversed date range.
  if(nextStart&&nextEnd&&nextStart>nextEnd){
   if(changes.end!==undefined)nextStart=''; // Earlier due date becomes a deadline milestone.
   else nextEnd=nextStart; // Moving start beyond due extends due to that day.
  }
  const nextEstimate=changes.estimate??estimate;
  if(!Number.isFinite(nextEstimate)||nextEstimate<0||nextEstimate>10000)return;
  onPlan(task.id,nextStart,nextEnd,nextEstimate,changes.sprintId??sprintId);
 };
 return <div className="pl-editor-row">
  <strong title={task.text}>{task.text}</strong>
  <label>Start<input aria-label={'Start date for '+task.text} type="date" value={start} onChange={e=>update({start:e.target.value})}/></label>
  <label>Due<input aria-label={'Due date for '+task.text} type="date" value={end} onChange={e=>update({end:e.target.value})}/></label>
  <label>Hours<input aria-label={'Estimate hours for '+task.text} type="number" min="0" max="10000" step=".5" value={estimate} onChange={e=>update({estimate:e.target.value===''?0:Number(e.target.value)})}/></label>
  <label>Sprint<select aria-label={'Sprint for '+task.text} value={sprintId} onChange={e=>update({sprintId:e.target.value})}><option value="">Backlog</option>{sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <span className="pl-autosaved" aria-label="Auto-saved" title="All changes save automatically">✓ Auto</span>
 </div>;
}
export function PlanningView({tasks,sprints,onPlan,openTask,createTask,notify}:PlanActions){
 const [from,setFrom]=useState(()=>dateKey(addDays(new Date(),-7)));
 const [horizon,setHorizon]=useState(42);
 const [query,setQuery]=useState('');
 const days=useMemo(()=>datesForView(from,horizon),[from,horizon]);
 const last=days[days.length-1],today=dateKey();
 const scheduledAll=plannedTasks(tasks);
 const scheduled=scheduledAll.filter(t=>t.due>=from&&t.timelineStart<=last&&t.text.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.timelineStart.localeCompare(b.timelineStart));
 // Focus newly created/edited deadlines even if their date falls outside the current window.
 const priorDeadlines=useRef<Map<string,string>|null>(null);
 useEffect(()=>{
  const current=new Map(tasks.map(t=>[t.id,t.due]));
  const previous=priorDeadlines.current;
  if(previous){
   const changed=tasks.find(t=>validDay(t.due)&&t.due!==previous.get(t.id));
   if(changed&&(changed.due<from||changed.due>last)){
    setFrom(dateKey(addDays(parseDay(changed.due),-7)));
   }
  }
  priorDeadlines.current=current;
 },[tasks,from,last]);
 const width=days.length*28;
 const colors=['#8c76f0','#39bfa8','#e6a650','#e775a5','#599ee1'];
 const projectColor=(name:string)=>colors[Math.max(0,tasks.findIndex(t=>t.project===name))%colors.length];
 const shift=(n:number)=>setFrom(dateKey(addDays(new Date(from+'T12:00:00'),n)));
 const jumpToNext=()=>{const due=scheduledAll.map(t=>t.due).sort();
  const next=due.find(d=>d>=today)||due[due.length-1];
  if(next)setFrom(dateKey(addDays(parseDay(next),-7)));
 };
 return <div className="pl-page"><section className="pl-hero"><div><span className="pl-kicker"><GanttChartSquare size={15}/> WORKLOAD & DELIVERY PLANNING</span><h2>Make the roadmap visible.</h2><p>Set a timeline, estimate effort, and turn ideas into scheduled work.</p></div><button className="pl-primary" onClick={createTask}><Plus size={16}/> New task</button></section>
 <div className="pl-stats"><article><small>Scheduled tasks</small><strong>{scheduledAll.length}</strong><span>All projects</span></article><article><small>Estimated effort</small><strong>{estimateHours(tasks).toFixed(1)}h</strong><span>Based on task estimates</span></article><article><small>Unscheduled</small><strong>{tasks.filter(t=>!validDay(t.due)).length}</strong><span>Missing a due date</span></article></div>
 <section className="surface pl-panel"><header className="pl-panel-head"><div><h3>Gantt timeline</h3><p>A due date alone creates a milestone. Changes save and appear immediately.</p></div><div className="pl-actions"><input aria-label="Search Gantt tasks" placeholder="Search timeline..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Gantt horizon" value={horizon} onChange={e=>setHorizon(Number(e.target.value))}><option value={28}>4 weeks</option><option value={42}>6 weeks</option><option value={56}>8 weeks</option></select><button onClick={()=>shift(-14)} aria-label="Previous 2 weeks"><ArrowLeft size={16}/></button><button onClick={()=>setFrom(dateKey(addDays(new Date(),-7)))}>Today</button><button disabled={!scheduledAll.length} onClick={jumpToNext}>Next due</button><button onClick={()=>shift(14)} aria-label="Next 2 weeks"><ArrowRight size={16}/></button></div></header>
 <div className="pl-scroll"><div className="pl-gantt" style={{width:220+width}}>
  <div className="pl-gantt-row pl-gantt-header"><div className="pl-gantt-label">TASK / PROJECT</div><div className="pl-grid-head" style={{width}}>{days.map((d,i)=><span key={d} className={d===today?'pl-day today':'pl-day'} title={d}>{i===0||d.slice(0,7)!==days[i-1].slice(0,7)?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short'})+' ':''}{new Date(d+'T12:00:00').getDate()}</span>)}</div></div>
  {scheduled.map(task=>{
   const startIdx=Math.max(0,daysBetween(from,task.timelineStart));
   const endIdx=Math.min(days.length-1,daysBetween(from,task.due));
   const left=startIdx*28+3,barWidth=Math.max(12,(endIdx-startIdx+1)*28-6);
   return <div className="pl-gantt-row" key={task.id}><button className="pl-gantt-label pl-task-label" onClick={()=>openTask(task)} title={task.text}><strong>{task.text}</strong><small>{task.project} · {task.estimateHours||0}h</small></button><div className="pl-track" style={{width}}>{days.includes(today)&&<span className="pl-today" style={{left:daysBetween(from,today)*28+13}}/>}<button className={'pl-bar'+(task.status==='done'?' is-done':'')+(task.deadlineOnly?' pl-milestone':'')} style={{left,width:barWidth,backgroundColor:projectColor(task.project)}} title={task.deadlineOnly?task.text+' / Deadline: '+task.due:task.text+' / '+task.timelineStart+' — '+task.due} onClick={()=>openTask(task)}>{task.deadlineOnly?'◆':barWidth>85?(task.status==='done'?'✓ ':'')+task.text:''}</button></div></div>;
  })}
  {!scheduled.length&&<div className="pl-empty">{scheduledAll.length?'No deadlines in this window. Use Next due to find the next scheduled task.':'No deadlines yet. Set a Due date below (Start is optional).'}</div>}
 </div></div><footer className="pl-panel-foot">{from} — {last} · {scheduled.length} visible · {scheduledAll.length} with deadlines · ◆ due-date milestone</footer></section>
 <section className="surface pl-panel"><header className="pl-panel-head"><div><h3>Task planning table</h3><p>Auto-save is on. Changing a due date immediately updates the Gantt timeline.</p></div><span className="pl-chip">{tasks.length} tasks</span></header><div className="pl-editors">{tasks.map(t=><PlanEditor key={t.id} task={t} sprints={sprints} onPlan={onPlan} notify={notify}/>)}{!tasks.length&&<p className="pl-empty">Create a task to begin planning.</p>}</div></section></div>;
}
