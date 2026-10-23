'use client';
import { createContext, useContext } from 'react';
import type { ViewProps } from './views';
import type { PlanActions } from './planning-view';
import type { Sprint, Task, Project } from '@/lib/model';
import type { TimeState } from '@/lib/time-tracking';

export interface WorkspaceContextValue {
 common:ViewProps;
 planning:PlanActions;
 sprints:Sprint[];
 onSprintAdd:(name:string,goal:string,start:string,end:string)=>void;
 onSprintEdit:(id:string,patch:Partial<Sprint>)=>void;
 onSprintDelete:(id:string)=>void;
 tasks:Task[];
 projects:Project[];
 time:TimeState;
 now:number;
 startTimer:(target:import('@/lib/time-tracking').TimerTarget)=>void;
 stopTimer:()=>void;
 addTime:(target:import('@/lib/time-tracking').TimerTarget,day:string,minutes:number)=>void;
 deleteTime:(id:string)=>void;
 notify:(message:string)=>void;
 search:string;
 sort:'priority'|'recent'|'due'|'alpha';
}
export const WorkspaceContext=createContext<WorkspaceContextValue|null>(null);
export function useWorkspace(){
 const state=useContext(WorkspaceContext);
 if(!state)throw new Error('WorkspaceView must render inside workspace layout');
 return state;
}
