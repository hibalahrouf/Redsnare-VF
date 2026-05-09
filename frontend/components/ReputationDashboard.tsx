'use client'

import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { REPUTATION_ABI, REPUTATION_ADDRESS } from '@/services/contracts';
import { Shield, Target, Award, AlertCircle, TrendingUp, UserCheck } from 'lucide-react';

export default function ReputationDashboard({ userAddress }: { userAddress?: string }) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = userAddress || connectedAddress;

  const { data: repData, isLoading } = useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: 'reputations',
    args: [targetAddress as `0x${string}`],
    query: { enabled: !!targetAddress }
  });

  const { data: currentScore } = useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: 'repScore',
    args: [targetAddress as `0x${string}`],
    query: { enabled: !!targetAddress }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse glass-card p-6 h-48 flex items-center justify-center">
        <div className="text-gray-400">Loading Reputation Profile...</div>
      </div>
    );
  }

  // reputations returns: acceptedReports, rejectedReports, disputesWon, disputesLost, repScoreCached, lastUpdate
  const [accepted, rejected, won, lost, cachedScore] = repData as [bigint, bigint, bigint, bigint, bigint, bigint] || [0n, 0n, 0n, 0n, 0n, 0n];

  const totalReports = Number(accepted + rejected);
  const accuracy = totalReports > 0 ? (Number(accepted) / totalReports) * 100 : 0;
  
  const totalDisputes = Number(won + lost);
  const reliability = totalDisputes > 0 ? (Number(won) / totalDisputes) * 100 : 100; // 100 if no disputes

  const repScore = currentScore !== undefined ? Number(currentScore) : Number(cachedScore);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Main Score Card */}
      <div className="md:col-span-1 glass-card p-6 bg-gradient-to-br from-brand-600/10 to-indigo-600/10 border-brand-500/20 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Shield className="w-32 h-32 text-brand-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-brand-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reputation Score</h3>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white">{repScore}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> XP
            </span>
          </div>
          
          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            On-chain reputation level based on report quality and dispute resolutions.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Accuracy Card */}
        <div className="glass-card p-5 border-emerald-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-gray-400 uppercase">Accuracy Score</span>
            </div>
            <span className="text-lg font-bold text-emerald-400">{accuracy.toFixed(1)}%</span>
          </div>
          
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${accuracy}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>Accepted: {accepted.toString()}</span>
            <span>Rejected: {rejected.toString()}</span>
          </div>
        </div>

        {/* Reliability Card */}
        <div className="glass-card p-5 border-amber-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-gray-400 uppercase">Reliability Score</span>
            </div>
            <span className="text-lg font-bold text-amber-400">{reliability.toFixed(1)}%</span>
          </div>
          
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-amber-500 transition-all duration-1000" 
              style={{ width: `${reliability}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>Won: {won.toString()}</span>
            <span>Lost: {lost.toString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
