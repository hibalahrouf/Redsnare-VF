'use client'
import React, { useState } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { NetworkGuard } from '@/components/NetworkGuard';
import LocalInbox from '@/components/LocalInbox';
import { Toaster } from 'sonner';
import { RedSnareLogo } from '@/components/RedSnareLogo';
import { OnboardingTour } from '@/components/OnboardingTour';
import { IntroAnimation } from '@/components/IntroAnimation';

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [introFinished, setIntroFinished] = useState(false);

  // Check if intro was already played in this session (to avoid re-playing on reload)
  React.useEffect(() => {
    const played = sessionStorage.getItem('rs-intro-played');
    if (played === 'true') {
      setIntroFinished(true);
    }
  }, []);

  const handleIntroComplete = () => {
    setIntroFinished(true);
    sessionStorage.setItem('rs-intro-played', 'true');
  };

  return (
    <>
      {!introFinished && <IntroAnimation onComplete={handleIntroComplete} />}
      
      <ThemeProvider>
        {/* ─── Global Background Logo (Rotating) ─── */}
        {introFinished && (
          <>
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center" style={{ opacity: 'var(--logo-ghost-opacity)' }}>
                <RedSnareLogo useCurrentColor className="w-[1200px] h-[1200px] md:w-[1600px] md:h-[1600px] animate-slow-spin text-[--rs-red]" />
              </div>
            </div>

            {/* Global Hero Glow */}
            <div className="fixed inset-0 pointer-events-none z-[-1]"
              style={{ background: 'var(--hero-bg)' }} />
          </>
        )}

        <Navbar />
        <OnboardingTour />
        <NetworkGuard>
          <main className="flex-1 pt-16 min-h-screen flex flex-col">{children}</main>
        </NetworkGuard>
        <LocalInbox />
        <Footer />
        <Toaster position="bottom-right" richColors closeButton />
      </ThemeProvider>
    </>
  );
}
