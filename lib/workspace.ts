import { COLORS, priorityRank, uid, type Project, type Sprint, type Status, type Task, type TaskDraft, type Workspace } from './model';

export type Action =
  | {type:'replace';state:Workspace}
  | {type:'upsert';id?:string;draft:TaskDraft}
  | {type:'status';id:string;status:Status}
  | {type:'toggle';id:string}
  | {type:'delete';id:string}
  | {type:'clearDone'}
  | {type:'project';name:string}
  | {type:'projectDelete';name:string}
  | {type:'plan';id:string;startDate:string;due:string;estimateHours:number;sprintId:string}
  | {type:'sprintAdd';name:string;goal:string;start:string;end:string}
  | {type:'sprintUpdate';id:string;patch:Partial<Pick<Sprint,'name'|'goal'|'start'|'end'|'status'>>}
  | {type:'sprintDelete';id:string};

export function workspaceReducer(state:Workspace, action:Action):Workspace {
  switch(action.type){
    case 'replace': return action.state;
    case 'upsert': {
      const draft=action.draft;
      // Changing a due date in the task editor must not leave a reversed interval
      // that makes the task disappear from the Gantt chart.
      const startDate=draft.startDate && draft.due && draft.startDate>draft.due?'':draft.startDate;
      const cleanDraft={...draft,...(startDate!==undefined?{startDate}:{})};
      const project=state.projects.some(p=>p.id===draft.project)?draft.project:'Work';
      if(action.id) return {...state,tasks:state.tasks.map(t=>t.id===action.id?{...t,...cleanDraft,project,completedAt:draft.status==='done'?(t.completedAt??Date.now()):null}:t)};
      const task:Task={...cleanDraft,project,id:uid(),created:Date.now(),completedAt:draft.status==='done'?Date.now():null};
      return {...state,tasks:[task,...state.tasks]};
    }
    case 'status': return {...state,tasks:state.tasks.map(t=>t.id===action.id?{...t,status:action.status,completedAt:action.status==='done'?(t.completedAt??Date.now()):null}:t)};
    case 'toggle': return {...state,tasks:state.tasks.map(t=>t.id===action.id?{...t,status:t.status==='done'?'todo':'done',completedAt:t.status==='done'?null:Date.now()}:t)};
    case 'delete': return {...state,tasks:state.tasks.filter(t=>t.id!==action.id)};
    case 'clearDone': return {...state,tasks:state.tasks.filter(t=>t.status!=='done')};
    case 'project': {
      const name=action.name.trim().slice(0,50);
      if(!name||state.projects.some(p=>p.id.toLowerCase()===name.toLowerCase())||state.projects.length>=100)return state;
      const p:Project={id:name,color:COLORS[state.projects.length%COLORS.length]};
      return {...state,projects:[...state.projects,p]};
    }
    case 'plan': {
      const t=state.tasks.find(task=>task.id===action.id);
      if(!t || action.startDate&&action.due&&action.startDate>action.due)return state;
      const dates=/^\d{4}-\d{2}-\d{2}$/;
      if((action.startDate&&!dates.test(action.startDate))||(action.due&&!dates.test(action.due)))return state;
      if(!Number.isFinite(action.estimateHours)||action.estimateHours<0||action.estimateHours>10000)return state;
      const sprintId=(state.sprints??[]).some(s=>s.id===action.sprintId)?action.sprintId:'';
      return {...state,tasks:state.tasks.map(task=>task.id===action.id?{...task,startDate:action.startDate,due:action.due,estimateHours:action.estimateHours,sprintId}:task)};
    }
    case 'sprintAdd': {
      const name=action.name.trim().slice(0,90), sprints=state.sprints??[];
      if(!name||!action.start||!action.end||action.start>action.end||sprints.length>=100)return state;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(action.start)||!/^\d{4}-\d{2}-\d{2}$/.test(action.end))return state;
      const sprint:Sprint={id:uid(),name,goal:action.goal.trim().slice(0,350),start:action.start,end:action.end,status:'planned'};
      return {...state,sprints:[...sprints,sprint]};
    }
    case 'sprintUpdate': {
      const sprint=state.sprints?.find(s=>s.id===action.id);if(!sprint)return state;
      const patch={...action.patch};
      if(patch.start&&patch.end&&patch.start>patch.end)return state;
      const edited={...sprint,...patch};
      if(!edited.name.trim()||edited.start>edited.end)return state;
      return {...state,sprints:(state.sprints??[]).map(s=>s.id===action.id?edited:s)};
    }
    case 'sprintDelete': return {...state,sprints:(state.sprints??[]).filter(s=>s.id!==action.id),tasks:state.tasks.map(t=>t.sprintId===action.id?{...t,sprintId:''}:t)};
    case 'projectDelete': {
      if(['Work','Personal','Learning'].includes(action.name))return state;
      return {...state,projects:state.projects.filter(p=>p.id!==action.name),tasks:state.tasks.map(t=>t.project===action.name?{...t,project:'Work'}:t)};
    }
  }
}
export function sortTasks(tasks:Task[],sort:'priority'|'recent'|'due'|'alpha'='priority'):Task[]{
  return [...tasks].sort((a,b)=>{
    if(sort==='recent')return b.created-a.created;
    if(sort==='due')return (a.due||'9999').localeCompare(b.due||'9999') || priorityRank[a.priority]-priorityRank[b.priority];
    if(sort==='alpha')return a.text.localeCompare(b.text);
    return Number(a.status==='done')-Number(b.status==='done') || priorityRank[a.priority]-priorityRank[b.priority] || (a.due||'9999').localeCompare(b.due||'9999') || b.created-a.created;
  });
}
