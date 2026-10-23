import { describe, expect, it } from 'vitest';
import { normalizeWorkspace, readWorkspace, writeWorkspace } from '../lib/storage';
import { workspaceReducer, sortTasks } from '../lib/workspace';
import { STORAGE_KEY, type Workspace, type Task } from '../lib/model';
const t=(overrides:Partial<Task>={}):Task=>({id:'1',text:'Test',description:'',project:'Work',status:'todo',priority:'medium',due:'',created:1,completedAt:null,subtasks:[],...overrides});
const base:Workspace={tasks:[t()],projects:[{id:'Work',color:'#816df2'}]};
describe('data migration and reliability',()=>{
 it('migrates v1 tasks and preserves done states',()=>{
   const store={getItem:(k:string)=>k==='chatgpt-agent-test:tasks:v1'?JSON.stringify([{id:'a',text:'Old task',done:true}]):null};
   const {state,source}=readWorkspace(store);
   expect(source).toContain(':v1');expect(state.tasks[0].status).toBe('done');expect(state.tasks[0].text).toBe('Old task');
 });
 it('migrates v3 projects, subtasks, status and description',()=>{
   const state=normalizeWorkspace({tasks:[{id:'x',text:'Release',project:'Client',status:'doing',description:'Detailed',subtasks:[{id:'sub',text:'QA',done:true}]}],projects:[{id:'Client',color:'#112233'}]});
   expect(state?.projects.some(x=>x.id==='Client')).toBe(true);
   expect(state?.tasks[0]).toMatchObject({status:'doing',project:'Client',description:'Detailed',subtasks:[{id:'sub',text:'QA',done:true}]});
 });
 it('does not throw when localStorage is unavailable',()=>{expect(readWorkspace({getItem:()=>{throw Error('blocked');}}).source).toBe('unavailable');expect(writeWorkspace({setItem:()=>{throw Error('full');}},base)).toBe(false);});
 it('does not trust corrupt data',()=>{expect(normalizeWorkspace({tasks:[{id:'1',text:'  '},{text:'Safe <b>text</b>',priority:'oops',due:'2026-02-30'}]})?.tasks).toMatchObject([{text:'Safe <b>text</b>',priority:'medium',due:''}]);});
 it('saves versioned workspace',()=>{let k='',v=''; expect(writeWorkspace({setItem:(key,val)=>{k=key;v=val;}},base)).toBe(true);expect(k).toBe(STORAGE_KEY);expect(JSON.parse(v).version).toBe(4);});
});
describe('task domain',()=>{
 it('moves a task into done and back',()=>{
   const done=workspaceReducer(base,{type:'status',id:'1',status:'done'});expect(done.tasks[0].completedAt).toBeTypeOf('number');
   const reopened=workspaceReducer(done,{type:'toggle',id:'1'});expect(reopened.tasks[0]).toMatchObject({status:'todo',completedAt:null});
 });
 it('creates a project and reassigns its tasks when deleted',()=>{
   const added=workspaceReducer(base,{type:'project',name:'Side hustle'});
   const withTask={...added,tasks:[t({project:'Side hustle'})]};
   expect(workspaceReducer(withTask,{type:'projectDelete',name:'Side hustle'}).tasks[0].project).toBe('Work');
 });
 it('sorts priorities without mutating input',()=>{const input=[t({id:'low',priority:'low'}),t({id:'high',priority:'high'})];expect(sortTasks(input).map(x=>x.id)).toEqual(['high','low']);expect(input[0].id).toBe('low');});
 it('never duplicates an existing project',()=>{expect(workspaceReducer(base,{type:'project',name:'work'})).toEqual(base);});
});
