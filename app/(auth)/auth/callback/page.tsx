import type { Metadata } from 'next';
import { AuthCallback } from '@/components/auth/auth-redirect';
export const metadata:Metadata={title:'Confirm your account | Ship It',robots:{index:false,follow:false}};
export default function AuthCallbackPage(){return <AuthCallback/>;}
