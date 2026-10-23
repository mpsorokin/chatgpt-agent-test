import { defineConfig,devices } from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',
 timeout:30_000,
 retries:process.env.CI?1:0,
 reporter:process.env.CI?[['github'],['html',{open:'never'}]]:'list',
 use:{
  baseURL:'http://127.0.0.1:4173/chatgpt-agent-test',
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
  ...devices['Desktop Chrome'],
 },
 webServer:{
  command:'node scripts/serve-static.mjs',
  url:'http://127.0.0.1:4173/chatgpt-agent-test/login/',
  timeout:40_000,
  reuseExistingServer:!process.env.CI
 }
});
