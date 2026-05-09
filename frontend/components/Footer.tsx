import React from 'react';
import { RedSnareLogo } from './RedSnareLogo';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[--rs-black-border] bg-[--rs-black-mid] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-[--rs-text]">
            <div className="w-8 h-8">
              <RedSnareLogo className="w-full h-full text-[--rs-red]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight uppercase" style={{ fontFamily: 'var(--rs-font-logo)' }}>
                RED<span className="text-[--rs-text-dim]">SNARE</span>
              </span>
              <span className="text-[9px] text-[--rs-text-dim] font-bold uppercase tracking-widest">Decentralized Security Protocol</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[9px] font-bold text-[--rs-text-dim] uppercase tracking-widest">
            <span className="hover:text-[--rs-text] transition-colors cursor-default">AES-256-GCM Encrypted</span>
            <span className="hidden sm:inline opacity-20">|</span>
            <span className="hover:text-[--rs-text] transition-colors cursor-default">IPFS Backed Submissions</span>
            <span className="hidden sm:inline opacity-20">|</span>
            <span className="hover:text-[--rs-text] transition-colors cursor-default">© 2026 RedSnare Network</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
