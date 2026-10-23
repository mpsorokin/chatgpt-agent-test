import type { Metadata } from 'next';
import { WorkspaceView } from '@/components/workspace-view';
export const metadata:Metadata={title:'Gantt Planning | Ship It'};
export default function Page(){return <WorkspaceView view="planning"/>;}
