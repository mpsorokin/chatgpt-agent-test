'use client';
import { useState, type FormEvent } from 'react';
import { CheckCircle2, Flag, Plus, Trash2 } from 'lucide-react';
import { addDays, dateKey, type Sprint, type Task } from '@/lib/model';
import { sprintBurndown, sprintStats, validDay } from '@/lib/planning';
export interface SprintsProps {
 tasks:Task[]; sprints:Sprint[];
 onSprintAdd:(name:string,goal:string,start:string,end:string)=>void;
 onSprintEdit:(id:string,patch:Partial<Sprint>)=>void;
 onSprintDelete:(id:string)=>void;
 onPlan:(id:string,start:string,end:string,estimate:number,sprintId:string)=>void;
 openTask:(task:Task)=>void; createTask:()=>void;notify:(message:string)=>void;
}
function Burndown({sprint,tasks}:{sprint:Sprint;tasks:Task[]}){
 const data=sprintBurndown(sprint,tasks),length=data.length;
 if(length<2)return <p className="pl-empty">Sprint date range is too short for a chart.</p>;
 const max=Math.max(1,...data.map(x=>x.remaining));
 const points=(key:'ideal'|'remaining')=>data.map((x,i)=>(20+i*560/(length-1))+','+(135-x[key]/max*115)).join(' ');
 return <div className="pl-burndown"><svg role="img" aria-label="Sprint burndown showing ideal and actual remaining tasks" viewBox="0 0 600 155"><line x1="20" y1="135" x2="580" y2="135" stroke="currentColor" strokeOpacity=".15"/><polyline points={points('ideal')} fill="none" stroke="#a3a8b9" strokeDasharray="6 5" strokeWidth="2.7"/><polyline points={points('remaining')} fill="none" stroke="#8973ee" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="pl-legend"><span><i className="pl-actual"/> Actual</span><span><i className="pl-ideal"/> Ideal</span></div></div>;
}
export function SprintsView({tasks,sprints,onSprintAdd,onSprintEdit,onSprintDelete,onPlan,openTask,createTask,notify}:SprintsProps){
 const [name,setName]=useState('');
 const [goal,setGoal]=useState('');
 const [start,setStart]=useState(()=>dateKey());
 const [end,setEnd]=useState(()=>dateKey(addDays(new Date(),13)));
 const [selected,setSelected]=useState('');
 const sprint=sprints.find(s=>s.id===selected)||sprints.find(s=>s.status==='active')||[...sprints].sort((a,b)=>b.start.localeCompare(a.start))[0];
 const stats=sprint?sprintStats(sprint,tasks):null;
 const backlog=tasks.filter(t=>!t.sprintId);
 const submit=(event:FormEvent)=>{event.preventDefault();if(!validDay(start)||!validDay(end)||start>end){notify('Sprint dates are invalid');return;}onSprintAdd(name,goal,start,end);setName('');setGoal('');notify('Sprint created');};
 return <div className="pl-page"><section className="pl-hero"><div><span className="pl-kicker"><Flag size={14}/> AGILE PLANNING</span><h2>Deliver one sprint at a time.</h2><p>Create iterations, commit backlog items and measure progress against your sprint goal.</p></div></section>
 <section className="surface pl-panel"><header className="pl-panel-head"><div><h3>Create a sprint</h3><p>Choose a clear goal and fixed dates for the iteration.</p></div></header><form className="pl-create" onSubmit={submit}><label>Sprint name<input required maxLength={90} placeholder="Sprint 1 · Release" value={name} onChange={e=>setName(e.target.value)}/></label><label>Goal<input maxLength={350} placeholder="Outcome for this sprint" value={goal} onChange={e=>setGoal(e.target.value)}/></label><label>Start<input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>End<input type="date" required value={end} onChange={e=>setEnd(e.target.value)}/></label><button className="pl-primary" type="submit"><Plus size={16}/> Create sprint</button></form></section>
 {sprints.length>0?<><div className="pl-sprint-tabs">{[...sprints].sort((a,b)=>b.start.localeCompare(a.start)).map(s=><button key={s.id} className={sprint?.id===s.id?'selected':''} onClick={()=>setSelected(s.id)}><i className={'pl-sprint-status '+s.status}/>{s.name}<small>{s.status}</small></button>)}</div>
 {sprint&&stats&&<section className="surface pl-panel"><header className="pl-panel-head"><div><span className="pl-kicker">{sprint.status.toUpperCase()}</span><h3>{sprint.name}</h3><p>{sprint.goal||'No goal defined yet'} · {sprint.start} → {sprint.end}</p></div><div className="pl-actions">{sprint.status==='planned'&&<button onClick={()=>onSprintEdit(sprint.id,{status:'active'})}>Start sprint</button>}{sprint.status==='active'&&<button onClick={()=>onSprintEdit(sprint.id,{status:'completed'})}><CheckCircle2 size={16}/> Complete sprint</button>}{sprint.status==='completed'&&<button onClick={()=>onSprintEdit(sprint.id,{status:'active'})}>Reopen</button>}<button aria-label="Delete sprint" title="Delete sprint" className="pl-danger" onClick={()=>{if(window.confirm('Delete this sprint? Tasks will return to the backlog.'))onSprintDelete(sprint.id)}}><Trash2 size={16}/></button></div></header>
 <div className="pl-stats"><article><small>Committed</small><strong>{stats.assigned.length}</strong><span>Tasks in sprint</span></article><article><small>Completed</small><strong>{stats.completionRate}%</strong><span>{stats.completed.length} of {stats.assigned.length} tasks</span></article><article><small>Estimated effort</small><strong>{stats.assignedHours.toFixed(1)}h</strong><span>{stats.remainingHours.toFixed(1)}h remaining</span></article></div>
 <div className="pl-sprint-detail"><div><h4>Committed work <small>({stats.assigned.length})</small></h4>{stats.assigned.length?stats.assigned.map(task=><div className="pl-sprint-task" key={task.id}><button onClick={()=>openTask(task)} title="Edit task"><strong>{task.text}</strong><small>{task.status} · {task.estimateHours||0}h</small></button><button onClick={()=>onPlan(task.id,task.startDate||'',task.due,task.estimateHours||0,'')}>Remove</button></div>):<p className="pl-empty">Assign tasks from the backlog.</p>}</div><div><h4>Burndown <small>(tasks remaining)</small></h4><Burndown sprint={sprint} tasks={tasks}/></div></div></section>}
 {sprint&&<section className="surface pl-panel"><header className="pl-panel-head"><div><h3>Unassigned backlog</h3><p>Select tasks to bring into {sprint.name}.</p></div><button className="pl-secondary" onClick={createTask}><Plus size={15}/> New task</button></header><div className="pl-backlog">{backlog.length?backlog.map(t=><div key={t.id}><span>{t.text}</span><small>{t.project} · {t.estimateHours||0}h</small><button onClick={()=>onPlan(t.id,t.startDate||'',t.due,t.estimateHours||0,sprint.id)}>Add to sprint →</button></div>):<p className="pl-empty">Every task is already assigned to a sprint.</p>}</div></section>}</>:<section className="surface pl-panel pl-empty"><h3>No sprints yet</h3><p>Use the form above to create your first sprint.</p></section>}
 </div>;
}
