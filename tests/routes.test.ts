import { describe,expect,it } from 'vitest';
import { WORKSPACE_ROUTES,absoluteAuthUrl,workspaceViewFromPath } from '../lib/routes';

describe('Next.js App Router route mapping',()=>{
 it('has a unique public route for every workspace view',()=>{
  expect(Object.values(WORKSPACE_ROUTES)).toHaveLength(8);
  expect(new Set(Object.values(WORKSPACE_ROUTES)).size).toBe(8);
 });
 it('identifies routes with or without static-export trailing slashes',()=>{
  expect(workspaceViewFromPath('/dashboard')).toBe('dashboard');
  expect(workspaceViewFromPath('/tasks/')).toBe('list');
  expect(workspaceViewFromPath('/chatgpt-agent-test/time-tracking/')).toBe('time');
  expect(workspaceViewFromPath('/chatgpt-agent-test/planning')).toBe('planning');
  expect(workspaceViewFromPath('/sprints/')).toBe('sprints');
 });
 it('builds absolute email confirmation and recovery URLs for GitHub Pages',()=>{
  expect(absoluteAuthUrl('/auth/callback','https://mpsorokin.github.io')).toBe('https://mpsorokin.github.io/chatgpt-agent-test/auth/callback/');
  expect(absoluteAuthUrl('/reset-password','https://mpsorokin.github.io')).toBe('https://mpsorokin.github.io/chatgpt-agent-test/reset-password/');
 });
});

import { readAuthLinkError } from '../lib/auth-errors';
describe('Supabase auth email errors',()=>{
 it('identifies expired one-time links and tells users to request a new email',()=>{
  const result=readAuthLinkError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  expect(result?.code).toBe('otp_expired');
  expect(result?.message).toMatch(/fresh confirmation email/i);
 });
 it('returns null when the URL has no authentication error',()=>{
  expect(readAuthLinkError('#access_token=redacted&token_type=bearer')).toBeNull();
  expect(readAuthLinkError('')).toBeNull();
 });
});
