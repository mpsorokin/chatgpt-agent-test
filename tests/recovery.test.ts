import {describe,it,expect} from 'vitest';
import {makeRecoveryDraft,parseRecoveryDraft,recoveryKey,sameRecoveryContent} from '../lib/recovery';
import type { Workspace } from '../lib/model';
import type { TimeState } from '../lib/time-tracking';
const workspace:Workspace={projects:[{id:'Work',color:'#816df2'}],tasks:[],sprints:[]};
const time:TimeState={entries:[],active:null};
describe('user-scoped unsynced recovery',()=>{
 it('never restores a draft from a different account',()=>{
  const a=makeRecoveryDraft('user-a',4,workspace,time,111);
  expect(parseRecoveryDraft(JSON.stringify(a),'user-b')).toBeNull();
  expect(recoveryKey('user-a')).not.toBe(recoveryKey('user-b'));
 });
 it('recovers only valid snapshots with an explicit matching user and revision',()=>{
  const a=makeRecoveryDraft('user-a',3,workspace,time,123);
  expect(parseRecoveryDraft(JSON.stringify(a),'user-a')).toEqual(a);
  expect(sameRecoveryContent(a,workspace,time)).toBe(true);
  expect(sameRecoveryContent(a,{...workspace,tasks:[{id:'1',text:'hi',description:'',project:'Work',status:'todo',priority:'high',due:'',created:100,completedAt:null,subtasks:[]}]},time)).toBe(false);
  expect(parseRecoveryDraft(JSON.stringify({...a,revision:-1}),'user-a')).toBeNull();
  expect(parseRecoveryDraft('not json','user-a')).toBeNull();
 });
});
