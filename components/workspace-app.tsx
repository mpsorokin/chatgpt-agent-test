'use client';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Bell, CalendarDays, Check, ChevronDown, Command, Download, FileJson, Filter, Github, Grip, Inbox, KanbanSquare, LayoutDashboard, ListTodo, Menu, Moon, Plus, Search, Settings2, Sparkles, Sun, Upload, X } from 'lucide-react';
import { COLORS, dateKey, type Project, type Task, type TaskDraft, type View, type Workspace, type Status } from '@/lib/model';
import { normalizeWorkspace, readWorkspace, writeWorkspace } from '@/lib/storage';
import { sortTasks, workspaceReducer } from '@/lib/workspace';
import { TaskEditor } from './task-editor';
import { BoardView, CalendarView, DashboardView, InsightsView, ListView } from './views';

const VIEWS:[View,string,typeof LayoutDashboard][] = [
 ['dashboard','Dashboard',LayoutDashboard],['board','Kanban board',KanbanSquare],['list','All tasks',ListTodo],['calendar','Calendar',CalendarDays],['insights','Insights',BarChart3]
];
function usePersistentWorkspace(){
 const [state,dispatch]=useReducer(workspaceReducer,{tasks:[],projects:[]});
 const [ready,setReady]=useState(false);
 const [storageWarning,setStorageWarning]=useState('');
 useEffect(()=>{
   const result=readWorkspace(window.localStorage);
   dispatch({type:'replace',state:result.state});
   if(result.source==='invalid')setStorageWarning('An earlier save could not be read. Export a backup before making more changes.');
   if(result.source==='unavailable')setStorageWarning('Browser storage is unavailable. Export tasks to keep a backup.');
   setReady(true);
 },[]);
 useEffect(()=>{if(ready && !writeWorkspace(window.localStorage,state))setStorageWarning('Changes could not be saved locally. Please export your tasks.');},[ready,state]);
 return {state,dispatch,ready,storageWarning};
}
function timeGreeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
function formatToday(){return new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});}
function useTheme(){
 const [theme,setTheme]=useState<'light'|'dark'>('light');
 useEffect(()=>{try{const saved=localStorage.getItem('ship-it:theme:v4')||localStorage.getItem('chatgpt-agent-test:theme');if(saved==='dark')setTheme('dark');}catch{}},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('ship-it:theme:v4',theme)}catch{}},[theme]);
 return {theme,setTheme};
}
export default function WorkspaceApp(){
 const {state,dispatch,ready,storageWarning}=usePersistentWorkspace();
 const {theme,setTheme}=useTheme();
 const [view,setView]=useState<View>('dashboard');
 const [project,setProject]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [sort,setSort]=useState<'priority'|'recent'|'due'|'alpha'>('priority');
 const [editing,setEditing]=useState<Task|null>(null);
 const [editorOpen,setEditorOpen]=useState(false);
 const [commandOpen,setCommandOpen]=useState(false);
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [toast,setToast]=useState('');
 const toastRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const fileRef=useRef<HTMLInputElement>(null);
 const commandInputRef=useRef<HTMLInputElement>(null);
 const [commandSearch,setCommandSearch]=useState('');
 const notify=useCallback((text:string)=>{setToast(text);if(toastRef.current)clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(''),4000);},[]);
 useEffect(()=>()=>{if(toastRef.current)clearTimeout(toastRef.current)},[]);
 const all=state.tasks;
 const filtered=useMemo(()=>all.filter(t=>(!project||t.project===project)&&(!search||`${t.text} ${t.description} ${t.project}`.toLowerCase().includes(search.toLowerCase()))),[all,project,search]);
 const openTask=useCallback((t:Task)=>{setEditing(t);setEditorOpen(true)},[]);
 const createTask=useCallback(()=>{setEditing(null);setEditorOpen(true)},[]);
 const chooseView=(v:View)=>{setView(v);setSidebarOpen(false);setCommandOpen(false)};
 const saveTask=(draft:TaskDraft,id?:string)=>{dispatch({type:'upsert',draft,id});notify(id?'Changes saved':'Task created');};
 const toggleTask=(id:string)=>{dispatch({type:'toggle',id})};
 const updateStatus=(id:string,status:Status)=>{dispatch({type:'status',id,status});notify('Task moved to '+({todo:'To do',doing:'In progress',done:'Done'}[status]));};
 const deleteTask=(id:string)=>{dispatch({type:'delete',id});notify('Task deleted')};
 const addProject=()=>{const name=prompt('Name your new project');if(!name?.trim())return;if(state.projects.some(p=>p.id.toLowerCase()===name.trim().toLowerCase())){notify('Project already exists');return;}dispatch({type:'project',name});notify('Project created');};
 const exportTasks=()=>{const blob=new Blob([JSON.stringify({version:4,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`ship-it-backup-${dateKey()}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Backup downloaded');};
 const importTasks=async(e:React.ChangeEvent<HTMLInputElement>)=>{
   const file=e.target.files?.[0];e.target.value='';if(!file)return;
   if(file.size>2*1024*1024){notify('Backup too large (2 MB max)');return;}
   try {const payload=JSON.parse(await file.text());const result=normalizeWorkspace(payload);if(!result || !Array.isArray(payload?.tasks)&&!Array.isArray(payload))throw Error('Invalid');
    if(!window.confirm(`Replace your current workspace with ${result.tasks.length} imported tasks? Export a backup first if needed.`))return;
    dispatch({type:'replace',state:result});setProject(null);notify('Workspace restored from backup');
   } catch {notify('Could not import that JSON backup');}
 };
 useEffect(()=>{
   const handle=(e:KeyboardEvent)=>{
     const target=e.target as HTMLElement;
     const inputFocus=target?.matches('input,textarea,select')||target?.isContentEditable;
     if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommandOpen(x=>!x);return;}
     if(e.key==='Escape'){setCommandOpen(false);setSidebarOpen(false);return;}
     if(editorOpen||commandOpen||inputFocus||e.metaKey||e.ctrlKey||e.altKey)return;
     if(e.key.toLowerCase()==='n'){e.preventDefault();createTask()}
     if(e.key==='/'){e.preventDefault();document.querySelector<HTMLInputElement>('#global-search')?.focus()}
   };
   document.addEventListener('keydown',handle);return ()=>document.removeEventListener('keydown',handle);
 },[createTask,editorOpen,commandOpen]);
 useEffect(()=>{if(commandOpen){setCommandSearch('');setTimeout(()=>commandInputRef.current?.focus(),0)}},[commandOpen]);
 const done=all.filter(t=>t.status==='done').length;
 const common={tasks:filtered,allTasks:all,projects:state.projects,openTask,createTask,toggleTask,updateStatus,selectedProject:project};
 const projectNav=(p:Project)=><button key={p.id} className={'project-nav '+(project===p.id?'selected':'')} onClick={()=>{setProject(project===p.id?null:p.id);setSidebarOpen(false)}}><span className="project-mark" style={{background:p.color}}/><span>{p.id}</span><small>{all.filter(t=>t.project===p.id&&t.status!=='done').length}</small></button>;
 return <div className="workspace-root">
 <aside className={'sidebar '+(sidebarOpen?'mobile-open':'')} aria-label="Main navigation"><div className="sidebar-header"><button className="brand" onClick={()=>{chooseView('dashboard');setProject(null)}} aria-label="Ship It dashboard"><span className="brand-mark"><Sparkles size={20} strokeWidth={2.5}/></span><span>ship<span className="brand-accent">it</span><span className="brand-period">.</span></span></button><span className="brand-version">4.0</span><button aria-label="Close menu" className="sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={19}/></button></div>
 <div className="sidebar-section"><span className="sidebar-kicker">WORKSPACE</span><nav className="sidebar-links">{VIEWS.map(([id,label,Icon])=><button key={id} className={'nav-item '+(view===id?'active':'')} onClick={()=>chooseView(id)}><Icon size={18}/><span>{label}</span>{id==='list'&&<small>{all.length}</small>}</button>)}</nav></div>
 <div className="sidebar-section project-section"><div className="sidebar-kicker-row"><span className="sidebar-kicker">YOUR PROJECTS</span><button className="plus-small" onClick={addProject} title="Add project" aria-label="Add project"><Plus size={17}/></button></div><div className="project-links">{state.projects.map(projectNav)}</div></div>
 <div className="sidebar-spacer"/><div className="sidebar-spotlight"><div className="spotlight-orb">✳</div><span>THE DAILY REMINDER</span><strong>Progress over<br/>perfection.</strong><p>Keep moving, even if it&apos;s one tiny step.</p></div>
 <div className="sidebar-bottom"><a href="https://github.com/mpsorokin/chatgpt-agent-test" target="_blank" rel="noopener noreferrer"><Github size={16}/> Open source <ArrowRight size={14}/></a><span>Built with Next.js ✦</span></div>
 </aside>
 {sidebarOpen&&<button className="mobile-backdrop" aria-label="Dismiss menu" onClick={()=>setSidebarOpen(false)}/>}
 <main className="workspace-main"><header className="topbar"><div className="top-left"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={()=>setSidebarOpen(true)}><Menu size={21}/></button><span className="top-breadcrumb">Workspace</span><span className="breadcrumb-slash">/</span><strong>{VIEWS.find(x=>x[0]===view)?.[1]}</strong>{project&&<><span className="breadcrumb-slash">/</span><span className="project-breadcrumb">{project}</span></>}</div><div className="top-right"><span className="status-live"><span/> Everything saved locally</span><button className="icon-button" aria-label="Toggle dark mode" title="Switch theme" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}</button><button className="avatar" title="Your private workspace" onClick={()=>setCommandOpen(true)}>YOU</button></div></header>
 <div className="content"><section className="page-heading"><div><span className="eyebrow"><span className="eyebrow-dot"/> {formatToday().toUpperCase()}</span><h1>{view==='dashboard'?timeGreeting()+', creator.':view==='board'?'Visualize your workflow.':view==='list'?'Every task, one place.':view==='calendar'?'Own your schedule.':'Your progress, in perspective.'}</h1><p>{view==='dashboard'?"Let’s turn good intentions into meaningful momentum.":view==='board'?'Move work forward, one card at a time.':view==='list'?'The small details that make a big difference.':view==='calendar'?'Make room for what truly matters.':'Celebrate your progress and find your next opportunity.'}</p></div><button className="btn-primary page-create" onClick={createTask}><Plus size={18}/> Create task <span className="shortcut">N</span></button></section>
 {storageWarning&&<div className="storage-warning" role="alert">{storageWarning} <button onClick={exportTasks}>Export backup →</button></div>}
 {ready?<>
 {(project||view==='board'||view==='list'||view==='calendar')&&<div className="filter-toolbar"><div className="filter-search"><Search size={17}/><input id="global-search" aria-label="Search tasks" placeholder="Search tasks, projects, notes..." value={search} onChange={e=>setSearch(e.target.value)}/><kbd>/</kbd></div><button className={'filter-project '+(project?'has-filter':'')} onClick={()=>{setProject(null);setSearch('')}}><Filter size={16}/>{project||'All projects'}{project&&<X size={15}/>}</button>{view==='list'&&<select className="sort-select" aria-label="Sort tasks" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="priority">Priority</option><option value="recent">Newest</option><option value="due">Due date</option><option value="alpha">A – Z</option></select>}</div>}
 {view==='dashboard'&&<DashboardView {...common}/>} {view==='board'&&<BoardView {...common}/>} {view==='list'&&<ListView {...common} search={search} sort={sort}/>} {view==='calendar'&&<CalendarView {...common}/>} {view==='insights'&&<InsightsView {...common}/>}
 </>:<div className="loading-skeleton"><div/><div/><div/><span>Preparing your workspace...</span></div>}
 <footer className="app-footer"><span>© Ship It 4.0 · A calmer way to get things done</span><div><button onClick={exportTasks}><Download size={14}/> Export backup</button><button onClick={()=>fileRef.current?.click()}><Upload size={14}/> Import</button><button onClick={()=>setCommandOpen(true)}><Command size={14}/> Commands</button></div></footer>
 </div></main>
 <input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={importTasks}/>
 <TaskEditor open={editorOpen} task={editing} projects={state.projects} onClose={()=>setEditorOpen(false)} onSave={saveTask} onDelete={deleteTask}/>
 {commandOpen&&<div className="command-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setCommandOpen(false)}}><section className="command-box" role="dialog" aria-modal="true" aria-label="Quick commands"><div className="command-search"><Search size={21}/><input ref={commandInputRef} placeholder="Search commands..." value={commandSearch} onChange={e=>setCommandSearch(e.target.value)}/><kbd>ESC</kbd></div><span className="command-title">QUICK ACTIONS</span>{[
 ...VIEWS.map(([id,label,Icon])=>({label:'Go to '+label,Icon,run:()=>chooseView(id)})),
 {label:'Create new task',Icon:Plus,run:()=>{setCommandOpen(false);createTask()}},
 {label:'Export backup',Icon:Download,run:()=>{setCommandOpen(false);exportTasks()}},
 {label:'Toggle dark mode',Icon:Moon,run:()=>{setTheme(t=>t==='light'?'dark':'light');setCommandOpen(false)}}
 ].filter(c=>c.label.toLowerCase().includes(commandSearch.toLowerCase())).map(c=><button key={c.label} className="command-item" onClick={c.run}><c.Icon size={18}/><span>{c.label}</span><ArrowRight size={15}/></button>)}<div className="command-bottom">Tip: press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to open</div></section></div>}
 {toast&&<div role="status" className="toast"><Check size={17}/>{toast}</div>}
 </div>
}
