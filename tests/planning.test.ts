import { describe,expect,it } from 'vitest';
import { dateKey, type Task, type Workspace, type Sprint } from '../lib/model';
import { daysBetween, datesForView, deliveryMetrics, estimateHours, plannedTasks, sprintBurndown, sprintStats, sprintVelocity, validDay, weeklyThroughput } from '../lib/planning';
import { normalizeWorkspace, readWorkspace } from '../lib/storage';
import { workspaceReducer } from '../lib/workspace';

const task=(overrides:Partial<Task>={}):Task=>({
 id:'a',text:'Implement feature',description:'',project:'Work',priority:'high',status:'todo',
 due:'',created:100000,completedAt:null,subtasks:[],...overrides
});
const sprint:Sprint={id:'s1',name:'Release sprint',goal:'Launch',start:'2026-10-19',end:'2026-11-01',status:'active'};
const base:Workspace={tasks:[task()],projects:[{id:'Work',color:'#816df2'}],sprints:[sprint]};
describe('React 19.3 planning model migration',()=>{
 it('preserves old task data and initializes empty sprint list',()=>{
  const ws=normalizeWorkspace({version:4,tasks:[{id:'legacy',text:'Old task',status:'doing',due:'2026-10-28'}],projects:[]});
  expect(ws?.tasks[0]).toMatchObject({id:'legacy',status:'doing',due:'2026-10-28',startDate:'',estimateHours:0,sprintId:''});
  expect(ws?.sprints).toEqual([]);
 });
 it('roundtrips sprint assignments and estimates',()=>{
  const state=normalizeWorkspace({tasks:[{id:'a',text:'Backlog',startDate:'2026-10-22',due:'2026-10-30',estimateHours:6.5,sprintId:'s1'}],sprints:[sprint]});
  expect(state?.tasks[0]).toMatchObject({startDate:'2026-10-22',estimateHours:6.5,sprintId:'s1'});
  expect(state?.sprints).toHaveLength(1);
 });
 it('drops invalid or orphaned sprint links',()=>{
  const state=normalizeWorkspace({tasks:[{id:'a',text:'Task',sprintId:'gone',startDate:'2026-02-31',estimateHours:-2}],sprints:[{...sprint,start:'2026-11-09',end:'2026-11-01'}]});
  expect(state?.tasks[0]).toMatchObject({sprintId:'',startDate:'',estimateHours:0});
  expect(state?.sprints).toHaveLength(0);
 });
});
describe('Gantt planning and sprint lifecycle',()=>{
 it('validates day spans including cross-month dates',()=>{
  expect(validDay('2026-02-30')).toBe(false);
  expect(validDay('2026-10-19')).toBe(true);
  expect(daysBetween('2026-10-30','2026-11-02')).toBe(3);
  expect(datesForView('2026-10-30',4)).toEqual(['2026-10-30','2026-10-31','2026-11-01','2026-11-02']);
 });
 it('includes due-only tasks as single-day Gantt milestones',()=>{
  const onlyDue=task({id:'due-only',due:'2026-10-28',startDate:''});
  const planned=plannedTasks([onlyDue]);
  expect(planned).toHaveLength(1);
  expect(planned[0]).toMatchObject({timelineStart:'2026-10-28',due:'2026-10-28',deadlineOnly:true});
 });
 it('immediately reflects an updated due date in Gantt selectors',()=>{
  const initial=workspaceReducer(base,{type:'plan',id:'a',startDate:'',due:'2026-10-28',estimateHours:2,sprintId:''});
  expect(plannedTasks(initial.tasks)[0].timelineStart).toBe('2026-10-28');
  const changed=workspaceReducer(initial,{type:'plan',id:'a',startDate:'',due:'2026-12-01',estimateHours:2,sprintId:''});
  expect(plannedTasks(changed.tasks)[0]).toMatchObject({due:'2026-12-01',timelineStart:'2026-12-01'});
 });
 it('keeps a due-only task visible when edited through the main task editor',()=>{
  const start=workspaceReducer(base,{type:'plan',id:'a',startDate:'2026-10-30',due:'2026-11-03',estimateHours:2,sprintId:''});
  const updated=workspaceReducer(start,{type:'upsert',id:'a',draft:{text:'Implement feature',description:'',project:'Work',priority:'high',status:'todo',due:'2026-10-28',startDate:'2026-10-30',estimateHours:2,subtasks:[]}});
  expect(updated.tasks[0].startDate).toBe('');
  expect(plannedTasks(updated.tasks)[0]).toMatchObject({deadlineOnly:true,due:'2026-10-28'});
 });
 it('schedules tasks without overwriting names or existing status',()=>{
  const state=workspaceReducer(base,{type:'plan',id:'a',startDate:'2026-10-20',due:'2026-10-26',estimateHours:5.5,sprintId:'s1'});
  expect(state.tasks[0]).toMatchObject({text:'Implement feature',status:'todo',startDate:'2026-10-20',due:'2026-10-26',estimateHours:5.5,sprintId:'s1'});
  expect(plannedTasks(state.tasks)).toHaveLength(1);
 });
 it('rejects invalid dates or reversed task windows',()=>{
  const backward=workspaceReducer(base,{type:'plan',id:'a',startDate:'2026-11-01',due:'2026-10-22',estimateHours:2,sprintId:'s1'});
  const bad=workspaceReducer(base,{type:'plan',id:'a',startDate:'abc',due:'2026-10-22',estimateHours:2,sprintId:'s1'});
  expect(backward).toEqual(base);
  expect(bad).toEqual(base);
 });
 it('creates, starts, closes, deletes sprint without losing tasks',()=>{
  const created=workspaceReducer(base,{type:'sprintAdd',name:'Sprint 2',goal:'QA',start:'2026-11-02',end:'2026-11-15'});
  expect(created.sprints).toHaveLength(2);
  const id=created.sprints![1].id;
  const activated=workspaceReducer(created,{type:'sprintUpdate',id,patch:{status:'active'}});
  const deleted=workspaceReducer(activated,{type:'sprintDelete',id:'s1'});
  expect(deleted.sprints).toHaveLength(1);
  expect(deleted.tasks[0].text).toBe('Implement feature');
 });
 it('calculates status, estimation and sprint capacity',()=>{
  const tasks=[task({id:'one',sprintId:'s1',status:'done',estimateHours:4,completedAt:new Date('2026-10-20T12:00:00').getTime()}),task({id:'two',sprintId:'s1',estimateHours:8})];
  const stats=sprintStats(sprint,tasks);
  expect(stats).toMatchObject({completionRate:50,assignedHours:12,completedHours:4,remainingHours:8});
  expect(estimateHours(tasks)).toBe(12);
  const velocity=sprintVelocity([sprint],tasks);
  expect(velocity[0]).toMatchObject({planned:12,completed:4,completedTasks:1});
  const chart=sprintBurndown(sprint,tasks);
  expect(chart).toHaveLength(14);
  expect(chart[0].remaining).toBe(2);
  expect(chart[chart.length-1].remaining).toBe(1);
 });
 it('computes delivery metrics from available timestamps',()=>{
  const now=Date.now();
  const tasks=[task({status:'done',created:now-2*86400000,completedAt:now,estimateHours:3}),task({id:'other',due:'2020-01-01',estimateHours:6})];
  const stats=deliveryMetrics(tasks);
  expect(stats.overdue).toBe(1);
  expect(stats.avgLeadDays).toBeCloseTo(2);
  expect(stats.estimated).toBe(9);
  expect(weeklyThroughput(tasks)).toHaveLength(8);
 });
});
