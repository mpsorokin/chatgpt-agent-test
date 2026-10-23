'use client';
import { useCallback, useEffect, useState } from 'react';
import { addManualEntry, deleteTimeEntry, emptyTimeState, normalizeTimeState, startTimer, stopTimer, TIME_STORAGE_KEY, type TimeState, type TimerTarget } from '@/lib/time-tracking';

export function useTimeTracking(){
 const [time,setTime]=useState<TimeState>(emptyTimeState);
 const [ready,setReady]=useState(false);
 const [now,setNow]=useState(0);
 const [warning,setWarning]=useState('');
 useEffect(()=>{
  try{
   const saved=window.localStorage.getItem(TIME_STORAGE_KEY);
   if(saved!==null){
    const parsed=normalizeTimeState(JSON.parse(saved));
    if(parsed)setTime(parsed);
    else setWarning('Saved time entries could not be read. Export a backup before changing them.');
   }
  }catch{setWarning('Time tracking storage is unavailable or corrupt. Export a backup if needed.');}
  setNow(Date.now());setReady(true);
 },[]);
 useEffect(()=>{
  if(!ready)return;
  try{window.localStorage.setItem(TIME_STORAGE_KEY,JSON.stringify(time));}
  catch{setWarning('Time entries could not be saved. Export a backup.');}
 },[time,ready]);
 useEffect(()=>{
  if(!ready||!time.active)return;
  const id=window.setInterval(()=>setNow(Date.now()),1000);
  return ()=>window.clearInterval(id);
 },[ready,!!time.active]);
 const start=useCallback((target:TimerTarget)=>{
  const instant=Date.now();setNow(instant);setTime(prev=>startTimer(prev,target,instant));
 },[]);
 const stop=useCallback(()=>{
  const instant=Date.now();setNow(instant);setTime(prev=>stopTimer(prev,instant));
 },[]);
 const add=useCallback((target:TimerTarget,date:string,minutes:number)=>{
  setTime(prev=>addManualEntry(prev,target,date,minutes));
 },[]);
 const remove=useCallback((id:string)=>setTime(prev=>deleteTimeEntry(prev,id)),[]);
 const replace=useCallback((state:TimeState)=>setTime(state),[]);
 return {time,now,ready,warning,start,stop,add,remove,replace};
}
