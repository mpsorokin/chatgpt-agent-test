'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Workspace } from '@/lib/model';
import type { TimeState } from '@/lib/time-tracking';
import { normalizeWorkspace } from '@/lib/storage';
import { normalizeTimeState } from '@/lib/time-tracking';
import { supabase } from '@/lib/supabase';

type Stage='loading'|'signedout'|'setup'|'ready'|'error';
type CloudRow={workspace:unknown;time_tracking:unknown;revision:number};
const delay=850;

export function useCloudWorkspace(localWorkspace:Workspace,localTime:TimeState,localReady:boolean,timeReady:boolean,
 setWorkspace:(workspace:Workspace)=>void,setTime:(time:TimeState)=>void){
 const [user,setUser]=useState<User|null>(null),[stage,setStage]=useState<Stage>('loading');
 const [status,setStatus]=useState('Connecting...'),[error,setError]=useState('');
 const revision=useRef(0),baseline=useRef(''),accountRef=useRef(''),loadingRef=useRef(false);
 const workspaceRef=useRef(localWorkspace),timeRef=useRef(localTime);
 workspaceRef.current=localWorkspace;timeRef.current=localTime;
 const [dirty,setDirty]=useState(false);
 const saving=useRef(false);
 const [saveTick,setSaveTick]=useState(0);
 const load=useCallback(async(user:User)=>{
  if(loadingRef.current)return;
  loadingRef.current=true;accountRef.current=user.id;baseline.current='';setStage('loading');setError('');setStatus('Loading cloud workspace...');
  try{
   const {data,error}=await supabase.rpc('shipit_load_v7');
   if(error)throw error;
   if(accountRef.current!==user.id)return;
   if(!data){setStage('setup');setStatus('Choose how to initialize your cloud workspace');return;}
   const row=data as CloudRow;
   const normalized=normalizeWorkspace(row.workspace),time=normalizeTimeState(row.time_tracking);
   if(!normalized||!time)throw Error('Cloud data is invalid. Nothing was overwritten.');
   revision.current=Number(row.revision);baseline.current=JSON.stringify({workspace:normalized,time});
   setWorkspace(normalized);setTime(time);setStage('ready');setStatus('Synced with Supabase');setDirty(false);
  }catch(e){setError(e instanceof Error?e.message:'Cloud load failed');setStage('error');setStatus('Sync unavailable');}
  finally{loadingRef.current=false;}
 },[setWorkspace,setTime]);
 useEffect(()=>{
  let valid=true;
  const apply=(u:User|null)=>{
   if(!valid)return;
   if(u?.id===accountRef.current&&accountRef.current&&stage==='ready')return;
   if(!u){accountRef.current='';setUser(null);setStage('signedout');setStatus('Signed out');setDirty(false);return;}
   setUser(u);void load(u);
  };
  void supabase.auth.getUser().then(({data,error})=>{
   if(!valid)return;
   if(error&&!data.user){setStage('signedout');setStatus('Signed out');return;}
   apply(data.user);
  }).catch(()=>{if(valid){setStage('signedout');setStatus('Authentication unavailable');}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==='INITIAL_SESSION')return;
   if(event==='SIGNED_OUT'){apply(null);return;}
   if(event==='SIGNED_IN'&&session?.user)apply(session.user);
  });
  return()=>{valid=false;subscription.unsubscribe();};
 // auth is handled once on mount; load callback is stable
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const init=useCallback(async(useLocal:boolean)=>{
  if(!user||!localReady||!timeReady)return;
  setError('');setStatus('Creating secure workspace...');
  const workspace=useLocal?workspaceRef.current:{tasks:[],projects:[{id:'Work',color:'#816df2'},{id:'Personal',color:'#30bca3'},{id:'Learning',color:'#f1ab59'}],sprints:[]};
  const time=useLocal?timeRef.current:{entries:[],active:null};
  const {data,error}=await supabase.rpc('shipit_save_v7',{p_workspace:workspace,p_time:time,p_expected_revision:0});
  if(error){setError(error.message);setStatus('Could not initialize workspace');return;}
  revision.current=Number(data);baseline.current=JSON.stringify({workspace,time});
  setWorkspace(workspace);setTime(time);setStage('ready');setStatus('Synced with Supabase');
 },[user,localReady,timeReady,setWorkspace,setTime]);
 useEffect(()=>{
  if(stage!=='ready'||!user||!localReady||!timeReady)return;
  const snapshot=JSON.stringify({workspace:localWorkspace,time:localTime});
  if(snapshot===baseline.current){setDirty(false);return;}
  setDirty(true);setStatus('Unsaved changes...');
  const id=window.setTimeout(async()=>{
   if(accountRef.current!==user.id||saving.current)return;
   saving.current=true;
   const expected=revision.current;
   setStatus('Saving to Supabase...');
   const savingWorkspace=workspaceRef.current,savingTime=timeRef.current;
   const submitted=JSON.stringify({workspace:savingWorkspace,time:savingTime});
   try{
    const {data,error}=await supabase.rpc('shipit_save_v7',{
     p_workspace:savingWorkspace,p_time:savingTime,p_expected_revision:expected
    });
    if(accountRef.current!==user.id)return;
    if(error){setError(error.message);setStatus(error.code==='40001'?'Sync conflict — export backup and reload':'Save failed — export backup and retry');if(error.code==='40001')setStage('error');return;}
    if(data===null){setError('Workspace revision conflict. Export a backup before refreshing.');setStatus('Sync conflict');setStage('error');return;}
    revision.current=Number(data);
    baseline.current=submitted;
    const upToDate=JSON.stringify({workspace:workspaceRef.current,time:timeRef.current})===submitted;
    setDirty(!upToDate);setError('');setStatus(upToDate?'Synced with Supabase':'More changes to save...');
   }catch(err){setError(err instanceof Error?err.message:'Cloud save failed');setStatus('Save failed — export backup and retry');}
   finally{saving.current=false;setSaveTick(x=>x+1);}
  },delay);
  return()=>window.clearTimeout(id);
 },[stage,user,localReady,timeReady,localWorkspace,localTime,saveTick]);
 const signOut=useCallback(async()=>{if(dirty){setError('You have unsaved changes. Wait until sync completes or export a backup before signing out.');return;}const {error}=await supabase.auth.signOut();if(error)setError(error.message);},[dirty]);
 return {user,stage,status,error,init,signOut,load,dirty};
}
