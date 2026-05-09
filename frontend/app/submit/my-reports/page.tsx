'use client'

import React, { useEffect, useState } from 'react';
import { useAccount, useWriteContract, useConfig, usePublicClient } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';
import {
  getBountyCount,
  getBountyCore,
  getDispute,
  getReport,
  getReportCount,
  getReputation,
  getResearcherEarnings,
  ReportStatus,
  ReputationData,
  ResearcherEarnings
} from '@/services/chainReader';
import { formatTokenAmount } from '@/services/tokens';
import { NotificationService } from '@/services/NotificationService';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Wallet,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Coins,
  Trophy,
  Activity,
  Award,
  Scale,
  Info,
  ShieldAlert,
  CheckCircle2,
  Zap
} from 'lucide-react';
import IPFSMetadataCard from '@/components/IPFSMetadataCard';

type MyReport = {
  bountyId: number;
  reportId: number;
  report: any;
  bountyCore: any;
  dispute?: any;
};

function statusLabel(status: number, paid: boolean) {
  if (paid || status === ReportStatus.Finalized) {
    return {
      label: 'Finalized / Paid',
      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: CheckCircle
    };
  }

  switch (status) {
    case ReportStatus.Submitted:
      return {
        label: 'Submitted',
        className: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        icon: Clock
      };
    case ReportStatus.Accepted:
      return {
        label: 'Accepted - Waiting Finalization',
        className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        icon: CheckCircle
      };
    case ReportStatus.Rejected:
      return {
        label: 'Rejected',
        className: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        icon: XCircle
      };
    case ReportStatus.Disputed:
      return {
        label: 'Disputed',
        className: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        icon: AlertTriangle
      };
    default:
      return {
        label: `Unknown (${status})`,
        className: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        icon: FileText
      };
  }
}

export default function MyReportsPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [earnings, setEarnings] = useState<ResearcherEarnings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockTime, setBlockTime] = useState<number>(Math.floor(Date.now() / 1000));

  const renderStatusBadge = (status: number) => {
    switch (status) {
      case ReportStatus.Submitted: return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-3 h-3" /> Submitted</span>;
      case ReportStatus.Accepted: return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Accepted</span>;
      case ReportStatus.Rejected: return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Rejected</span>;
      case ReportStatus.Disputed: return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider"><ShieldAlert className="w-3 h-3" /> Disputed</span>;
      case ReportStatus.Finalized: return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Finalized</span>;
      default: return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Unknown ({status})</span>;
    }
  };

  const renderTimeline = (report: any) => {
    const steps = [
      { label: 'Submitted', active: true, done: true, date: Number(report.submittedAt) },
      { label: 'Committee Review', active: report.status >= 0, done: report.acceptVotes + report.rejectVotes > 0 },
      { label: 'Verdict', active: report.status === ReportStatus.Accepted || report.status === ReportStatus.Rejected || report.status === ReportStatus.Disputed, done: report.status !== ReportStatus.Submitted },
      { label: 'Dispute', active: report.status === ReportStatus.Disputed, done: report.status === ReportStatus.Finalized && report.paid },
      { label: 'Finalized', active: report.status === ReportStatus.Finalized, done: report.paid }
    ];

    return (
      <div className="mt-8 pt-8 border-t border-slate-800/50">
        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6">Submission Lifecycle</div>
        <div className="flex items-start justify-between">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center flex-1 relative group">
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className={`absolute top-2.5 left-1/2 w-full h-[1px] ${step.done ? 'bg-brand-500' : 'bg-slate-800'}`} />
              )}
              
              <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all ${
                step.done ? 'bg-brand-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                step.active ? 'bg-[#0D0D0D] border border-brand-500 text-brand-500' : 
                'bg-[#050505] border border-[#222222] text-gray-700'
              }`}>
                {step.done ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
              </div>
              
              <div className="mt-3 text-center">
                <div className={`text-[9px] font-black uppercase tracking-tighter ${step.active ? 'text-white' : 'text-gray-600'}`}>
                  {step.label}
                </div>
                {step.date && i === 0 && (
                  <div className="text-[8px] text-gray-600 mt-0.5">{new Date(step.date * 1000).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const [isFinalizing, setIsFinalizing] = useState<number | null>(null);

  const handleFinalizeReport = async (bountyId: number, reportId: number) => {
    setIsFinalizing(reportId);
    setStatusMsg(`Finalizing payout for Report #${reportId}...`);
    try {
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'finalizeReport',
        args: [BigInt(bountyId), BigInt(reportId)],
      });
      await waitForTransactionReceipt(config, { hash });
      setStatusMsg('✅ Bounty finalized and reward transferred!');
      toast.success('Bounty Payout Finalized!');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      console.error("Finalize Error:", e);
      setStatusMsg(`Error: ${e.shortMessage || e.message}`);
    } finally {
      setIsFinalizing(null);
    }
  };

  const handleRaiseDispute = async (bountyId: number, reportId: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatusMsg('Initiating dispute on-chain...');

    try {
      const bounty = await getBountyCore(bountyId);
      
      // DIAGNOSTIC: Check balance and allowance
      const tokenAbi = [
        {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
      ];
      
      const [balance, allowance] = await Promise.all([
        publicClient.readContract({
          address: bounty.token as `0x${string}`,
          abi: tokenAbi,
          functionName: 'balanceOf',
          args: [address]
        }) as Promise<bigint>,
        publicClient.readContract({
          address: bounty.token as `0x${string}`,
          abi: tokenAbi,
          functionName: 'allowance',
          args: [address, CONTRACT_ADDRESS]
        }) as Promise<bigint>
      ]);

      console.log("DIAGNOSTIC:", {
        token: bounty.token,
        needed: bounty.appealBond.toString(),
        balance: balance.toString(),
        allowance: allowance.toString()
      });

      if (balance < bounty.appealBond) {
        throw new Error(`Insufficient Token Balance: You need ${formatTokenAmount(bounty.appealBond, 6)} but only have ${formatTokenAmount(balance, 6)} of this specific token.`);
      }

      if (bounty.appealBond > 0n && allowance < bounty.appealBond) {
        setStatusMsg(`Bounty requires an appeal bond of ${formatTokenAmount(bounty.appealBond, 6)} USDC. Approving...`);
        const approveHash = await writeContractAsync({
          abi: [
            { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }
          ],
          address: bounty.token as `0x${string}`,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, bounty.appealBond],
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
        setStatusMsg('Allowance confirmed. Raising dispute...');
      }

      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'raiseDispute',
        args: [BigInt(bountyId), BigInt(reportId)],
      });

      setStatusMsg('Dispute transaction submitted. Waiting for confirmation...');
      await waitForTransactionReceipt(config, { hash });
      
      NotificationService.addNotification({
        title: 'Dispute Escalated',
        message: `Dispute for Report #${reportId} has been officially registered. Waiting for committee review.`,
        type: 'warning',
        txHash: hash,
        eventName: 'DisputeOpened',
        details: { bountyId, reportId }
      });

      setStatusMsg('✅ Dispute opened successfully! The committee will now re-evaluate.');
      
      setTimeout(() => window.location.href = `/dispute/${bountyId}/${reportId}`, 2000);
    } catch (e: any) {
      console.error("Dispute Error:", e);
      let errorDesc = e.shortMessage || e.message;
      
      // Try to decode common custom errors
      if (errorDesc.includes('0xfb8f41b2')) errorDesc = "Error: Report is not in a disputable state (already disputed or finalized).";
      if (errorDesc.includes('0xe6c420e8')) errorDesc = "Error: Not Authorized. Are you using the correct researcher wallet?";
      if (errorDesc.includes('insufficient funds')) errorDesc = "Error: Insufficient funds to pay the appeal bond or gas.";

      setStatusMsg(errorDesc);
      setIsSubmitting(false);
      toast.error('Transaction Failed', { description: errorDesc });
    }
  };
  
  const handleEscalate = async (bountyId: number, reportId: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatusMsg('Forcing escalation due to committee inactivity...');

    try {
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'triggerEscalation',
        args: [BigInt(bountyId), BigInt(reportId)],
      });

      setStatusMsg('Escalation transaction submitted...');
      await waitForTransactionReceipt(config, { hash });
      
      NotificationService.addNotification({
        title: 'Report Escalated',
        message: `Report #${reportId} has been escalated to public dispute due to SLA expiration.`,
        type: 'warning',
        txHash: hash,
        eventName: 'DisputeOpened',
        details: { bountyId, reportId }
      });

      setStatusMsg('✅ Escalation successful! Moving to dispute portal...');
      setTimeout(() => window.location.href = `/dispute/${bountyId}/${reportId}`, 2000);
    } catch (e: any) {
      console.error("Escalation Error:", e);
      setStatusMsg(`Error: ${e.shortMessage || e.message}`);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadMyData() {
      if (!address) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const rep = await getReputation(address);
        setReputation(rep);

        const earn = await getResearcherEarnings(address);
        setEarnings(earn);

        // Fetch current blockchain time
        const block = await publicClient.getBlock();
        setBlockTime(Number(block.timestamp));

        const count = await getBountyCount();
        const result: MyReport[] = [];
        const connected = address.toLowerCase();

        for (let bountyId = 0; bountyId < count; bountyId++) {
          const bountyCore = await getBountyCore(bountyId);
          const reportCount = await getReportCount(bountyId);

          for (let reportId = 0; reportId < reportCount; reportId++) {
            const report = await getReport(bountyId, reportId);
            if (!report) continue;

            if (report.researcher?.toLowerCase() === connected) {
              const dispute = await getDispute(bountyId, reportId);
              result.push({
                bountyId,
                reportId,
                report,
                bountyCore,
                dispute
              });
            }
          }
        }

        setReports(result.reverse());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMyData();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center animate-fade-in">
        <div className="w-20 h-20 bg-[--bg-secondary] border border-[--border-default] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3">
          <Wallet className="w-10 h-10 text-[--rs-red]" />
        </div>
        <h1 className="text-4xl font-black text-[--text-primary] mb-4 tracking-tighter uppercase">Connect Your Wallet</h1>
        <p className="text-[--text-secondary] max-w-md mx-auto mb-10 font-medium leading-relaxed">
          Connect your researcher wallet to view your submitted vulnerability reports and reputation.
        </p>
        <div className="flex justify-center">
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "animate-fade-in" : "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in"}>
      {!isEmbedded && (
        <div className="mb-8">
          <Link href="/submit" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Submit Report
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--rs-red-bg] border border-[--rs-red-border] text-[--rs-red] text-xs font-black uppercase tracking-[0.15em] mb-4">
                <FileText className="w-3.5 h-3.5" />
                Researcher Dashboard
              </div>
              <h1 className="text-4xl font-black text-[--text-primary] tracking-tight">My Submissions</h1>
              <p className="text-[--text-secondary] mt-2 font-medium">
                Track your submitted reports, committee decisions, and payout status.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {earnings && (
                <>
                  <div className="rs-metric px-8 py-5 flex flex-col items-center justify-center min-w-[140px] border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-3xl font-black text-emerald-500">
                      {formatTokenAmount(earnings.totalPaid, 6)}
                    </div>
                    <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <Coins className="w-3 h-3" /> Total Earned (USDC)
                    </div>
                  </div>

                  <div className="rs-metric px-8 py-5 flex flex-col items-center justify-center min-w-[140px] border-amber-500/20 bg-amber-500/5">
                    <div className="text-3xl font-black text-amber-500">
                      {formatTokenAmount(earnings.totalPending, 6)}
                    </div>
                    <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mt-1">Pending</div>
                  </div>
                </>
              )}
              
              {reputation && (
                <div className="rs-metric px-8 py-5 border-[--rs-red-border] bg-[--rs-red-bg] flex flex-col items-center justify-center min-w-[160px] shadow-lg shadow-[--rs-red-glow]">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-[--rs-red]" />
                    <div className="text-3xl font-black text-[--rs-red]">{reputation.score}</div>
                  </div>
                  <div className="text-[10px] font-black text-[--text-secondary] uppercase tracking-widest text-center">Reputation Score</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isEmbedded && reputation && (
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rs-metric p-6 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">Accepted</div>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-[--text-primary]">{reputation.acceptedReports}</div>
            <div className="text-[10px] text-[--text-tertiary] mt-2 font-medium italic">+3 rep points each</div>
          </div>
          
          <div className="glass-card p-5 border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rejected</div>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-white">{reputation.rejectedReports}</div>
            <div className="text-[10px] text-gray-500 mt-1 italic">-2 rep points each</div>
          </div>

          <div className="glass-card p-5 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disputes Won</div>
              <Trophy className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">{reputation.disputesWon}</div>
            <div className="text-[10px] text-gray-500 mt-1 italic">+2 rep points each</div>
          </div>

          <div className="glass-card p-5 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reliability</div>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {reputation.acceptedReports + reputation.rejectedReports === 0 
                ? '100%' 
                : `${Math.round((reputation.acceptedReports / (reputation.acceptedReports + reputation.rejectedReports)) * 100)}%`}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 italic">Success rate</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium italic">Loading your submissions...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-14 h-14 mx-auto mb-4 text-gray-600" />
          <h2 className="text-2xl font-bold text-white mb-2">No submissions yet</h2>
          <p className="text-gray-500 mb-6">
            Submit a vulnerability report first, then it will appear here.
          </p>
          <Link href="/submit" className="btn-primary py-3 px-6">
            Submit a Report
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((item) => {
            const status = statusLabel(item.report.status, item.report.paid);
            const StatusIcon = status.icon;

            return (
              <div key={`${item.bountyId}-${item.reportId}`} className="glass-card p-6 hover:border-brand-500/40 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-mono text-brand-400 mb-2">
                        Program #{item.bountyId} / Report #{item.reportId}
                      </div>
                      <h2 className="text-xl font-bold text-white">
                        Vulnerability Report #{item.reportId}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted on {new Date(Number(item.report.submittedAt) * 1000).toLocaleString()}
                      </p>
                    </div>

                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase ${status.className}`}>
                      <StatusIcon className="w-4 h-4" />
                      {renderStatusBadge(item.report.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-full lg:min-w-[520px]">
                    <div className="p-5 rounded-2xl bg-[--bg-elevated] border border-[--border-default] shadow-sm">
                      <div className="text-[9px] uppercase text-[--text-tertiary] font-black tracking-widest mb-2">Accept votes</div>
                      <div className="text-2xl font-black text-emerald-500">{item.report.acceptVotes}</div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[--bg-elevated] border border-[--border-default] shadow-sm">
                      <div className="text-[9px] uppercase text-[--text-tertiary] font-black tracking-widest mb-2">Reject votes</div>
                      <div className="text-2xl font-black text-rose-500">{item.report.rejectVotes}</div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[--bg-elevated] border border-[--border-default] shadow-sm">
                      <div className="text-[9px] uppercase text-[--text-tertiary] font-black tracking-widest mb-2">Locked Stake</div>
                      <div className="text-2xl font-black text-[--text-primary]">
                        {formatTokenAmount(item.report.stakeAmount, 6)} <span className="text-xs text-[--text-tertiary]">USDC</span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[--bg-elevated] border border-[--border-default] shadow-sm">
                      <div className="text-[9px] uppercase text-[--text-tertiary] font-black tracking-widest mb-2">Paid</div>
                      <div className={`text-2xl font-black ${
                        item.report.paid && !((item.dispute && item.dispute.phase === 3 && item.dispute.rejectVotes > item.dispute.acceptVotes) || (!item.dispute && item.report.rejectVotes > item.report.acceptVotes))
                          ? 'text-emerald-500' 
                          : item.report.paid 
                            ? 'text-rose-500' // It was a slash
                            : 'text-amber-500'
                      }`}>
                        {item.report.paid && !((item.dispute && item.dispute.phase === 3 && item.dispute.rejectVotes > item.dispute.acceptVotes) || (!item.dispute && item.report.rejectVotes > item.report.acceptVotes))
                          ? 'Yes' 
                          : item.report.paid ? 'No' : 'No'}
                      </div>
                    </div>
                  </div>
                </div>

                {item.report.status === ReportStatus.Accepted && !item.report.paid && (
                   <div className="mt-5 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                           <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="text-lg font-black text-white uppercase tracking-tight">Reward Available</div>
                           <div className="text-sm text-gray-500">Your report was accepted! You can now claim your bounty.</div>
                        </div>
                     </div>
                     <button 
                       onClick={() => handleFinalizeReport(item.bountyId, item.reportId)}
                       disabled={isFinalizing !== null}
                       className="btn-primary py-3 px-8 text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 flex items-center gap-2"
                     >
                       {isFinalizing === item.reportId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                       Finalize Payout
                     </button>
                   </div>
                )}

                {item.report.status === ReportStatus.Disputed && (
                   <div className="mt-5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3">
                        <Scale className="w-5 h-5" />
                        <div>
                          <div className="font-bold">Dispute in progress</div>
                          <div className="text-sm opacity-80">Track the committee re-evaluation in the dispute portal.</div>
                        </div>
                     </div>
                     <Link href={`/dispute/${item.bountyId}/${item.reportId}`} className="btn-secondary py-2 px-4 text-[10px] whitespace-nowrap">
                        View Dispute Details
                     </Link>
                   </div>
                )}

                {renderTimeline(item.report)}

                {item.report.paid && (
                  <div className={`mt-5 p-4 rounded-2xl border flex items-center gap-3 ${
                    (item.dispute && item.dispute.phase === 3 && item.dispute.rejectVotes > item.dispute.acceptVotes) || 
                    (!item.dispute && item.report.rejectVotes > item.report.acceptVotes)
                      ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' 
                      : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {((item.dispute && item.dispute.phase === 3 && item.dispute.rejectVotes > item.dispute.acceptVotes) || 
                      (!item.dispute && item.report.rejectVotes > item.report.acceptVotes)) ? (
                      <>
                        <XCircle className="w-5 h-5" />
                        <div>
                          <div className="font-bold">Stake Slashed</div>
                          <div className="text-sm opacity-80">
                            The committee has finalized the rejection. Your submission stake has been slashed.
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <div>
                          <div className="font-bold">Payout finalized</div>
                          <div className="text-sm opacity-80">
                            The bounty reward and eligible stake refund have been released from escrow.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {!item.report.paid && item.report.status === ReportStatus.Accepted && (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 flex items-center gap-3">
                    <Coins className="w-5 h-5" />
                    <div>
                      <div className="font-bold">Accepted, waiting for finalization</div>
                      <div className="text-sm opacity-80">
                        The committee accepted this report. A finalization transaction is still required to release payout.
                      </div>
                    </div>
                  </div>
                )}

                {item.report.status === ReportStatus.Rejected && (
                  <div className="mt-5 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-400 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <div className="font-bold">Report rejected</div>
                      <div className="text-sm opacity-80 mb-3">
                        You may open a dispute if you believe the rejection is incorrect.
                      </div>
                      <button 
                        onClick={() => handleRaiseDispute(item.bountyId, item.reportId)}
                        disabled={isSubmitting}
                        className="btn-danger py-2 px-4 text-xs flex items-center gap-2 w-fit bg-rose-500 hover:bg-rose-600 border-none text-white shadow-lg shadow-rose-500/20"
                      >
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scale className="w-3 h-3" />}
                        Raise Dispute
                      </button>
                    </div>
                  </div>
                )}

                {item.report.status === ReportStatus.Submitted && 
                 (blockTime > Number(item.report.submittedAt) + Number(item.bountyCore.reviewSLA)) && (
                  <div className="mt-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse-subtle">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-6 h-6" />
                      <div>
                        <div className="font-black uppercase tracking-tight">Committee SLA Expired</div>
                        <div className="text-sm opacity-80 font-medium italic">
                          The review deadline has passed without a vote. You can now force an escalation.
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEscalate(item.bountyId, item.reportId)}
                      disabled={isSubmitting}
                      className="rs-btn rs-btn-primary py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 flex items-center gap-2 bg-rose-600 border-none"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Trigger Escalation
                    </button>
                  </div>
                )}

                {statusMsg && (
                    <div className={`mt-4 p-4 rounded-xl text-xs font-medium flex gap-3 border animate-slide-up ${
                        statusMsg.includes('Error') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                    }`}>
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>{statusMsg}</span>
                    </div>
                )}

                <div className="mt-6">
                  <IPFSMetadataCard cid={item.report.cidDigest ? "Qm" + item.report.cidDigest.slice(2, 10) + "..." : undefined} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
