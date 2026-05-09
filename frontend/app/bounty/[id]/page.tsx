'use client'

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { 
  Shield, Target, Coins, Users, Clock, Zap, 
  ExternalLink, Send, AlertCircle, FileText,
  Lock, Globe, Scale, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function BountyDetailPage() {
  const params = useParams();
  const bountyId = BigInt(params.id as string);
  const { isConnected } = useAccount();

  // Fetch Bounty Core & State
  const { data: core } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyCore',
    args: [bountyId],
  });

  const { data: state } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyState',
    args: [bountyId],
  });

  const { data: reportCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'reportCount',
    args: [bountyId],
  });

  if (!core || !state) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const token = getTokenByAddress((core as any)[1]);
  const rewardAmount = (core as any)[2];
  const isActive = (state as any)[5];
  const escrowBalance = (state as any)[6];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[--text-tertiary] mb-8 uppercase font-black tracking-widest">
        <Link href="/" className="hover:text-[--rs-red] transition-colors">Explorer</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[--text-primary]">Bounty #{params.id}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Core Info */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass-card p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
             
             <div className="flex justify-between items-start mb-8 relative">
                <div className="flex gap-6 items-center">
                   <div className="w-20 h-20 rounded-3xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center shadow-2xl">
                      <img src={token?.logoUrl} alt={token?.symbol} className="w-10 h-10" />
                   </div>
                   <div>
                      <h1 className="text-4xl font-black text-[--text-primary] mb-2 tracking-tight">Program Instance #{params.id}</h1>
                      <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[--rs-red-bg] text-[--rs-red] border-[--rs-red-border]'}`}>
                             {isActive ? 'Active & Funding' : 'Paused'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-[--bg-secondary] border border-[--border-default] text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">
                             {token?.symbol} Mainnet
                          </span>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 rounded-lg bg-[--bg-elevated] border border-[--border-default] text-[9px] font-black text-[--text-tertiary] hover:text-[--rs-red] transition-all uppercase">Pause</button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-6 relative">
                <h3 className="text-xl font-black text-[--text-primary]">Security Scope & Objectives</h3>
                <p className="text-[--text-secondary] leading-relaxed">
                   This security program focuses on the core smart contracts and decentralized infrastructure of Program #{params.id}. 
                   We are looking for vulnerabilities related to access control, logic errors, and economic attacks that could result in loss of funds.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-5 rounded-2xl bg-[--bg-secondary] border border-[--border-default] flex items-center gap-4">
                      <Globe className="w-5 h-5 text-[--rs-red]" />
                      <div>
                         <div className="text-[10px] font-black text-[--text-tertiary] uppercase">Target</div>
                         <div className="text-sm font-black text-[--text-primary]">On-Chain Contracts</div>
                      </div>
                   </div>
                   <div className="p-5 rounded-2xl bg-[--bg-secondary] border border-[--border-default] flex items-center gap-4">
                      <Lock className="w-5 h-5 text-emerald-500" />
                      <div>
                         <div className="text-[10px] font-black text-[--text-tertiary] uppercase">Max Reward</div>
                         <div className="text-sm font-black text-[--text-primary]">{formatTokenAmount(rewardAmount, token?.decimals)} {token?.symbol}</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Technical Policy */}
          <div className="rs-card p-10 bg-opacity-[0.02]">
             <h3 className="text-2xl font-black text-[--text-primary] mb-8 flex items-center gap-3">
                <FileText className="w-6 h-6 text-[--rs-red]" /> VDP Policy
             </h3>
             <div className="space-y-6">
                {[
                  { title: 'In-Scope', desc: 'Logic flaws, rounding errors, flash loan vulnerabilities, and unauthorized state changes in the primary registry.' },
                  { title: 'Out-of-Scope', desc: 'Social engineering, DDoS attacks against RPC nodes, and issues already documented in previous audit reports.' },
                  { title: 'Submission Guide', desc: 'All findings must be encrypted using the RedSnare E2E tool. Proof of Concept (PoC) is mandatory for high/critical severities.' }
                ].map(p => (
                  <div key={p.title} className="p-6 rounded-2xl bg-[--bg-secondary] border border-[--border-default]">
                     <h4 className="font-black text-[--text-primary] mb-2 uppercase text-xs tracking-widest">{p.title}</h4>
                     <p className="text-sm text-[--text-secondary] leading-relaxed">{p.desc}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Stats & Action */}
        <div className="lg:col-span-4 space-y-6">
           {/* Reward Pool Card */}
           <div className="rs-card p-8 bg-[--rs-red] border-none relative overflow-hidden shadow-2xl shadow-[--rs-red-glow]">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                 <Zap className="w-24 h-24 text-white" />
              </div>
              <div className="relative">
                 <div className="text-xs font-black text-white text-opacity-70 uppercase tracking-widest mb-2">Total Pool Locked</div>
                 <div className="text-4xl font-black text-white mb-6">
                    {formatTokenAmount(escrowBalance, token?.decimals)} <span className="text-lg opacity-60 font-medium">{token?.symbol}</span>
                 </div>
                 <Link href={`/submit?bountyId=${params.id}`} className="w-full bg-white text-[--rs-red] py-4 rounded-xl flex items-center justify-center gap-2 group transition-transform active:scale-95">
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-sm">Submit Finding</span>
                 </Link>
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="rs-card p-6 flex flex-col items-center justify-center text-center">
                 <div className="w-10 h-10 rounded-full bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center mb-3 text-[--rs-red]">
                    <Users className="w-5 h-5" />
                 </div>
                 <div className="text-xl font-black text-[--text-primary]">{Number(reportCount || 0)}</div>
                 <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">Reports</div>
              </div>
              <div className="rs-card p-6 flex flex-col items-center justify-center text-center">
                 <div className="w-10 h-10 rounded-full bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center mb-3 text-emerald-500">
                    <Users className="w-5 h-5" />
                 </div>
                 <div className="text-xl font-black text-[--text-primary]">100%</div>
                 <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">Payout Rate</div>
              </div>
           </div>

           {/* Governance Info */}
           <div className="rs-card p-6 space-y-4">
              <h4 className="text-xs font-black text-[--text-tertiary] uppercase tracking-widest flex items-center gap-2">
                 <Shield className="w-4 h-4 text-[--rs-red]" /> Governance Context
              </h4>
              <div className="space-y-3">
                 <div className="flex justify-between text-xs py-2 border-b border-[--border-subtle]">
                    <span className="text-[--text-tertiary]">Appeal Bond</span>
                    <span className="text-[--text-primary] font-black">100 USDC</span>
                 </div>
                 <div className="flex justify-between text-xs py-2 border-b border-[--border-subtle]">
                    <span className="text-[--text-tertiary]">Voting Delay</span>
                    <span className="text-[--text-primary] font-black">24 Hours</span>
                 </div>
                 <div className="flex justify-between text-xs py-2">
                    <span className="text-[--text-tertiary]">Dispute Escalation</span>
                    <span className="text-emerald-500 font-black">Enabled</span>
                 </div>
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-blue-400 italic leading-relaxed">
                 All adjudications are handled by the elected RedSnare committee through a trustless re-voting protocol.
              </div>
           </div>

           {/* External Audit Link */}
           <button className="w-full rs-card p-5 flex items-center justify-between group hover:border-[--rs-red-border] transition-all">
              <div className="flex items-center gap-3">
                 <FileText className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--rs-red]" />
                 <span className="text-sm font-black text-[--text-primary] uppercase tracking-widest">Full Audit Report</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[--text-tertiary]" />
           </button>
        </div>
      </div>
    </div>
  );
}
