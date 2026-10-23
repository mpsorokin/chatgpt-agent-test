import type { View } from './model';

export const WORKSPACE_ROUTES: Record<View,string> = {
 dashboard:'/dashboard',
 board:'/board',
 list:'/tasks',
 calendar:'/calendar',
 insights:'/insights',
 time:'/time-tracking',
 planning:'/planning',
 sprints:'/sprints',
};

export function workspaceViewFromPath(pathname:string):View {
 const path=pathname.replace(/\/$/,'');
 const matched=(Object.entries(WORKSPACE_ROUTES) as [View,string][]).find(([,route])=>path===route || path.endsWith(route));
 return matched?.[0] ?? 'dashboard';
}
// The configured static-export base path is needed by Supabase email links.
// Next.js Link/router automatically handle basePath for in-app navigation.
export const SITE_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/chatgpt-agent-test';
export function absoluteAuthUrl(path:string,origin:string):string {
 const base=SITE_BASE_PATH.replace(/\/$/,'');
 return new URL(base+path+'/',origin).toString();
}
