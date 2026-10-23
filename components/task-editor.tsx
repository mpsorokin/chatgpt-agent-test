'use client';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, Plus, Trash2, X } from 'lucide-react';
import { uid, type Priority, type Project, type Status, type Subtask, type Task, type TaskDraft } from '@/lib/model';

interface Props { open:boolean; task:Task|null; projects:Project[]; onClose:()=>void; onSave:(draft:TaskDraft,id?:string)=>void; onDelete:(id:string)=>void }
const initial=(project:string):TaskDraft=>({text:'',description:'',project,priority:'medium',status:'todo',due:'',subtasks:[]});
export function TaskEditor({open,task,projects,onClose,onSave,onDelete}:Props){
 const ref=useRef<HTMLDialogElement>(null);
 const [draft,setDraft]=useState<TaskDraft>(()=>initial('Work'));
 const [newSubtask,setNewSubtask]=useState('');
 useEffect(()=>{setDraft(task?{text:task.text,description:task.description,project:task.project,priority:task.priority,status:task.status,due:task.due,subtasks:task.subtasks.map(s=>({...s}))}:initial(projects[0]?.id||'Work'));setNewSubtask('');},[open,task,projects]);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
 function update<K extends keyof TaskDraft>(key:K,value:TaskDraft[K]){setDraft(s=>({...s,[key]:value}));}
 function addSub(){const text=newSubtask.trim();if(!text)return;update('subtasks',[...draft.subtasks,{id:uid(),text:text.slice(0,140),done:false}]);setNewSubtask('');}
 return <dialog ref={ref} className="task-dialog" onClose={onClose} onClick={e=>{if(e.target===ref.current)onClose()}} aria-labelledby="editor-title">
   <div className="dialog-top"><div><span className="eyebrow">YOUR WORKSPACE / TASK</span><h2 id="editor-title">{task?'Edit task':'Create something great'}</h2></div><button className="icon-button" aria-label="Close editor" onClick={onClose}><X size={19}/></button></div>
   <form onSubmit={e=>{e.preventDefault();if(!draft.text.trim())return;onSave({...draft,text:draft.text.trim()},task?.id);onClose()}}>
     <div className="dialog-body">
       <label className="form-field">Task name <input required autoFocus maxLength={180} placeholder="What needs to get done?" value={draft.text} onChange={e=>update('text',e.target.value)}/></label>
       <label className="form-field">Description <textarea rows={3} maxLength={2000} placeholder="Context, links, or notes..." value={draft.description} onChange={e=>update('description',e.target.value)}/></label>
       <div className="form-two">
         <label className="form-field">Project <select value={draft.project} onChange={e=>update('project',e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.id}</option>)}</select></label>
         <label className="form-field">Priority <select value={draft.priority} onChange={e=>update('priority',e.target.value as Priority)}><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label>
         <label className="form-field">Status <select value={draft.status} onChange={e=>update('status',e.target.value as Status)}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Completed</option></select></label>
         <label className="form-field">Due date <input type="date" value={draft.due} onChange={e=>update('due',e.target.value)}/></label>
       </div>
       <div className="subtask-section"><div className="sub-head"><strong>Checklist</strong><span>{draft.subtasks.filter(s=>s.done).length}/{draft.subtasks.length} complete</span></div>
       {draft.subtasks.map(sub=><div key={sub.id} className="sub-row"><button type="button" aria-label={sub.done?'Mark checklist item incomplete':'Complete checklist item'} className={'check-toggle '+(sub.done?'checked':'')} onClick={()=>update('subtasks',draft.subtasks.map(s=>s.id===sub.id?{...s,done:!s.done}:s))}>{sub.done&&<Check size={12}/>}</button><span className={sub.done?'struck':''}>{sub.text}</span><button type="button" className="sub-remove" aria-label={'Remove '+sub.text} onClick={()=>update('subtasks',draft.subtasks.filter(s=>s.id!==sub.id))}><X size={15}/></button></div>)}
       <div className="sub-add"><input placeholder="Add a checklist item..." maxLength={140} value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSub()}}}/><button type="button" onClick={addSub} aria-label="Add checklist item"><Plus size={18}/></button></div></div>
     </div>
     <div className="dialog-footer">{task?<button className="danger-text" type="button" onClick={()=>{if(window.confirm('Delete this task?')){onDelete(task.id);onClose()}}}><Trash2 size={16}/> Delete</button>:<span className="muted"><CalendarDays size={14}/> Make space for what matters.</span>}<div className="dialog-actions"><button type="button" className="btn-quiet" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit"><Check size={16}/>{task?'Save changes':'Create task'}</button></div></div>
   </form>
 </dialog>
}
