import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
export const metadata:Metadata={title:'Create account | Ship It',robots:{index:false,follow:false}};
export default function RegisterPage(){return <AuthForm mode="register"/>;}
