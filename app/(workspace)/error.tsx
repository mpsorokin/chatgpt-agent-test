'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function WorkspaceError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{
  // Do not report task content, auth tokens or personal data in telemetry.
  console.error('Ship It route error',error.name,error.digest??'untracked');
 },[error]);
 return <main className="cloud-setup"><section className="cloud-setup-card">
  <h1>Something went wrong</h1>
  <p>The page encountered an unexpected error. Avoid reloading if the sync indicator showed unsaved changes: your browser may have a recoverable draft.</p>
  <div className="cloud-setup-actions"><button onClick={()=>reset()}>Try again</button><Link href="/dashboard">Return to dashboard</Link></div>
  <p className="cloud-footnote">If the issue persists, record the steps that caused it and check the GitHub issue tracker. Do not paste access tokens or passwords.</p>
 </section></main>;
}
