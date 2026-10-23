import { describe,it,expect } from 'vitest';
import { cloudRetryDelay,hasUnsavedCloudChanges,serializeCloudState } from '../lib/cloud-sync';
import type { Workspace } from '../lib/model';
import type { TimeState } from '../lib/time-tracking';

describe('cloud sync regression guards',()=>{
 const workspace:Workspace={tasks:[],projects:[{id:'Work',color:'#816df2'}],sprints:[]};
 const time:TimeState={entries:[],active:null};
 it('detects same-tick changes before React effects update dirty state',()=>{
  const saved=serializeCloudState(workspace,time);
  expect(hasUnsavedCloudChanges(workspace,time,saved)).toBe(false);
  expect(hasUnsavedCloudChanges({...workspace,tasks:[{id:'t',text:'Important',description:'',project:'Work',priority:'high',status:'todo',due:'',created:1,completedAt:null,subtasks:[]}]},time,saved)).toBe(true);
  expect(hasUnsavedCloudChanges(workspace,{entries:[],active:{taskId:null,taskTitle:'Important',project:'Work',description:'',startedAt:1000}},saved)).toBe(true);
 });
 it('uses bounded exponential retry delays rather than tight failure loops',()=>{
  expect([0,1,2,3,4,5,6,100].map(x=>cloudRetryDelay(x))).toEqual([850,1700,3400,6800,13600,27200,27200,27200]);
  expect(cloudRetryDelay(-1)).toBe(850);
 });
});
