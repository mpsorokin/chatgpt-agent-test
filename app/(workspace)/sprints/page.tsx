import type { Metadata } from 'next';
import { WorkspaceView } from '@/components/workspace-view';
export const metadata:Metadata={title:'Sprints | Ship It'};
export default function Page(){return <WorkspaceView view="sprints"/>;}
