import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { AppWrapper } from '@/components/AppWrapper';

export const metadata: Metadata = {
  title: 'RedSnare — Decentralized Bug Bounty Protocol',
  description: 'Trustless, on-chain bug bounty platform with encrypted submissions, committee governance, and automated escrow payouts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#0A0A0A] text-white font-sans">
        <Providers>
          <AppWrapper>
            {children}
          </AppWrapper>
        </Providers>
      </body>
    </html>
  );
}
