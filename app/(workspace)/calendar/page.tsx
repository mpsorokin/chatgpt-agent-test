import type { Metadata } from 'next';
import { WorkspaceView } from '@/components/workspace-view';
export const metadata:Metadata={title:'Calendar | Ship It'};
export default function Page(){return <WorkspaceView view="calendar"/>;}
