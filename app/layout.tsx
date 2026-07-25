import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hermes Agent 学习教程',
  description: '从用会 Hermes，到深入原理，到自己设计 agent，达到面试要求。',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
