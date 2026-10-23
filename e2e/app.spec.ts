import { test,expect,type Page } from '@playwright/test';
import packageJSON from '../package.json';

const root='/chatgpt-agent-test';
const accountId='11111111-1111-4111-8111-111111111111';
const now=new Date().toISOString();
const user={id:accountId,email:'e2e@example.test',aud:'authenticated',role:'authenticated',created_at:now,updated_at:now,app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[]};

async function mockAuth(page:Page,options:{failSaves?:boolean}={}){
 let revision=1;
 let ws:any={tasks:[],projects:[{id:'Work',color:'#816df2'},{id:'Personal',color:'#30bca3'},{id:'Learning',color:'#f1ab59'}],sprints:[]};
 let tm:any={entries:[],active:null};
 const saves:any[]=[];
 await page.route('**/auth/v1/token**',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({access_token:'fake-jwt',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'fake-refresh',user})
 }));
 await page.route('**/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}));
 await page.route('**/rest/v1/rpc/shipit_load_v7',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({workspace:ws,time_tracking:tm,revision})
 }));
 await page.route('**/rest/v1/rpc/shipit_save_v8',async route=>{
  const body=route.request().postDataJSON();
  if(options.failSaves){
   saves.push(body);
   await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'PGRST001',message:'Simulated transient database outage'})});
   return;
  }
  if(body.p_expected_revision!==revision){
   await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'40001',message:'revision conflict'})});
   return;
  }
  revision++;
  ws=body.p_workspace;tm=body.p_time;
  saves.push(body);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(revision)});
 });
 return {saves,getWorkspace:()=>ws,getRevision:()=>revision};
}

test('public login/register/recovery URLs are real routed Next.js pages',async({page})=>{
 await page.goto(root+'/login/');
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 // Regression: UI release must reflect package.json instead of a hardcoded old version.
 await expect(page.getByText(new RegExp('Ship It v'+packageJSON.version.replaceAll('.',String.raw`\.`)))).toBeVisible();
 await page.getByRole('link',{name:'Create an account'}).click();
 await expect(page).toHaveURL(/\/register\/?$/);
 await expect(page.getByRole('heading',{name:'Start shipping smarter.'})).toBeVisible();
 await page.goto(root+'/forgot-password/');
 await expect(page.getByRole('heading',{name:'Reset your password.'})).toBeVisible();
 await page.goto(root+'/resend-confirmation/');
 await expect(page.getByRole('heading',{name:'Need to confirm your email?'})).toBeVisible();
});

test('unauthenticated workspace access redirects to login',async({page})=>{
 await page.goto(root+'/planning/');
 await expect(page).toHaveURL(/\/login\/?$/);
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
});

test('mocked Supabase login, task creation, Gantt route and atomic save',async({page})=>{
 const backend=await mockAuth(page);
 await page.goto(root+'/login/');
 await page.getByLabel('Email address').fill('e2e@example.test');
 await page.getByLabel('Password',{exact:true}).fill('somepassword');
 await page.getByRole('button',{name:'Sign in'}).click();
 await expect(page).toHaveURL(/\/dashboard\/?$/);
 await expect(page.getByText('Synced with Supabase')).toBeVisible();
 await expect(page.getByLabel(new RegExp('Ship It release v'+packageJSON.version.replaceAll('.',String.raw`\.`)))).toBeVisible();
 await page.getByRole('button',{name:/New task/i}).first().click();
 await page.getByLabel('Task name').fill('Release validation');
 await page.getByRole('button',{name:'Create task',exact:true}).click();
 await expect.poll(()=>backend.saves.length,{timeout:12000}).toBe(1);
 expect(backend.getWorkspace().tasks[0].text).toBe('Release validation');
 await page.goto(root+'/planning/');
 await expect(page.getByRole('heading',{name:'Make the roadmap visible.'})).toBeVisible();
 await expect(page.getByText('Release validation').first()).toBeVisible();
});

test('failed cloud save can be recovered after a browser reload',async({page})=>{
 const backend=await mockAuth(page,{failSaves:true});
 await page.goto(root+'/login/');
 await page.getByLabel('Email address').fill('e2e@example.test');
 await page.getByLabel('Password',{exact:true}).fill('somepassword');
 await page.getByRole('button',{name:'Sign in'}).click();
 await expect(page).toHaveURL(/\/dashboard\/?$/);
 await expect(page.getByText('Synced with Supabase')).toBeVisible();
 await page.getByRole('button',{name:/New task/i}).first().click();
 await page.getByLabel('Task name').fill('Recovered after outage');
 await page.getByRole('button',{name:'Create task',exact:true}).click();
 await expect.poll(()=>backend.saves.length,{timeout:15000}).toBeGreaterThan(0);
 page.on('dialog',dialog=>void dialog.accept());
 await page.reload();
 await expect(page.getByRole('heading',{name:'Recover unsaved changes'})).toBeVisible();
 await page.getByRole('button',{name:'Restore browser changes'}).click();
 await expect(page.getByText('Recovered after outage').first()).toBeVisible();
 expect(backend.getWorkspace().tasks).toHaveLength(0);
});
