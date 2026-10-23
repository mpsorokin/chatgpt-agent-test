'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { readAuthLinkError } from '@/lib/auth-errors';

export function RootRedirect(){
 const router=useRouter();
 useEffect(()=>{
  let live=true;
  // Hosted Supabase may fall back to the Site URL with an error fragment.
  if(readAuthLinkError(window.location.hash)){router.replace('/resend-confirmation');return;}
  void supabase.auth.getUser().then(({data})=>{if(live)router.replace(data.user?'/dashboard':'/login');})
   .catch(()=>{if(live)router.replace('/login');});
  return()=>{live=false;};
 },[router]);
 return <main className="cloud-gate"><div className="cloud-auth-card"><h1>Opening Ship It…</h1><p>Checking your session.</p></div></main>;
}
export function AuthCallback(){
 const router=useRouter();
 const [error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const linkError=readAuthLinkError(window.location.hash);
  if(linkError){setError(linkError.message);return;}
  const complete=async()=>{
   // Supabase JS processes implicit auth tokens or PKCE code in the redirect URL.
   const {data,error}=await supabase.auth.getSession();
   if(!alive)return;
   if(error){setError(error.message);return;}
   if(data.session){router.replace('/dashboard');return;}
   setError('Confirmation link expired or invalid. Please try signing in.');
  };
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(!alive)return;
   if(event==='SIGNED_IN'&&session)router.replace('/dashboard');
  });
  void complete();
  return()=>{alive=false;subscription.unsubscribe();};
 },[router]);
 return <main className="cloud-gate"><div className="cloud-auth-card"><h1>Confirming your account…</h1><p>{error||'Securing your session and opening your workspace.'}</p>{error&&<div className="auth-recovery-actions"><Link href="/resend-confirmation">Resend confirmation email</Link><Link href="/login">Return to login</Link></div>}</div></main>;
}
