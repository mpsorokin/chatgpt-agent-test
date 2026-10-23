'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CalendarClock, CircleStop, Clock3, Download, Pause, Play, Plus, Timer, Trash2, TrendingUp } from 'lucide-react';
import { addDays, dateKey, type Project, type Task } from '@/lib/model';
import { betweenDates, clock, csvEntries, humanDuration, loggedMs, type ActiveTimer, type TimeEntry, type TimerTarget } from '@/lib/time-tracking';

export interface TimeTrackingProps {
 tasks:Task[];
 projects:Project[];
 entries:TimeEntry[];
 active:ActiveTimer|null;
 now:number;
 onStart:(target:TimerTarget)=>void;
 onStop:()=>void;
 onAdd:(target:TimerTarget,day:string,minutes:number)=>void;
 onDelete:(id:string)=>void;
 notify:(message:string)=>void;
}

const downloadFile = (name:string,content:string,mime:string)=>{
 const blob=new Blob([content],{type:mime});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1500);
};
const dayLabel=(day:string)=>new Date(day+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
const label=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);

export function TimeTrackingPanel({tasks,projects,entries,active,now,onStart,onStop,onAdd,onDelete,notify}:TimeTrackingProps){
 const [selectedTask,setSelectedTask]=useState('');
 const [customTitle,setCustomTitle]=useState('');
 const [project,setProject]=useState('Work');
 const [description,setDescription]=useState('');
 const [manualOpen,setManualOpen]=useState(false);
 const [manualDay,setManualDay]=useState(()=>dateKey());
 const [hours,setHours]=useState('0');
 const [minutes,setMinutes]=useState('30');
 const [range,setRange]=useState<'week'|'month'|'all'|'custom'>('week');
 const [customFrom,setCustomFrom]=useState(()=>dateKey(addDays(new Date(),-6)));
 const [customTo,setCustomTo]=useState(()=>dateKey());
 const [grouping,setGrouping]=useState<'project'|'task'>('project');

 const chosenTask=tasks.find(task=>task.id===selectedTask);
 const target:TimerTarget=chosenTask
  ?{taskId:chosenTask.id,taskTitle:chosenTask.text,project:chosenTask.project,description:description.trim()}
  :{taskId:null,taskTitle:customTitle.trim()||'General work',project,description:description.trim()};
 const today=dateKey();
 const startDate=range==='all'?'0000-01-01':range==='month'?today.slice(0,7)+'-01':range==='custom'?customFrom:dateKey(addDays(new Date(),-6));
 const endDate=range==='custom'?customTo:today;
 const reported=useMemo(()=>[...entries].filter(e=>betweenDates(e,startDate,endDate)).sort((a,b)=>b.startedAt-a.startedAt),[entries,startDate,endDate]);
 const totalMs=loggedMs(reported);
 const daysCovered=Math.max(1,Math.round((new Date(endDate+'T12:00:00').getTime()-new Date(startDate+'T12:00:00').getTime())/86400000)+1);
 const grouped=useMemo(()=>{
  const totals=new Map<string,number>();
  for(const entry of reported){
   const key=grouping==='project'?entry.project:entry.taskTitle;
   totals.set(key,(totals.get(key)||0)+entry.durationMs);
  }
  return [...totals.entries()].sort((a,b)=>b[1]-a[1]);
 },[reported,grouping]);
 const weeklyDays=Array.from({length:7},(_,i)=>dateKey(addDays(new Date(),i-6)));
 const weekTotals=weeklyDays.map(day=>loggedMs(entries.filter(e=>dateKey(new Date(e.startedAt))===day)));
 const maxDay=Math.max(...weekTotals,60000);
 const runningElapsed=active?Math.max(0,now-active.startedAt):0;
 const start=()=>{onStart(target);notify('Timer started');};
 const createManual=(e:React.FormEvent)=>{
  e.preventDefault();
  const mins=Number(hours)*60+Number(minutes);
  if(!Number.isFinite(mins)||mins<=0||mins>1440||new Date(manualDay+'T12:00:00').getTime()>Date.now()+86400000){
   notify('Choose a valid date and a duration between 1 minute and 24 hours');return;
  }
  onAdd(target,manualDay,mins);
  setManualOpen(false);setHours('0');setMinutes('30');notify('Time entry added');
 };
 const downloadCsv=()=>{downloadFile('ship-it-time-'+today+'.csv','\uFEFF'+csvEntries(reported),'text/csv;charset=utf-8');notify('CSV report downloaded');};
 return <div className="tt-page">
  <section className="tt-hero">
   <div className="tt-hero-title"><span className="tt-kicker"><Timer size={14}/> TIME TRACKING STUDIO</span><h2>Make every minute count<span>.</span></h2><p>Track real work, find your rhythm, and see where your time goes.</p></div>
   <div className={'tt-stopwatch '+(active?'tt-is-running':'')}><span>{active?'TRACKING RIGHT NOW':'READY WHEN YOU ARE'}</span><strong aria-live="off">{clock(runningElapsed)}</strong><small>{active?active.taskTitle:'Pick a task and hit start'}</small></div>
  </section>
  <section className="tt-control surface">
   <div className="tt-control-head"><div><h3>{active?'Current session':'Start a timer'}</h3><p>{active?'Your session continues even if you close this tab.':'Choose a task, or track general work without a task.'}</p></div><span className="tt-live"><i className={active?'active':''}/>{active?'Recording':'Not tracking'}</span></div>
   <div className="tt-fields">
    <label className="tt-field tt-task-field"><span>TASK</span><select value={selectedTask} onChange={e=>setSelectedTask(e.target.value)} disabled={!!active}><option value="">General / custom work</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.text} · {task.project}</option>)}</select></label>
    {!selectedTask&&<label className="tt-field"><span>ACTIVITY</span><input maxLength={180} value={customTitle} onChange={e=>setCustomTitle(e.target.value)} placeholder="e.g. Planning the sprint" disabled={!!active}/></label>}
    {!selectedTask&&<label className="tt-field tt-project-field"><span>PROJECT</span><select value={project} onChange={e=>setProject(e.target.value)} disabled={!!active}>{projects.map(p=><option key={p.id}>{p.id}</option>)}</select></label>}
    <label className="tt-field tt-description-field"><span>NOTES</span><input maxLength={300} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What are you working on?" disabled={!!active}/></label>
   </div>
   <div className="tt-control-actions">{active?<button type="button" className="tt-btn-stop" onClick={()=>{onStop();notify('Session saved to your time log');}}><CircleStop size={18}/> Stop & save session</button>:<button type="button" className="tt-btn-start" onClick={start}><Play size={17} fill="currentColor"/> Start tracking</button>}<button type="button" className="tt-btn-neutral" onClick={()=>setManualOpen(o=>!o)}><Plus size={17}/> Add time manually</button><span className="tt-control-note">⌁ Automatically saved in this browser</span></div>
  </section>
  {manualOpen&&<form className="tt-manual surface" onSubmit={createManual}><div><strong>Add a time entry</strong><p>Uses the task, project and notes selected above.</p></div><label>Date<input type="date" required value={manualDay} max={today} onChange={e=>setManualDay(e.target.value)}/></label><label>Hours<input type="number" min="0" max="24" required value={hours} onChange={e=>setHours(e.target.value)}/></label><label>Minutes<input type="number" min="0" max="59" required value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><button className="tt-btn-start" type="submit">Save entry</button><button type="button" className="tt-btn-neutral" onClick={()=>setManualOpen(false)}>Cancel</button></form>}
  <div className="tt-reports-top"><div><span className="tt-kicker">INSIGHTS & REPORTS</span><h2>Where your time went</h2></div><div className="tt-report-actions"><select aria-label="Report date range" value={range} onChange={e=>setRange(e.target.value as typeof range)}><option value="week">Last 7 days</option><option value="month">This month</option><option value="all">All time</option><option value="custom">Custom range</option></select><button type="button" onClick={downloadCsv}><Download size={16}/> Export CSV</button></div></div>
  {range==='custom'&&<div className="tt-custom-dates"><label>From<input type="date" value={customFrom} max={customTo} onChange={e=>setCustomFrom(e.target.value)}/></label><label>To<input type="date" value={customTo} min={customFrom} max={today} onChange={e=>setCustomTo(e.target.value)}/></label></div>}
  <div className="tt-metrics">
   <article className="surface tt-metric"><span><Clock3 size={16}/> TRACKED TIME</span><strong>{humanDuration(totalMs)}</strong><small>Saved sessions in selected range</small></article>
   <article className="surface tt-metric"><span><CalendarClock size={16}/> SESSIONS</span><strong>{reported.length}</strong><small>Completed time entries</small></article>
   <article className="surface tt-metric"><span><TrendingUp size={16}/> DAILY AVERAGE</span><strong>{range==='all'?humanDuration(reported.length?totalMs/Math.max(1,new Set(reported.map(e=>dateKey(new Date(e.startedAt)))).size):0):humanDuration(daysCovered>0?totalMs/daysCovered:0)}</strong><small>{range==='all'?'Across active days':'Across selected calendar days'}</small></article>
   <article className="surface tt-metric"><span><BarChart3 size={16}/> TOP PROJECT</span><strong className="tt-metric-project">{[...new Map(reported.reduce((acc,e)=>{acc.set(e.project,(acc.get(e.project)||0)+e.durationMs);return acc;},new Map<string,number>()))].sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}</strong><small>By recorded time</small></article>
  </div>
  <div className="tt-charts">
   <section className="surface tt-chart"><div className="tt-section-head"><div><h3>Activity over time</h3><p>Completed sessions · last 7 days</p></div><span className="tt-chart-total">{humanDuration(weekTotals.reduce((a,b)=>a+b,0))}</span></div>
    <div className="tt-bars">{weeklyDays.map((day,i)=><div className="tt-bar-day" key={day} title={dayLabel(day)+' · '+humanDuration(weekTotals[i])}><div className="tt-bar-track"><div className={'tt-bar-fill '+(weekTotals[i]?'':'tt-bar-empty')} style={{height:(weekTotals[i]?Math.max(6,weekTotals[i]/maxDay*100):2)+'%'}}/></div><small>{new Date(day+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}</small></div>)}</div>
   </section>
   <section className="surface tt-breakdown"><div className="tt-section-head"><div><h3>Time breakdown</h3><p>Top {grouping==='project'?'projects':'activities'} in selected range</p></div><select aria-label="Group report by" value={grouping} onChange={e=>setGrouping(e.target.value as typeof grouping)}><option value="project">Projects</option><option value="task">Activities</option></select></div>
    {grouped.length?<div className="tt-groups">{grouped.slice(0,7).map(([name,ms],i)=><div className="tt-group" key={name}><div className="tt-group-line"><span className="tt-project-swatch" style={{background:projects.find(p=>p.id===name)?.color||['#816df2','#30bca3','#f1ab59','#e677a3','#5b9edb'][i%5]}}/><strong title={name}>{name}</strong><em>{humanDuration(ms)}</em></div><div className="tt-group-rail"><div style={{width:(totalMs?ms/totalMs*100:0)+'%'}}/></div></div>)}</div>:<p className="tt-no-data">Start tracking to see your time distribution.</p>}
   </section>
  </div>
  <section className="surface tt-log"><div className="tt-section-head"><div><h3>Time entries</h3><p>Review and manage completed sessions</p></div><span className="tt-log-count">{reported.length} entries</span></div>
   {reported.length?<div className="tt-table-scroll"><table><thead><tr><th>Activity</th><th>Project</th><th>Date</th><th>Duration</th><th> </th></tr></thead><tbody>{reported.map(entry=><tr key={entry.id}><td><strong>{entry.taskTitle}</strong>{entry.description&&<small title={entry.description}>{entry.description}</small>}</td><td><span className="tt-project-cell">{entry.project}</span></td><td>{new Date(entry.startedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td><td className="tt-duration">{humanDuration(entry.durationMs)}</td><td><button type="button" className="tt-delete" aria-label={'Delete time entry for '+entry.taskTitle} title="Delete entry" onClick={()=>{if(window.confirm('Delete this time entry?')){onDelete(entry.id);notify('Time entry deleted')}}}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>:<div className="tt-empty"><Clock3 size={32}/><strong>Nothing tracked in this period</strong><p>Start the timer above or add a manual time entry to populate your reports.</p></div>}
  </section>
  <p className="tt-privacy">🔒 Time tracking is private and stored locally. There is no account, cloud sync or automatic billing. Focus Timer sessions do not count as tracked time unless you start a task timer.</p>
 </div>;
}
