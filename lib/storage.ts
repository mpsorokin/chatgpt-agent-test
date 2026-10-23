import { COLORS, DEFAULT_PROJECTS, LEGACY_KEYS, STORAGE_KEY, addDays, dateKey, uid, type Workspace, type Task, type Project, type Sprint } from './model';

const safeString = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const validDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const dt = new Date(v+'T12:00:00');
  return !Number.isNaN(dt.getTime()) && dateKey(dt) === v;
};
const obj = (v: unknown): Record<string,unknown> | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,unknown> : null;
export function normalizeTask(raw: unknown): Task | null {
  const t = obj(raw); if (!t) return null;
  const text = safeString(t.text,180); if (!text) return null;
  const status = ['todo','doing','done'].includes(String(t.status)) ? t.status as Task['status'] : t.done ? 'done' : 'todo';
  const subtasks = Array.isArray(t.subtasks) ? t.subtasks.slice(0,100).map(v=>{
    const st=obj(v); if(!st) return null;
    const title=safeString(st.text,140);
    return title ? {id:safeString(st.id,100)||uid(),text:title,done:!!st.done} : null;
  }).filter((v):v is NonNullable<typeof v>=>Boolean(v)) : [];
  const created = typeof t.created === 'number' && Number.isFinite(t.created) ? t.created : Date.now();
  return {
    id:safeString(t.id,100)||uid(), text,
    description:safeString(t.description ?? t.notes,2000),
    project:safeString(t.project ?? t.category,50)||'Work',
    priority:['high','medium','low'].includes(String(t.priority)) ? t.priority as Task['priority'] : 'medium',
    status,
    due:validDate(t.due)?t.due:'',
    created,
    completedAt:typeof t.completedAt==='number' && Number.isFinite(t.completedAt) ? t.completedAt : null,
    subtasks,
    startDate:validDate(t.startDate)?t.startDate:'',
    estimateHours:typeof t.estimateHours==='number'&&Number.isFinite(t.estimateHours)&&t.estimateHours>=0&&t.estimateHours<=10000?t.estimateHours:0,
    sprintId:safeString(t.sprintId,100),
  };
}
export function normalizeWorkspace(raw: unknown): Workspace | null {
  const data=obj(raw);
  const candidate=Array.isArray(raw) ? raw : data?.tasks;
  if(!Array.isArray(candidate)) return null;
  const tasks=candidate.slice(0,5000).map(normalizeTask).filter((t):t is Task=>Boolean(t));
  const uniqueTasks=new Map<string,Task>();
  for (const t of tasks) uniqueTasks.set(t.id,t);
  const projects: Project[] = DEFAULT_PROJECTS.map(p=>({...p}));
  if(Array.isArray(data?.projects)) for(const value of data.projects.slice(0,120)){
    const p=obj(value); if(!p) continue;
    const id=safeString(p.id,50);if(!id||projects.some(x=>x.id===id))continue;
    const color=typeof p.color==='string' && /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : COLORS[projects.length%COLORS.length];
    projects.push({id,color});
  }
  for(const t of uniqueTasks.values()) if(!projects.some(p=>p.id===t.project)) projects.push({id:t.project,color:COLORS[projects.length%COLORS.length]});
  const sprints:Sprint[]=[];
  if(Array.isArray(data?.sprints)) for(const rawSprint of data.sprints.slice(0,100)){
    const sp=obj(rawSprint);if(!sp)continue;
    const id=safeString(sp.id,100), name=safeString(sp.name,90);
    const start=validDate(sp.start)?sp.start:'',end=validDate(sp.end)?sp.end:'';
    if(!id||!name||!start||!end||start>end||sprints.some(x=>x.id===id))continue;
    sprints.push({id,name,goal:safeString(sp.goal,350),start,end,status:['planned','active','completed'].includes(String(sp.status))?sp.status as Sprint['status']:'planned'});
  }
  const validIds=new Set(sprints.map(x=>x.id));
  const migrated=[...uniqueTasks.values()].map(t=>({...t,sprintId:t.sprintId&&validIds.has(t.sprintId)?t.sprintId:''}));
  return {tasks:migrated,projects,sprints};
}
export function seedWorkspace(): Workspace {
  const now=Date.now();
  return {projects:DEFAULT_PROJECTS.map(p=>({...p})),sprints:[],tasks:[
    {id:uid(),text:'Define the big picture for your next project',description:'A great project starts with a clear outcome. What does success look like?',project:'Work',priority:'high',status:'doing',due:dateKey(),created:now-30000,completedAt:null,subtasks:[{id:uid(),text:'Write down the goal',done:true},{id:uid(),text:'Break it into milestones',done:false}]},
    {id:uid(),text:'Try moving a card across your board',description:'Drag a task into any column to update its status.',project:'Learning',priority:'medium',status:'todo',due:dateKey(addDays(new Date(),1)),created:now-20000,completedAt:null,subtasks:[]},
    {id:uid(),text:'Take a well-earned break',description:'Small wins compound. Remember to recharge.',project:'Personal',priority:'low',status:'todo',due:'',created:now-10000,completedAt:null,subtasks:[]},
  ]};
}
export function readWorkspace(storage: Pick<Storage,'getItem'>): {state:Workspace;source:string} {
  for(const key of [STORAGE_KEY,...LEGACY_KEYS]) {
    let raw:string|null;
    try {raw=storage.getItem(key);} catch {return {state:seedWorkspace(),source:'unavailable'};}
    if(raw===null) continue;
    try {const parsed=normalizeWorkspace(JSON.parse(raw));if(parsed)return {state:parsed,source:key};}
    catch { /* malformed JSON: avoid overwriting potentially recoverable data */ }
    return {state:seedWorkspace(),source:'invalid'};
  }
  return {state:seedWorkspace(),source:'fresh'};
}
export function writeWorkspace(storage: Pick<Storage,'setItem'>,value:Workspace): boolean {
  try{storage.setItem(STORAGE_KEY,JSON.stringify({version:4,updatedAt:Date.now(),...value}));return true;}catch{return false;}
}
