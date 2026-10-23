import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
export const metadata:Metadata={title:'Reset password | Ship It',robots:{index:false,follow:false}};
export default function ResetPasswordPage(){return <AuthForm mode="reset-password"/>;}
