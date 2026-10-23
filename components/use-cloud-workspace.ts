'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Workspace } from '@/lib/model';
import type { TimeState } from '@/lib/time-tracking';
import { normalizeWorkspace } from '@/lib/storage';
import { emptyTimeState, normalizeTimeState } from '@/lib/time-tracking';
import { DEFAULT_PROJECTS } from '@/lib/model';
import { supabase } from '@/lib/supabase';
import { serializeCloudState,hasUnsavedCloudChanges,cloudRetryDelay } from '@/lib/cloud-sync';

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
 const loadingUser=useRef<string|null>(null);
 const requestId=useRef(0);
 const dirtyRef=useRef(false);
 const [saveTick,setSaveTick]=useState(0);
 const consecutiveFailures=useRef(0);
 const load=useCallback(async(user:User)=>{
  if(loadingUser.current===user.id)return;
  const generation=++requestId.current;
  loadingUser.current=user.id;loadingRef.current=true;accountRef.current=user.id;baseline.current='';setStage('loading');setError('');setStatus('Loading cloud workspace...');
  try{
   const {data,error}=await supabase.rpc('shipit_load_v7');
   if(error)throw error;
   if(accountRef.current!==user.id||requestId.current!==generation)return;
   if(!data){setStage('setup');setStatus('Choose how to initialize your cloud workspace');return;}
   const row=data as CloudRow;
   const normalized=normalizeWorkspace(row.workspace),time=normalizeTimeState(row.time_tracking);
   if(!normalized||!time)throw Error('Cloud data is invalid. Nothing was overwritten.');
   consecutiveFailures.current=0;revision.current=Number(row.revision);baseline.current=serializeCloudState(normalized,time);dirtyRef.current=false;
   setWorkspace(normalized);setTime(time);setStage('ready');setStatus('Synced with Supabase');setDirty(false);
  }catch(e){if(accountRef.current===user.id&&requestId.current===generation){setError(e instanceof Error?e.message:'Cloud load failed');setStage('error');setStatus('Sync unavailable');}}
  finally{if(requestId.current===generation){loadingRef.current=false;loadingUser.current=null;}}
 },[setWorkspace,setTime]);
 useEffect(()=>{
  let valid=true;
  const apply=(u:User|null)=>{
   if(!valid)return;
   if(u?.id===accountRef.current&&accountRef.current)return;
   if(!u){
    const previousUser=accountRef.current;
    requestId.current++;loadingUser.current=null;loadingRef.current=false;accountRef.current='';
    baseline.current='';revision.current=0;dirtyRef.current=false;consecutiveFailures.current=0;
    // First visit: preserve genuine legacy browser data for explicit migration.
    // After an authenticated sign-out: wipe the previous account from memory.
    if(previousUser){
     setWorkspace({tasks:[],projects:DEFAULT_PROJECTS.map(p=>({...p})),sprints:[]});
     setTime(emptyTimeState());
    }
    setUser(null);setStage('signedout');setStatus('Signed out');setDirty(false);return;
   }
   // Never allow account B to import or briefly display account A's in-memory data.
   if(accountRef.current&&accountRef.current!==u.id){
    setWorkspace({tasks:[],projects:DEFAULT_PROJECTS.map(p=>({...p})),sprints:[]});
    setTime(emptyTimeState());
   }
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
  const {data,error}=await supabase.rpc('shipit_save_v8',{p_workspace:workspace,p_time:time,p_expected_revision:0});
  if(error){setError(error.message);setStatus('Could not initialize workspace');return;}
  consecutiveFailures.current=0;revision.current=Number(data);baseline.current=serializeCloudState(workspace,time);dirtyRef.current=false;
  setWorkspace(workspace);setTime(time);setStage('ready');setStatus('Synced with Supabase');
 },[user,localReady,timeReady,setWorkspace,setTime]);
 useEffect(()=>{
  if(stage!=='ready'||!user||!localReady||!timeReady)return;
  const snapshot=serializeCloudState(localWorkspace,localTime);
  if(snapshot===baseline.current){dirtyRef.current=false;setDirty(false);return;}
  dirtyRef.current=true;setDirty(true);setStatus('Unsaved changes...');
  const id=window.setTimeout(async()=>{
   if(accountRef.current!==user.id||saving.current)return;
   saving.current=true;
   const expected=revision.current;
   setStatus('Saving to Supabase...');
   const savingWorkspace=workspaceRef.current,savingTime=timeRef.current;
   const submitted=serializeCloudState(savingWorkspace,savingTime);
   try{
    const {data,error}=await supabase.rpc('shipit_save_v8',{
     p_workspace:savingWorkspace,p_time:savingTime,p_expected_revision:expected
    });
    if(accountRef.current!==user.id)return;
    if(error){
     consecutiveFailures.current++;
     setError(error.message);
     if(error.code==='40001'||consecutiveFailures.current>=3){
      setStatus(error.code==='40001'?'Sync conflict — export backup and reload':'Repeated save failures — export backup before reloading');
      setStage('error');
     }else{
      setStatus('Save failed — retrying with backoff');
     }
     return;
    }
    if(data===null){setError('Workspace revision conflict. Export a backup before refreshing.');setStatus('Sync conflict');setStage('error');return;}
    consecutiveFailures.current=0;
    revision.current=Number(data);
    baseline.current=submitted;
    const upToDate=!hasUnsavedCloudChanges(workspaceRef.current,timeRef.current,submitted);
    dirtyRef.current=!upToDate;setDirty(!upToDate);setError('');setStatus(upToDate?'Synced with Supabase':'More changes to save...');
   }catch(err){
    consecutiveFailures.current++;
    setError(err instanceof Error?err.message:'Cloud save failed');
    if(consecutiveFailures.current>=3){
     setStatus('Repeated save failures — export backup before reloading');
     setStage('error');
    }else setStatus('Network error — retrying with backoff');
   }
   finally{saving.current=false;setSaveTick(x=>x+1);}
  },cloudRetryDelay(consecutiveFailures.current,delay));
  return()=>window.clearTimeout(id);
 },[stage,user,localReady,timeReady,localWorkspace,localTime,saveTick]);
 useEffect(()=>{
  if(stage!=='ready'&&stage!=='error')return;
  const handler=(event:BeforeUnloadEvent)=>{
   const changed=hasUnsavedCloudChanges(workspaceRef.current,timeRef.current,baseline.current);
   if(!saving.current&&!dirtyRef.current&&!changed)return;
   event.preventDefault();
   event.returnValue='';
  };
  window.addEventListener('beforeunload',handler);
  return()=>window.removeEventListener('beforeunload',handler);
 },[stage]);
 const signOut=useCallback(async()=>{
  // During first-time setup there is no cloud baseline: allow cancelling signup.
  const changed=stage!=='setup'&&hasUnsavedCloudChanges(workspaceRef.current,timeRef.current,baseline.current);
  if(saving.current||(stage!=='setup'&&(dirtyRef.current||changed))){
   setError('You have unsaved changes. Wait for Supabase sync or export a backup before signing out.');return;
  }
  const {error}=await supabase.auth.signOut();if(error)setError(error.message);
 },[stage]);
 return {user,stage,status,error,init,signOut,load,dirty};
}
