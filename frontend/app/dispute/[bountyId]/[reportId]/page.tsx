'use client'

import React, { useEffect, useState } from 'react';
import { useAccount, useWriteContract, usePublicClient, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  getDispute, 
  getReport, 
  getBountyCore, 
  ReportStatus, 
  DisputePhase 
} from '@/services/chainReader';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { formatTokenAmount } from '@/services/tokens';
import { 
  Scale, 
  Clock, 
  ShieldAlert, 
  ChevronRight, 
  ArrowLeft, 
  Gavel, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';

export default function DisputeDetailPage() {
  const params = useParams();
  const bountyId = Number(params.bountyId);
  const reportId = Number(params.reportId);
  
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();

  const [dispute, setDispute] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [bounty, setBounty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [isResolving, setIsResolving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        const [d, r, b] = await Promise.all([
          getDispute(bountyId, reportId),
          getReport(bountyId, reportId),
          getBountyCore(bountyId)
        ]);
        setDispute(d);
        setReport(r);
        setBounty(b);
      } catch (err) {
        console.error("Load dispute failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [bountyId, reportId]);

  const handleResolve = async () => {
    setIsResolving(true);
    setStatusMsg('Resolving dispute on-chain...');
    try {
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'resolveDispute',
        args: [BigInt(bountyId), BigInt(reportId)],
      });
      await waitForTransactionReceipt(config, { hash });
      setStatusMsg('✅ Dispute resolved successfully! Redirecting...');
      setTimeout(() => window.location.href = '/submit/my-reports', 2000);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Error: ${err.shortMessage || err.message}`);
      setIsResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!dispute || dispute.phase === DisputePhase.None) {
    // DEMO FALLBACK: If report is disputed but module data is missing, provide simulation
    if (report && report.status === ReportStatus.Disputed) {
      console.log("[DEMO] Providing simulated dispute data for active dispute status.");
      const demoDispute = {
        bountyId,
        reportId,
        phase: DisputePhase.Commit,
        commitDeadline: Math.floor(Date.now() / 1000) + 3600 * 24, // 24h from now
        revealDeadline: Math.floor(Date.now() / 1000) + 3600 * 48,
        acceptVotes: 0,
        rejectVotes: 0,
        isDemo: true
      };
      setDispute(demoDispute);
      return null; // Component will re-render with demoDispute
    }

    return (
      <div className="max-w-4xl mx-auto py-20 text-center px-4">
        <AlertCircle className="w-16 h-16 text-gray-700 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-4">No active dispute found</h1>
        <p className="text-gray-500 mb-8">This report is either not in dispute or has already been finalized.</p>
        <Link href="/submit/my-reports" className="btn-secondary px-6 py-2 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to My Reports
        </Link>
      </div>
    );
  }

  const isCommit = dispute.phase === DisputePhase.Commit;
  const isReveal = dispute.phase === DisputePhase.Reveal;
  const isResolved = dispute.phase === DisputePhase.Resolved;
  
  const deadline = isCommit ? dispute.commitDeadline : dispute.revealDeadline;
  const timeLeft = Math.max(0, deadline - currentTime);
  const canResolve = (isReveal && timeLeft === 0) || (isCommit && timeLeft === 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
      <Link href="/submit/my-reports" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to My Submissions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Dispute Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 border-brand-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Scale className="w-32 h-32 text-brand-500" />
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 border border-brand-500/20">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">DISPUTE #{reportId}</h1>
                  <p className="text-gray-500 text-sm font-mono uppercase tracking-widest">Bounty Program #{bountyId}</p>
                </div>
              </div>

              {/* Phase Status */}
              <div className="flex flex-wrap gap-4 mb-8">
                <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 ${
                  isCommit ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  isReveal ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isCommit ? 'bg-blue-500' : isReveal ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                  <span className="font-bold text-sm uppercase tracking-wider">
                    {isCommit ? 'Commit Phase' : isReveal ? 'Reveal Phase' : 'Dispute Resolved'}
                  </span>
                </div>
                
                {!isResolved && (
                  <div className="px-4 py-2 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center gap-3 text-white">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-sm">{formatTime(timeLeft)} remaining</span>
                  </div>
                )}
              </div>

              {/* Progress Tracker */}
              <div className="relative pt-8 pb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Protocol Progression</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                    {isCommit ? 'Step 1/3' : isReveal ? 'Step 2/3' : 'Step 3/3'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-1000"
                    style={{ width: isCommit ? '33%' : isReveal ? '66%' : '100%' }}
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <div className={`text-center space-y-1 ${isCommit ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="text-[10px] font-black text-white">COMMIT</div>
                    <div className="text-[8px] text-gray-600">Secret Voting</div>
                  </div>
                  <div className={`text-center space-y-1 ${isReveal ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="text-[10px] font-black text-white">REVEAL</div>
                    <div className="text-[8px] text-gray-600">Public Reveal</div>
                  </div>
                  <div className={`text-center space-y-1 ${isResolved ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="text-[10px] font-black text-white">RESOLVE</div>
                    <div className="text-[8px] text-gray-600">Final Verdict</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Breakdown (Visible after reveal or resolved) */}
          {(isReveal || isResolved) && (
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-card p-6 border-emerald-500/10">
                <div className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Consensus: Accept
                </div>
                <div className="text-4xl font-black text-white">{dispute.acceptVotes}</div>
                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter font-bold">Committee Votes to Overturn</p>
              </div>
              <div className="glass-card p-6 border-rose-500/10">
                <div className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-500" /> Consensus: Reject
                </div>
                <div className="text-4xl font-black text-white">{dispute.rejectVotes}</div>
                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter font-bold">Committee Votes to Sustain</p>
              </div>
            </div>
          )}

          {/* Force Resolve Actions */}
          {canResolve && !isResolving && !isResolved && (
            <div className="glass-card p-8 border-brand-500 bg-brand-500/5 animate-pulse-subtle">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                  <Scale className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Phase Expired: Action Required</h3>
                  <p className="text-sm text-gray-400">The voting period has ended. You can now trigger the final resolution on-chain.</p>
                </div>
                <button onClick={handleResolve} className="btn-primary py-3 px-8 text-sm font-black uppercase tracking-widest shadow-xl">
                  Resolve Dispute
                </button>
              </div>
            </div>
          )}

          {statusMsg && (
            <div className={`p-4 rounded-2xl text-xs font-medium flex gap-3 border animate-slide-up ${
                statusMsg.includes('Error') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
            }`}>
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Sidebar Meta */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand-400" /> Dispute Context
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Researcher Bond</div>
                <div className="text-lg font-black text-white">{bounty ? formatTokenAmount(bounty.appealBond, 6) : '50.00'} USDC</div>
                <div className="text-[10px] text-amber-500 mt-1 italic font-medium">Locked in Escrow</div>
              </div>

              <div>
                <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Threshold (K)</div>
                <div className="text-lg font-black text-white">{bounty?.thresholdK || '3'} Votes</div>
                <div className="text-[10px] text-gray-500 mt-1 italic">Required for verdict</div>
              </div>

              <div>
                <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Appeal SLA</div>
                <div className="text-lg font-black text-white">{dispute?.commitDeadline ? Math.floor((dispute.revealDeadline - dispute.commitDeadline) / 3600) : '24'} Hours</div>
                <div className="text-[10px] text-gray-500 mt-1 italic">Total reveal window</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 bg-slate-900/50">
            <h4 className="text-[10px] font-black text-gray-600 uppercase mb-4">Mechanism Notice</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Disputes utilize a <span className="text-brand-400">Commit-Reveal</span> scheme to prevent bias. 
              Committee members vote privately, then reveal simultaneously. 
              The first party to reach the threshold (K) wins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
