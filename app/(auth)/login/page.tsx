import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
export const metadata:Metadata={title:'Sign in | Ship It',robots:{index:false,follow:false}};
export default function LoginPage(){return <AuthForm mode="login"/>;}
