import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('relational database migration contract',()=>{
 const source=readFileSync(join(process.cwd(),'supabase/migrations/20261023_shipit_v8_incremental.sql'),'utf8');
 it('uses a SECURITY INVOKER RPC and revokes anonymous access',()=>{
  expect(source).toContain('security invoker');
  expect(source).toContain('revoke all on function public.shipit_save_v8');
  expect(source).toContain('from public,anon');
 });
 it('preserves existing rows and has optimistic revision checking',()=>{
  expect(source).toContain('is distinct from');
  expect(source).toContain('revision=p_expected_revision');
  expect(source).toContain('on conflict (user_id,id) do update');
  expect(source).not.toMatch(/delete from public\.shipit_tasks where user_id=u\s*;/);
 });
});
