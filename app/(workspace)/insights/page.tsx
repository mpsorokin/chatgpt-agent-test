import type { Metadata } from 'next';
import { WorkspaceView } from '@/components/workspace-view';
export const metadata:Metadata={title:'Insights | Ship It'};
export default function Page(){return <WorkspaceView view="insights"/>;}
