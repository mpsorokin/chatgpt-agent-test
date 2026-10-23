export type Status = 'todo' | 'doing' | 'done';
export type Priority = 'high' | 'medium' | 'low';
export type View = 'dashboard' | 'board' | 'list' | 'calendar' | 'insights';
export interface Subtask { id: string; text: string; done: boolean }
export interface Task {
  id: string;
  text: string;
  description: string;
  project: string;
  priority: Priority;
  status: Status;
  due: string;
  created: number;
  completedAt: number | null;
  subtasks: Subtask[];
}
export interface Project { id: string; color: string }
export interface Workspace { tasks: Task[]; projects: Project[] }
export type TaskDraft = Pick<Task, 'text' | 'description' | 'project' | 'priority' | 'status' | 'due' | 'subtasks'>;
export const COLORS = ['#816df2','#30bca3','#f1ab59','#e677a3','#5b9edb','#a3a7b4','#c18bf5'];
export const DEFAULT_PROJECTS: Project[] = [{id:'Work',color:'#816df2'},{id:'Personal',color:'#30bca3'},{id:'Learning',color:'#f1ab59'}];
export const STORAGE_KEY = 'ship-it:workspace:v4';
export const LEGACY_KEYS = ['chatgpt-agent-test:tasks:v3','chatgpt-agent-test:tasks:v2','chatgpt-agent-test:tasks:v1'];
export const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const addDays = (date: Date, n: number) => { const d = new Date(date); d.setDate(d.getDate()+n); return d; };
export const prettyDate = (iso: string) => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
export const priorityRank: Record<Priority,number> = {high:0,medium:1,low:2};
