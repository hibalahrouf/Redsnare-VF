'use client'

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { 
  getCommitteeStats, 
  CommitteeStats,
  formatAddress
} from '@/services/chainReader';
import { 
  Shield, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  Users,
  Trophy,
  Activity,
  Gavel,
  Vote
} from 'lucide-react';

export default function CommitteeDashboardPage() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<CommitteeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!address) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getCommitteeStats(address);
        setStats(data);
      } catch (error) {
        console.error('Failed to load committee stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700">
          <Shield className="w-10 h-10 text-brand-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          The Committee Dashboard is reserved for elected members. Connect your wallet to view your performance metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <Link href="/committee" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Workshop
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              Governance Performance
            </div>
            <h1 className="text-4xl font-extrabold text-white">My Committee Stats</h1>
            <p className="text-gray-500 mt-2">
              Review your technical evaluation history and accuracy on the platform.
            </p>
          </div>

          <div className="glass-card px-6 py-4 flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-gray-500 uppercase">Committee Member</div>
              <div className="text-sm font-mono text-white">{formatAddress(address!)}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium italic">Calculating your performance score...</p>
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 border-brand-500/20 bg-brand-500/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-24 h-24 text-brand-500" />
              </div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Accuracy Score</div>
                <div className="text-5xl font-black text-white mb-2">{stats.accuracyScore}%</div>
                <p className="text-sm text-gray-500 max-w-[200px]">How often your votes align with the final consensus/truth.</p>
              </div>
            </div>

            <div className="glass-card p-8 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-24 h-24 text-emerald-500" />
              </div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reliability Score</div>
                <div className="text-5xl font-black text-white mb-2">{stats.reliabilityScore}%</div>
                <p className="text-sm text-gray-500 max-w-[200px]">Rate of successful vote reveals in commit-reveal disputes.</p>
              </div>
            </div>

            <div className="glass-card p-8 border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Vote className="w-24 h-24 text-blue-500" />
              </div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Votes Cast</div>
                <div className="text-5xl font-black text-white mb-2">{stats.votesCast}</div>
                <p className="text-sm text-gray-500 max-w-[200px]">Total number of judgments submitted across all bounties.</p>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.reportsReviewed}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Reports Reviewed</div>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.pendingReveals}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Pending Reveals</div>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: stats.pendingReveals > 0 ? '50%' : '0%' }}></div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.pendingCommits}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Pending Commits</div>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: stats.pendingCommits > 0 ? '50%' : '0%' }}></div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.disputesResolved}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Disputes Resolved</div>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: stats.disputesResolved > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>

          {/* Achievement Section */}
          <div className="glass-card p-8 bg-slate-900/50">
            <div className="flex items-center gap-4 mb-6">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Committee Standing</h3>
                <p className="text-sm text-gray-500">Your current status in the global committee pool.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-brand-400" />
                  <span className="font-bold text-white">Active Adjudicator</span>
                </div>
                <span className="text-xs text-emerald-400 font-bold px-2 py-1 bg-emerald-500/10 rounded-lg">VERIFIED</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white">High Reliability</span>
                </div>
                <span className="text-xs text-emerald-400 font-bold px-2 py-1 bg-emerald-500/10 rounded-lg">ACHIEVED</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-white font-bold">Failed to load statistics.</p>
        </div>
      )}
    </div>
  );
}
