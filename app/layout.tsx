import type { Metadata, Viewport } from 'next';
import './globals.css';
import './time-tracking.css';

export const metadata: Metadata = {
  title: 'Ship It — Make progress feel good',
  description: 'A thoughtful workspace for the work that matters. Private, fast, and made for focus.',
  applicationName: 'Ship It',
};
export const viewport: Viewport = { themeColor: '#f6f7fc', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
