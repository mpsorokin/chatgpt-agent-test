'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
const MODES=[{label:'Focus',min:25},{label:'Short break',min:5},{label:'Long break',min:15}] as const;
export function FocusTimer(){
 const [mode,setMode]=useState<number>(0),[remaining,setRemaining]=useState<number>(1500),[running,setRunning]=useState(false);
 const end=useRef(0);
 useEffect(()=>{
  if(!running)return;
  const id=window.setInterval(()=>{const left=Math.max(0,Math.ceil((end.current-Date.now())/1000));setRemaining(left);if(left===0)setRunning(false)},200);
  return ()=>window.clearInterval(id);
 },[running]);
 const changeMode=(i:number)=>{setMode(i);setRunning(false);setRemaining(MODES[i].min*60)};
 const toggle=()=>{if(!running){end.current=Date.now()+remaining*1000;}else{setRemaining(Math.max(0,Math.ceil((end.current-Date.now())/1000)))}setRunning(!running)};
 return <section className="focus-panel"><div className="focus-head"><span className="focus-kicker"><Sparkles size={14}/> DEEP WORK STUDIO</span><span className="focus-orbit">✳</span></div><h3>Find your flow.</h3><p>One task at a time. That&apos;s how great things happen.</p>
 <div className="focus-pills">{MODES.map((m,i)=><button key={m.label} onClick={()=>changeMode(i)} className={mode===i?'selected':''}>{m.label}</button>)}</div>
 <div className="timer-text" role="timer" aria-label="Time remaining">{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</div>
 <div className="timer-track"><div style={{width:`${100-(remaining/(MODES[mode].min*60))*100}%`}}/></div>
 <div className="timer-buttons"><button className="timer-play" onClick={toggle}>{running?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}{running?'Pause session':remaining===0?'Start again':'Start focusing'}</button><button className="timer-reset" onClick={()=>changeMode(mode)} aria-label="Reset timer"><RotateCcw size={18}/></button></div>
 </section>
}
