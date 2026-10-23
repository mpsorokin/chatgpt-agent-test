import Link from 'next/link';
export default function NotFound(){return <main className="cloud-gate"><section className="cloud-auth-card"><span className="cloud-kicker">404 · PAGE NOT FOUND</span><h1>That page doesn't exist.</h1><p>The link may have changed. Your workspace data hasn't gone anywhere.</p><p><Link href="/dashboard">Return to dashboard →</Link></p></section></main>;}
