'use client';
import type { View } from '@/lib/model';
import { useWorkspace } from './workspace-context';
import { BoardView, CalendarView, DashboardView, InsightsView, ListView } from './views';
import { DeliveryAnalytics } from './delivery-analytics';
import { TimeTrackingPanel } from './time-tracking-panel';
import { PlanningView } from './planning-view';
import { SprintsView } from './sprints-view';

export function WorkspaceView({view}:{view:View}){
 const ctx=useWorkspace();
 switch(view){
 case 'dashboard':return <DashboardView {...ctx.common}/>;
 case 'board':return <BoardView {...ctx.common}/>;
 case 'list':return <ListView {...ctx.common} search={ctx.search} sort={ctx.sort}/>;
 case 'calendar':return <CalendarView {...ctx.common}/>;
 case 'insights':return <><InsightsView {...ctx.common}/><DeliveryAnalytics tasks={ctx.tasks} sprints={ctx.sprints} projects={ctx.projects} entries={ctx.time.entries}/></>;
 case 'time':return <TimeTrackingPanel tasks={ctx.tasks} projects={ctx.projects} entries={ctx.time.entries} active={ctx.time.active} now={ctx.now} onStart={ctx.startTimer} onStop={ctx.stopTimer} onAdd={ctx.addTime} onDelete={ctx.deleteTime} notify={ctx.notify}/>;
 case 'planning':return <PlanningView {...ctx.planning}/>;
 case 'sprints':return <SprintsView {...ctx.planning} onSprintAdd={ctx.onSprintAdd} onSprintEdit={ctx.onSprintEdit} onSprintDelete={ctx.onSprintDelete}/>;
 }
}
