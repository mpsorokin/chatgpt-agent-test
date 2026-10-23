'use client';
import { useState,type FormEvent } from 'react';
import Link from 'next/link';
import { MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { absoluteAuthUrl } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

export function ResendConfirmation(){
 const [email,setEmail]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(busy)return;
  setBusy(true);setError('');setSent(false);
  try{
   const redirect=absoluteAuthUrl('/auth/callback',window.location.origin);
   const result=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:redirect}});
   if(result.error)throw result.error;
   setSent(true);
  }catch(e){
   setError(e instanceof Error?e.message:'Could not send a new confirmation email.');
  }finally{setBusy(false);}
 };
 return <main className="cloud-gate auth-gate">
  <section className="cloud-auth-card auth-card" aria-labelledby="resend-title">
   <div className="cloud-symbol"><MailCheck size={24}/></div>
   <span className="cloud-kicker">VERIFY YOUR ACCOUNT</span>
   <h1 id="resend-title">Need to confirm your email?</h1>
   <p>Already confirmed your account? <Link href="/login">Sign in directly</Link> — Supabase will not send another signup confirmation for an already verified address.</p>
   <p>If confirmation is still pending, request a new link below.</p>
   <form onSubmit={submit}>
    <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <button type="submit" disabled={busy}><RefreshCw size={16} aria-hidden="true"/> {busy?'Sending…':'Resend confirmation email'}</button>
   </form>
   {sent&&<div className="auth-feedback auth-success" role="status">Request accepted. This does <strong>not</strong> confirm that an email was sent. Already-verified accounts will not receive another confirmation message. <Link href="/login">Try signing in</Link>. If the address still needs verification, check your inbox and spam folder.</div>}
   {error&&<p className="auth-feedback auth-error" role="alert">{error}</p>}
   <div className="auth-switch"><Link href="/login">I already have an account — sign in</Link> · <Link href="/register">Create an account</Link></div>
   <div className="cloud-footnote"><ShieldCheck size={16}/> Confirmation links are single-use and time-limited.</div>
  </section>
 </main>;
}
