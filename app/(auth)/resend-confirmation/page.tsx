import type { Metadata } from 'next';
import { ResendConfirmation } from '@/components/auth/resend-confirmation';
export const metadata:Metadata={title:'Resend confirmation | Ship It',robots:{index:false,follow:false}};
export default function ResendConfirmationPage(){return <ResendConfirmation/>;}
