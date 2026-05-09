'use client'

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { REPUTATION_ABI, REPUTATION_ADDRESS } from '@/services/contracts';
import { WalletConnect } from '@/components/WalletConnect';
import { 
  User, Award, Target, CheckCircle, XCircle, 
  Trophy, Activity, ShieldCheck, Zap, 
  ExternalLink, Hash, Globe, ChevronLeft,
  Wallet
} from 'lucide-react';
import Link from 'next/link';

export default function ResearcherProfilePage() {
  const { isConnected } = useAccount();
  const params = useParams();
  const address = params.address as string;

  const { data: stats } = useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: 'reputations',
    args: [address as `0x${string}`],
  });

  const { data: score } = useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: 'repScore',
    args: [address as `0x${string}`],
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center mb-8 bg-[--bg-secondary] border border-[--border-default] shadow-2xl rotate-3">
          <Wallet className="w-10 h-10 text-[--rs-red]" />
        </div>
        <h1 className="text-3xl font-black text-[--text-primary] mb-3 uppercase tracking-tight">Identity Required</h1>
        <p className="text-[--text-secondary] max-w-sm mx-auto mb-10 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
          Please connect your wallet to view researcher credentials.
        </p>
        <WalletConnect inline />
      </div>
    );
  }

  if (!stats || score === undefined) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[--rs-red] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const [accepted, rejected, won] = stats as any[];
  const total = Number(accepted) + Number(rejected);
  const reliability = total === 0 ? 100 : Math.round((Number(accepted) / total) * 100);

  const getRank = (s: number) => {
    if (s > 100) return { label: 'Elite Interceptor', color: 'text-[--rs-red]', bg: 'bg-[--rs-red-bg]', border: 'border-[--rs-red-border]' };
    if (s > 50) return { label: 'Senior Guard', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    return { label: 'Active Hunter', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  };

  const rank = getRank(Number(score));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
       {/* Back link */}
       <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-[--text-tertiary] hover:text-[--rs-red] transition-all mb-12 uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Explorer
       </Link>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: Profile Info */}
          <div className="lg:col-span-4 space-y-8">
             <div className="rs-card p-10 text-center relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[--rs-red] to-transparent" />
                
                <div className="w-32 h-32 rounded-full bg-[--bg-primary] border-4 border-[--border-default] mx-auto mb-8 flex items-center justify-center shadow-2xl relative group-hover:border-[--rs-red-border] transition-all">
                   <User className="w-16 h-16 text-[--text-tertiary] group-hover:text-[--rs-red] transition-colors" />
                   <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-emerald-500 border-4 border-[--bg-secondary] flex items-center justify-center shadow-xl">
                      <ShieldCheck className="w-5 h-5 text-white" />
                   </div>
                </div>

                <h1 className="text-xl font-mono font-black text-[--text-primary] mb-3 truncate px-4">{address}</h1>
                <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-lg ${rank.bg} ${rank.color} ${rank.border}`}>
                   <Award className="w-4 h-4" /> {rank.label}
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                   <div className="p-5 rounded-3xl bg-[--bg-secondary] border border-[--border-subtle] shadow-inner">
                      <div className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest mb-2">Reputation</div>
                      <div className="text-3xl font-black text-[--text-primary]">{Number(score)}</div>
                   </div>
                   <div className="p-5 rounded-3xl bg-[--bg-secondary] border border-[--border-subtle] shadow-inner">
                      <div className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest mb-2">Success</div>
                      <div className="text-3xl font-black text-emerald-500">{reliability}%</div>
                   </div>
                </div>

                <div className="mt-10 pt-10 border-t border-[--border-subtle] space-y-5 text-left">
                   <div className="flex items-center gap-4 text-[--text-tertiary] hover:text-[--text-primary] transition-colors cursor-pointer group/item">
                      <div className="w-8 h-8 rounded-lg bg-[--bg-secondary] flex items-center justify-center group-hover/item:text-[--rs-red] transition-colors">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium">researcher-portfolio.io</span>
                   </div>
                   <div className="flex items-center gap-4 text-[--text-tertiary] hover:text-[--text-primary] transition-colors cursor-pointer group/item">
                      <div className="w-8 h-8 rounded-lg bg-[--bg-secondary] flex items-center justify-center group-hover/item:text-[--rs-red] transition-colors">
                        <Hash className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium">Verified on Arweave</span>
                   </div>
                </div>
             </div>

             <div className="rs-card p-8 bg-[--bg-secondary]">
                <h3 className="text-[10px] font-black text-[--text-primary] mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
                   <Zap className="w-4 h-4 text-amber-500" /> Recent Activity
                </h3>
                <div className="space-y-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-[--bg-elevated] transition-all cursor-pointer border border-transparent hover:border-[--border-default] group/act">
                        <div className="w-10 h-10 rounded-xl bg-[--bg-primary] border border-[--border-subtle] flex items-center justify-center shrink-0 group-hover/act:text-[--rs-red] transition-colors">
                           <Target className="w-5 h-5 opacity-40" />
                        </div>
                        <div className="min-w-0">
                           <div className="text-xs font-black text-[--text-secondary] group-hover/act:text-[--text-primary] truncate">Report Accepted: Bounty #42</div>
                           <div className="text-[10px] font-bold text-[--text-tertiary] mt-1">Confirmed 2 days ago</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Main Column: Advanced Stats & Badges */}
          <div className="lg:col-span-8 space-y-8">
             {/* Stats Highlight Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rs-metric bg-emerald-500/[0.02] border-emerald-500/20">
                   <div className="flex items-center justify-between mb-6">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                      <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest">Accepted</span>
                   </div>
                   <div className="text-5xl font-black text-[--text-primary]">{Number(accepted)}</div>
                   <p className="text-[10px] font-bold text-[--text-tertiary] mt-3 uppercase tracking-wider">Valid findings</p>
                </div>
                <div className="rs-metric bg-rose-500/[0.02] border-rose-500/20">
                   <div className="flex items-center justify-between mb-6">
                      <XCircle className="w-8 h-8 text-rose-500" />
                      <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest">Rejected</span>
                   </div>
                   <div className="text-5xl font-black text-[--text-primary]">{Number(rejected)}</div>
                   <p className="text-[10px] font-bold text-[--text-tertiary] mt-3 uppercase tracking-wider">Invalid/Spam</p>
                </div>
                <div className="rs-metric bg-blue-500/[0.02] border-blue-500/20">
                   <div className="flex items-center justify-between mb-6">
                      <Trophy className="w-8 h-8 text-blue-500" />
                      <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest">Won Disputes</span>
                   </div>
                   <div className="text-5xl font-black text-[--text-primary]">{Number(won)}</div>
                   <p className="text-[10px] font-bold text-[--text-tertiary] mt-3 uppercase tracking-wider">Successful Appeals</p>
                </div>
             </div>

             {/* Performance Analytics Chart */}
             <div className="rs-card p-10 bg-[--bg-secondary] relative overflow-hidden">
                <div className="flex items-center justify-between mb-12 relative z-10">
                   <h3 className="text-2xl font-black text-[--text-primary] flex items-center gap-4 uppercase tracking-tighter">
                      <Activity className="w-8 h-8 text-[--rs-red]" /> Performance Analytics
                   </h3>
                   <div className="flex gap-2">
                      <span className="px-4 py-1.5 rounded-xl bg-[--bg-primary] border border-[--border-subtle] text-[9px] font-black text-[--text-tertiary] uppercase tracking-[0.2em]">LAST 90 DAYS</span>
                   </div>
                </div>

                <div className="h-72 flex items-end gap-3 px-6 border-b border-[--border-subtle] pb-4 relative z-10">
                   {[40, 70, 45, 90, 65, 80, 55, 95, 75, 100].map((h, i) => (
                      <div 
                         key={i} 
                         style={{ height: `${h}%` }} 
                         className="flex-1 bg-gradient-to-t from-[--rs-red-bg] to-[--rs-red] rounded-t-lg transition-all hover:brightness-125 cursor-help shadow-2xl shadow-[--rs-red-glow]"
                         title={`Accuracy: ${h}%`}
                      />
                   ))}
                </div>
                <div className="flex justify-between mt-6 px-6 text-[10px] font-black text-[--text-tertiary] uppercase tracking-[0.3em] relative z-10">
                   <span>Feb</span>
                   <span>Mar</span>
                   <span>Apr</span>
                   <span>May</span>
                </div>
             </div>

             {/* On-Chain Credentials */}
             <div className="rs-card p-10">
                <h3 className="text-[10px] font-black text-[--text-primary] mb-10 uppercase tracking-[0.3em]">On-Chain Credentials</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                   {[
                     { icon: ShieldCheck, label: 'Early Adopter', color: 'text-emerald-500' },
                     { icon: Trophy, label: 'Grand Adjudicator', color: 'text-amber-500' },
                     { icon: Target, label: 'Bug Hunter', color: 'text-[--rs-red]' },
                     { icon: Zap, label: 'Fast Reveal', color: 'text-blue-500' },
                   ].map(b => (
                     <div key={b.label} className="group flex flex-col items-center gap-4 p-6 rounded-[2rem] bg-[--bg-secondary] border border-[--border-subtle] hover:border-[--rs-red-border] transition-all cursor-default shadow-lg">
                        <div className={`p-4 rounded-2xl bg-[--bg-primary] border border-[--border-subtle] ${b.color} group-hover:scale-110 group-hover:shadow-2xl transition-all`}>
                           <b.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[9px] font-black text-[--text-tertiary] uppercase text-center tracking-widest">{b.label}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
