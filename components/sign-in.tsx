'use client';
import { useState, type FormEvent } from 'react';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function SignIn({errorText}:{errorText?:string}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [mode,setMode]=useState<'signin'|'signup'>('signin');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setBusy(true);setMessage('');
  try{
   const {error}=mode==='signin'
    ?await supabase.auth.signInWithPassword({email,password})
    :await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}});
   if(error)throw error;
   if(mode==='signup')setMessage('Account created. Check your email for a confirmation link, then sign in.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to authenticate');}
  finally{setBusy(false);}
 };
 return <div className="cloud-gate"><div className="cloud-auth-card">
  <div className="cloud-symbol"><LockKeyhole size={25}/></div>
  <span className="cloud-kicker">SHIP IT / CLOUD WORKSPACE</span>
  <h1>{mode==='signin'?'Welcome back.':'Create your account.'}</h1>
  <p>Secure access to your tasks, sprints, Gantt plans and tracked time from any device.</p>
  <form onSubmit={submit}>
   <label>Email address<input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button type="submit" disabled={busy}>{busy?'Working...':mode==='signin'?'Sign in':'Sign up'}</button>
  </form>
  {(message||errorText)&&<p className="cloud-auth-message" role="status">{message||errorText}</p>}
  <button className="cloud-link" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('');}}>{mode==='signin'?"Don't have an account? Create one":"Already registered? Sign in"}</button>
  <div className="cloud-footnote"><ShieldCheck size={16}/> Supabase Auth + private PostgreSQL data protected by Row Level Security</div>
 </div></div>;
}
