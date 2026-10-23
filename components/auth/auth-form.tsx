'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { absoluteAuthUrl } from '@/lib/routes';
import { readAuthLinkError } from '@/lib/auth-errors';
import { RELEASE_LABEL } from '@/lib/build-info';

type Mode='login'|'register'|'forgot-password'|'reset-password';
const modeCopy:Record<Mode,{title:string;description:string;button:string}>={
 login:{title:'Welcome back.',description:'Your projects, plans and time logs. All in one place.',button:'Sign in'},
 register:{title:'Start shipping smarter.',description:'Create your private cloud workspace in seconds.',button:'Create account'},
 'forgot-password':{title:'Reset your password.',description:"Enter the email for your account. We’ll send you a secure reset link.",button:'Send reset link'},
 'reset-password':{title:'Choose a new password.',description:'Protect your workspace with a new password.',button:'Update password'},
};
export function AuthForm({mode}:{mode:Mode}){
 const router=useRouter();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 const [authorized,setAuthorized]=useState(mode!=='reset-password');
 useEffect(()=>{
  let mounted=true;
  if(mode==='login'||mode==='register'||mode==='forgot-password'){
   void supabase.auth.getUser().then(({data})=>{if(mounted&&data.user)router.replace('/dashboard');});
  } else {
   // Supabase redirects invalid recovery links with an error fragment.
   const linkError=readAuthLinkError(window.location.hash);
   if(linkError){setAuthorized(false);setError(linkError.message);return;}
   void supabase.auth.getUser().then(({data})=>{if(mounted){setAuthorized(Boolean(data.user));if(!data.user)setError('Open a valid password recovery link from your email first.');}});
  }
  return ()=>{mounted=false;};
 },[mode,router]);
 const submit=async(event:FormEvent)=>{
  event.preventDefault();if(busy)return;
  setError('');setMessage('');
  if(mode==='register'&&password!==confirm){setError('Passwords do not match.');return;}
  if(mode==='reset-password'&&password!==confirm){setError('Passwords do not match.');return;}
  setBusy(true);
  try{
   if(mode==='login'){
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)throw error;
    router.replace('/dashboard');
   }else if(mode==='register'){
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:absoluteAuthUrl('/auth/callback',window.location.origin)}});
    if(error)throw error;
    if(data.session)router.replace('/dashboard');
    else setMessage('Request processed. If this is a new unverified account, check your inbox for a confirmation link. Already signed up or confirmed? Sign in with your existing password — Supabase may not send another email.');
   }else if(mode==='forgot-password'){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:absoluteAuthUrl('/reset-password',window.location.origin)});
    if(error)throw error;
    setMessage('If an account exists for that email, a password reset link has been sent.');
   }else {
    const {error}=await supabase.auth.updateUser({password});
    if(error)throw error;
    setMessage('Password updated. You can return to your workspace.');
    setPassword('');setConfirm('');
   }
  }catch(err){setError(err instanceof Error?err.message:'Something went wrong. Try again.');}
  finally{setBusy(false);}
 };
 const copy=modeCopy[mode];
 return <main className="cloud-gate auth-gate">
  <section className="cloud-auth-card auth-card" aria-labelledby="auth-title">
   <Link href="/" className="auth-brand"><span><Sparkles size={21}/></span><strong>shipit<span>.</span></strong></Link>
   <span className="cloud-kicker">YOUR CLOUD WORKSPACE</span>
   <h1 id="auth-title">{copy.title}</h1><p>{copy.description}</p>
   <form onSubmit={submit} className="auth-form">
    {mode!=='reset-password'&&<label>Email address<div className="auth-input-wrap"><Mail size={16}/><input required type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div></label>}
    {mode!=='forgot-password'&&<label>{mode==='reset-password'?'New password':'Password'}<div className="auth-input-wrap"><LockKeyhole size={16}/><input required type={show?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} minLength={8} maxLength={128} placeholder="At least 8 characters" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="auth-eye" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(x=>!x)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
    {(mode==='register'||mode==='reset-password')&&<label>Confirm password<div className="auth-input-wrap"><LockKeyhole size={16}/><input required type={show?'text':'password'} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></label>}
    {mode==='login'&&<Link href="/forgot-password" className="auth-forgot-link">Forgot password?</Link>}
    <button className="auth-submit" type="submit" disabled={busy||!authorized}>{busy?'Working…':copy.button}<ArrowRight size={16}/></button>
   </form>
   {error&&<p className="auth-feedback auth-error" role="alert">{error}</p>}
   {message&&<p className="auth-feedback auth-success" role="status">{message}</p>}
   {mode==='register'&&<p className="auth-resend-hint">Already verified or registering again? <Link href="/login">Sign in instead</Link>. Still waiting for verification? <Link href="/resend-confirmation">Request a new confirmation link</Link>.</p>}
   {mode==='login'&&error.toLowerCase().includes('email not confirmed')&&<p className="auth-resend-hint">Email not confirmed yet? <Link href="/resend-confirmation">Get a new confirmation link</Link></p>}
   {mode==='reset-password'&&error&&<p className="auth-resend-hint"><Link href="/forgot-password">Request a fresh password reset link</Link></p>}
   <div className="auth-switch">
    {mode==='login'&&<>New to Ship It? <Link href="/register">Create an account</Link></>}
    {mode==='register'&&<>Already have an account? <Link href="/login">Sign in</Link></>}
    {mode==='forgot-password'&&<>Remembered it? <Link href="/login">Back to sign in</Link></>}
    {mode==='reset-password'&&<Link href="/login">Go to sign in</Link>}
   </div>
   <div className="cloud-footnote"><ShieldCheck size={16}/> Private data protected by Supabase authentication and PostgreSQL RLS.</div><p className="auth-release" aria-label="Deployed release">Ship It {RELEASE_LABEL}</p>
  </section>
 </main>;
}
