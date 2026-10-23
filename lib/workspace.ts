import { COLORS, priorityRank, uid, type Project, type Status, type Task, type TaskDraft, type Workspace } from './model';

export type Action =
  | {type:'replace';state:Workspace}
  | {type:'upsert';id?:string;draft:TaskDraft}
  | {type:'status';id:string;status:Status}
  | {type:'toggle';id:string}
  | {type:'delete';id:string}
  | {type:'clearDone'}
  | {type:'project';name:string}
  | {type:'projectDelete';name:string};

export function workspaceReducer(state:Workspace, action:Action):Workspace {
  switch(action.type){
    case 'replace': return action.state;
    case 'upsert': {
      const draft=action.draft;
      const project=state.projects.some(p=>p.id===draft.project)?draft.project:'Work';
      if(action.id) return {...state,tasks:state.tasks.map(t=>t.id===action.id?{...t,...draft,project,completedAt:draft.status==='done'?(t.completedAt??Date.now()):null}:t)};
      const task:Task={...draft,project,id:uid(),created:Date.now(),completedAt:draft.status==='done'?Date.now():null};
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
