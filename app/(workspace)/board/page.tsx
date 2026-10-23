import type { Metadata } from 'next';
import { WorkspaceView } from '@/components/workspace-view';
export const metadata:Metadata={title:'Kanban Board | Ship It'};
export default function Page(){return <WorkspaceView view="board"/>;}
