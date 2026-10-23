import { describe, expect, it } from 'vitest';
import { addManualEntry, betweenDates, clock, csvEntries, deleteTimeEntry, emptyTimeState, humanDuration, loggedMs, normalizeTimeState, startTimer, stopTimer, type TimerTarget } from '../lib/time-tracking';

const target:TimerTarget={taskId:'task-1',taskTitle:'Prepare report',project:'Work',description:'Review metrics'};
const start=new Date('2026-10-20T09:00:00').getTime();

describe('time tracking lifecycle',()=>{
 it('starts, stops and persists an exact timer duration',()=>{
  const running=startTimer(emptyTimeState(),target,start);
  expect(running.active).toMatchObject({...target,startedAt:start});
  const stopped=stopTimer(running,start+90_000);
  expect(stopped.active).toBeNull();
  expect(stopped.entries[0]).toMatchObject({...target,durationMs:90_000,startedAt:start,endedAt:start+90_000});
  expect(loggedMs(stopped.entries)).toBe(90_000);
 });
 it('switching tasks automatically completes the previous session',()=>{
  const other={...target,taskId:'task-2',taskTitle:'Code review'};
  const first=startTimer(emptyTimeState(),target,start);
  const switched=startTimer(first,other,start+300_000);
  expect(switched.entries).toHaveLength(1);
  expect(switched.entries[0].durationMs).toBe(300_000);
  expect(switched.active?.taskTitle).toBe('Code review');
 });
 it('stopping with no active session is a no-op',()=>expect(stopTimer(emptyTimeState(),start)).toEqual(emptyTimeState()));
 it('adds validated manual entries and rejects zero or extreme lengths',()=>{
  const added=addManualEntry(emptyTimeState(),target,'2026-10-19',75);
  expect(added.entries[0].durationMs).toBe(75*60_000);
  expect(addManualEntry(added,target,'2026-02-30',30)).toEqual(added);
  expect(addManualEntry(added,target,'2026-10-19',1441)).toEqual(added);
  expect(addManualEntry(added,target,'2026-10-19',0)).toEqual(added);
 });
 it('deletes only the selected entry',()=>{
  const first=addManualEntry(emptyTimeState(),target,'2026-10-19',30);
  const second=addManualEntry(first,target,'2026-10-20',45);
  const kept=deleteTimeEntry(second,first.entries[0].id);
  expect(kept.entries).toHaveLength(1);
  expect(kept.entries[0].durationMs).toBe(45*60_000);
 });
});

describe('time reports and backups',()=>{
 it('normalizes saved entries and restores active timer',()=>{
  const source=stopTimer(startTimer(emptyTimeState(),target,start),start+30000);
  const raw={entries:[...source.entries,{id:'broken',startedAt:'oops',endedAt:30}],active:{...target,startedAt:Date.now()-10000}};
  const parsed=normalizeTimeState(raw);
  expect(parsed?.entries).toHaveLength(1);
  expect(parsed?.active?.taskId).toBe('task-1');
 });
 it('rejects missing and invalid documents without crashing',()=>{
  expect(normalizeTimeState(null)).toBeNull();
  expect(normalizeTimeState({entries:'bad'})).toBeNull();
  expect(normalizeTimeState({entries:[{id:'x',startedAt:3,endedAt:1}]})).toEqual({entries:[],active:null});
 });
 it('filters using calendar days in local time',()=>{
  const e=addManualEntry(emptyTimeState(),target,'2026-10-19',25).entries[0];
  expect(betweenDates(e,'2026-10-19','2026-10-20')).toBe(true);
  expect(betweenDates(e,'2026-10-20','2026-10-25')).toBe(false);
 });
 it('escapes CSV values and produces usable formats',()=>{
  const e=addManualEntry(emptyTimeState(),{...target,taskTitle:'Review, "draft"'},'2026-10-19',35);
  const csv=csvEntries(e.entries);
  expect(csv).toContain('"Review, ""draft"""');
  expect(csv).toContain('Duration (hours)');
  expect(clock(3661000)).toBe('01:01:01');
  expect(humanDuration(3900000)).toBe('1h 05m');
 });
});
