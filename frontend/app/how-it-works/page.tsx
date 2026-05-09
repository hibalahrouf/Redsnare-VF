'use client'

import React from 'react';
import { 
  Shield, Target, Scale, Zap, Lock, Unlock, 
  Coins, UserCheck, AlertTriangle, CheckCircle,
  FileText, MessageSquare, Database, ArrowRight,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 animate-fade-in">
       <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[--bg-secondary] border border-[--border-default] mb-10 shadow-xl">
             <div className="w-2 h-2 rounded-full bg-[--rs-red] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-secondary]">
                Autonomous Security Infrastructure
             </span>
          </div>
          <h1 className="text-6xl font-black text-[--text-primary] mb-8 tracking-tighter uppercase leading-[0.95]">
             How RedSnare <span className="text-[--rs-red]">Works</span>
          </h1>
          <p className="text-xl text-[--text-secondary] max-w-2xl mx-auto leading-relaxed font-medium">
             A decentralized, end-to-end encrypted bug bounty protocol 
             designed to secure the future of decentralized finance.
          </p>
       </div>

       {/* Step by Step Flow */}
       <div className="space-y-40">
          {/* Step 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="order-2 md:order-1">
                <div className="w-14 h-14 rounded-2xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center text-[--rs-red] font-black text-xl mb-8 shadow-lg">01</div>
                <h2 className="text-4xl font-black text-[--text-primary] mb-8 flex items-center gap-4 uppercase tracking-tight">
                   <Lock className="w-10 h-10 text-[--rs-red]" /> Secure Submission
                </h2>
                <p className="text-[--text-secondary] text-lg leading-relaxed mb-10 font-medium">
                   Researchers submit vulnerabilities via our E2E encrypted interface. 
                   Data is encrypted in the browser using <span className="text-[--text-primary] font-bold">AES-256-GCM</span>. 
                   Only the designated committee can access the proof of concept.
                </p>
                <div className="p-8 rounded-3xl bg-[--bg-secondary] border border-[--border-default] space-y-4 shadow-inner">
                   <div className="flex items-center gap-3 text-sm text-emerald-500 font-black uppercase tracking-widest">
                      <CheckCircle className="w-5 h-5" /> Privacy First
                   </div>
                   <p className="text-xs text-[--text-tertiary] italic font-medium leading-relaxed">
                      "Metadata (CID, Hash) is public on IPFS, but the critical evidence remains encrypted until the validation phase."
                   </p>
                </div>
             </div>
             <div className="order-1 md:order-2 rs-card p-12 bg-[--bg-secondary] border-[--border-default] flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--rs-red-glow),transparent_70%)] opacity-20" />
                <div className="relative">
                   <div className="w-56 h-72 bg-[--bg-primary] rounded-[2.5rem] border border-[--border-subtle] flex flex-col p-6 shadow-2xl">
                      <div className="h-5 w-2/3 bg-[--border-default] rounded-lg mb-6" />
                      <div className="flex-1 space-y-3">
                         <div className="h-3 w-full bg-[--border-default] opacity-50 rounded" />
                         <div className="h-3 w-full bg-[--border-default] opacity-30 rounded" />
                         <div className="h-3 w-1/2 bg-[--border-default] opacity-20 rounded" />
                      </div>
                   </div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-8 rounded-[2rem] bg-[--rs-red] shadow-2xl shadow-[--rs-red-glow]">
                      <Shield className="w-12 h-12 text-white animate-pulse" />
                   </div>
                </div>
             </div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="rs-card p-12 bg-[--bg-secondary] border-[--border-default] flex flex-col gap-8 shadow-2xl">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-[--bg-primary] border border-[--border-subtle]">
                   <UserCheck className="w-8 h-8 text-emerald-500" />
                   <div className="text-[10px] font-black text-[--text-primary] uppercase tracking-[0.2em]">Consensus Engine</div>
                </div>
                <div className="space-y-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="h-4 w-full bg-[--bg-primary] rounded-full relative overflow-hidden border border-[--border-subtle]">
                        <div className={`absolute inset-0 bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]`} style={{ width: i === 1 ? '100%' : i === 2 ? '80%' : '30%' }} />
                     </div>
                   ))}
                </div>
             </div>
             <div>
                <div className="w-14 h-14 rounded-2xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center text-emerald-500 font-black text-xl mb-8 shadow-lg">02</div>
                <h2 className="text-4xl font-black text-[--text-primary] mb-8 flex items-center gap-4 uppercase tracking-tight">
                   <Scale className="w-10 h-10 text-emerald-500" /> Multi-Sig Validation
                </h2>
                <p className="text-[--text-secondary] text-lg leading-relaxed mb-10 font-medium">
                   Elected committee members use their private keys to decrypt and review the reports. 
                   A consensus (threshold K-of-N) is required to trigger automated token releases.
                </p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 rounded-3xl bg-[--bg-secondary] border border-[--border-default] text-center shadow-inner">
                      <div className="text-3xl font-black text-[--text-primary]">2/3</div>
                      <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mt-2">Majority</div>
                   </div>
                   <div className="p-6 rounded-3xl bg-[--bg-secondary] border border-[--border-default] text-center shadow-inner">
                      <div className="text-3xl font-black text-emerald-500">TRUST</div>
                      <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mt-2">Validation</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Step 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="order-2 md:order-1">
                <div className="w-14 h-14 rounded-2xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center text-amber-500 font-black text-xl mb-8 shadow-lg">03</div>
                <h2 className="text-4xl font-black text-[--text-primary] mb-8 flex items-center gap-4 uppercase tracking-tight">
                   <AlertTriangle className="w-10 h-10 text-amber-500" /> Dispute Resolution
                </h2>
                <p className="text-[--text-secondary] text-lg leading-relaxed mb-10 font-medium">
                   Fairness is guaranteed through a commit-reveal dispute process. Researchers can challenge verdicts, 
                   triggering an isolated re-evaluation phase by the committee.
                </p>
                <div className="p-8 rounded-3xl bg-[--bg-secondary] border border-[--border-default] shadow-inner">
                   <h4 className="text-[10px] font-black text-[--text-primary] uppercase tracking-[0.2em] mb-6">Commit-Reveal Cycle</h4>
                   <div className="flex items-center justify-between text-[9px] text-[--text-tertiary] font-black">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[--bg-primary] border border-[--border-subtle] flex items-center justify-center text-amber-500">1</div>
                         <span>COMMIT</span>
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-30" />
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[--bg-primary] border border-[--border-subtle] flex items-center justify-center text-[--rs-red]">2</div>
                         <span>REVEAL</span>
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-30" />
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[--bg-primary] border border-[--border-subtle] flex items-center justify-center text-emerald-500">3</div>
                         <span>PAYOUT</span>
                      </div>
                   </div>
                </div>
             </div>
             <div className="order-1 md:order-2 rs-card p-16 bg-[--bg-secondary] border-[--border-default] flex items-center justify-center shadow-2xl">
                <Scale className="w-40 h-40 text-amber-500 opacity-20" />
             </div>
          </div>
       </div>

       {/* Final CTA */}
       <div className="mt-40 p-16 rs-card bg-gradient-to-br from-[--bg-secondary] to-[--bg-elevated] border-[--rs-red-border] text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[--rs-red] to-transparent" />
          <h2 className="text-4xl font-black text-[--text-primary] mb-10 uppercase tracking-tight">Ready to Secure the Protocol?</h2>
          <div className="flex flex-wrap justify-center gap-6">
             <Link href="/submit" className="rs-btn rs-btn-primary px-12 py-5 text-sm uppercase tracking-widest font-black shadow-2xl shadow-[--rs-red-glow]">
                Launch First Report
             </Link>
             <Link href="/" className="rs-btn rs-btn-secondary px-12 py-5 text-sm uppercase tracking-widest font-black">
                Browse Bounties
             </Link>
          </div>
       </div>
    </div>
  );
}
