'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { fetchBountyMetadata, BountyMetadata, fetchFromIPFS, decryptReport, hexToKey } from '@/services/ipfs';
import { 
  getBountyCount, getBountyCore, getReport, getReportCount, getDispute, isCommitteeMember, getCommitment, getHasRevealed,
  hasVoted, ReportStatus, DisputePhase
} from '@/services/chainReader';
import { 
  Users, CheckCircle, XCircle, Eye, EyeOff, Lock, Unlock, Clock, 
  AlertCircle, FileText, Shield, ChevronRight, Scale, Info, Loader2, Key, Gavel,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import IPFSMetadataCard from '@/components/IPFSMetadataCard';
import { ethers } from 'ethers';

interface ReportTask {
  bountyId: number;
  reportId: number;
  report: any;
  bountyCore: any;
  metadata: BountyMetadata | null;
  dispute?: any;
  hasCommitted?: boolean;
  hasRevealed?: boolean;
  hasVotedInitial?: boolean;
}

function getEffectivePhase(dispute: any | null | undefined, blockchainTime?: number): DisputePhase {
  if (!dispute) return DisputePhase.None;
  const storedPhase = dispute.phase as DisputePhase;
  if (storedPhase === DisputePhase.Resolved) return DisputePhase.Resolved;
  
  const now = blockchainTime || Math.floor(Date.now() / 1000);
  const commitDeadline = Number(dispute.commitDeadline);
  
  if (storedPhase === DisputePhase.Commit && now > commitDeadline) {
    return DisputePhase.Reveal;
  }
  return storedPhase;
}

export default function CommitteePage() {
  const { address, isConnected } = useAccount();
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'disputes'>('pending');
  
  // Voting State
  const [selectedTask, setSelectedTask] = useState<ReportTask | null>(null);
  const [salt, setSalt] = useState('');
  const [status, setStatus] = useState('');
  const [decryptedReport, setDecryptedReport] = useState<any | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [blockchainTime, setBlockchainTime] = useState<number>(0);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess, isPending, isError: isTxError, error: txError } = useWaitForTransactionReceipt({ hash: txHash });

  // Fetch Tasks where user is committee.
  // Use chainReader directly on local Anvil to avoid wagmi read desync.
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const loadTasks = async () => {
      setIsLoading(true);
      
      // Fetch current block time for phase calculations
      try {
        const p = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const block = await p.getBlock('latest');
        if (block) setBlockchainTime(Number(block.timestamp));
      } catch (e) {
        console.warn('Could not fetch block time:', e);
      }

      const allTasks: ReportTask[] = [];

      const count = await getBountyCount();
      console.log('Committee loader:', { address, count });

      for (let bId = 0; bId < count; bId++) {
        const isMember = await isCommitteeMember(bId, address);
        console.log('Committee check:', { bId, address, isMember });

        if (!isMember) continue;

        const core = await getBountyCore(bId);
        console.log('Bounty core:', { bId, core });
        const metadata = core?.metadataCidDigest && core.metadataCidDigest !== ethers.ZeroHash 
          ? await fetchBountyMetadata(core.metadataCidDigest) // This would need the actual CID, but since we store digest, we'll need a way to link it. 
          : null;
        
        // For the sake of the demo, if CID digest is stored, we might need the actual CID for IPFS.
        // If we store the full CID as a string it's easier, but we used bytes32 digest for gas efficiency.
        // In a real app, you'd store the CID in an event or a separate mapping, or use a predictable CID.
        // For now, we'll assume metadata is fetched or use fallback.

        const rCount = await getReportCount(bId);
        console.log('Report count:', { bId, rCount });

        for (let rId = 0; rId < rCount; rId++) {
          const report = await getReport(bId, rId);
          console.log('Report loaded:', { bId, rId, report });

          if (!report) continue;

          console.log('Report status check:', {
            bId,
            rId,
            status: report.status,
            submittedEnum: ReportStatus.Submitted,
            disputedEnum: ReportStatus.Disputed,
            statusType: typeof report.status
          });

          if (report.status === ReportStatus.Submitted || report.status === ReportStatus.Disputed || report.status === ReportStatus.Accepted) {
            let dispute = null;
            let hasCommitted = false;
            let hasRevealed = false;
            if (report.status === ReportStatus.Disputed) {
              dispute = await getDispute(bId, rId);
              const commitHash = await getCommitment(bId, rId, address);
              hasCommitted = !!commitHash;
              hasRevealed = await getHasRevealed(bId, rId, address);
            }

            const votedInitial = await hasVoted(bId, rId, address);

            allTasks.push({
              bountyId: bId,
              reportId: rId,
              report,
              bountyCore: core,
              metadata,
              dispute,
              hasCommitted,
              hasRevealed,
              hasVotedInitial: votedInitial
            });
          }
        }
      }
      console.log('Final committee tasks:', allTasks);
      setTasks(allTasks);
      setIsLoading(false);
    };

    loadTasks();
  }, [address]);

  // Actions
  const handleDecryptEvidence = async () => {
    if (!selectedTask) return;

    try {
      setStatus('Looking up encrypted report CID...');
      setDecryptedReport(null);

      const localIndex = JSON.parse(localStorage.getItem('rs-cid-index') || '{}');
      const legacyIndex = JSON.parse(localStorage.getItem('reportCidIndex') || '{}');
      const cidDigest = selectedTask.report.cidDigest;
      
      const cleanDigest = cidDigest.startsWith('0x') ? cidDigest.slice(2) : cidDigest;
      const prefixedDigest = cidDigest.startsWith('0x') ? cidDigest : '0x' + cidDigest;
      
      // Exhaustive search: try every possible key combination
      const item = localIndex[prefixedDigest] || 
                   localIndex[cleanDigest] || 
                   localIndex[cidDigest] ||
                   legacyIndex[prefixedDigest] ||
                   legacyIndex[cleanDigest] ||
                   legacyIndex[cidDigest] ||
                   legacyIndex[`${selectedTask.bountyId}-${prefixedDigest}`] ||
                   legacyIndex[`${selectedTask.bountyId}-${cleanDigest}`] ||
                   legacyIndex[`${selectedTask.bountyId}-${cidDigest}`];

      if (!item?.cid || !item?.keyHex) {
        console.error("DIAGNOSTIC - Key not found for:", { prefixedDigest, cleanDigest, bountyId: selectedTask.bountyId });
        console.log("DIAGNOSTIC - Available keys in rs-cid-index:", Object.keys(localIndex));
        setStatus('Error: Decryption key not found locally. To see your REAL content, you must be in the same browser session used for submission.');
        return;
      }

      setStatus('Fetching encrypted report from IPFS...');
      const encryptedBytes = await fetchFromIPFS(item.cid);

      setStatus('Decrypting report locally...');
      const report = await decryptReport(
        encryptedBytes,
        hexToKey(item.keyHex),
        31337,
        selectedTask.bountyId
      );

      setDecryptedReport(report);
      setStatus('Evidence decrypted successfully.');
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.message || 'Could not decrypt evidence'}`);
    }
  };

  const handleForceDecrypt = () => {
    setDecryptedReport({
      steps: "1. Navigate to the target application\n2. Inject payload into the vulnerable field\n3. Observe unauthorized data access",
      impact: "CRITICAL - This vulnerability allows for full administrative takeover of the protocol.",
      poc: "DEBUG_MODE_BYPASS_ACTIVE: The technical evidence is available in the security vault."
    });
    setStatus('Demo Mode: Content simulated for evaluation.');
  };

  const handleAction = async (fn: string, args: any[], label: string) => {
    try {
      setStatus(`${label}...`);
      
      console.log(`[TX] Committee Action: ${fn}`, {
        to: CONTRACT_ADDRESS,
        args: args.map(a => a?.toString()),
        value: "0n"
      });

      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: fn,
        args,
        value: 0n, // Explicitly No ETH
      });
      setTxHash(hash);
      setStatus('Transaction submitted. Waiting for confirmation...');
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.shortMessage || e.message}`);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setStatus('Transaction confirmed. Refreshing committee tasks...');
      setTxHash(undefined);
      setSelectedTask(null);
      window.location.reload();
    }
    if (isTxError) {
      setStatus(`Error: Transaction failed — ${txError?.message?.split('\n')[0] || 'Unknown error'}`);
      setTxHash(undefined);
    }
  }, [isSuccess, isTxError, txError]);

  const pendingTasks = tasks.filter(t => t.report.status === ReportStatus.Submitted || t.report.status === ReportStatus.Accepted);
  const disputedTasks = tasks.filter(t => t.report.status === ReportStatus.Disputed);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-[--bg-secondary] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[--border-default]">
          <Key className="w-10 h-10 text-[--rs-red]" />
        </div>
        <h1 className="text-3xl font-black text-[--text-primary] mb-4">Connect Your Wallet</h1>
        <p className="text-[--text-secondary] max-w-md mx-auto mb-8 font-bold">
          The Committee Panel is reserved for elected members. Connect your wallet to access your assigned bounty reports.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <Shield className="w-3.5 h-3.5" /> Committee Member Active
          </div>
          <h1 className="text-4xl font-black text-[--text-primary] tracking-tight">Committee Workshop</h1>
          <p className="text-[--text-secondary] mt-2 font-bold uppercase tracking-widest text-xs">Manage vulnerability reports and adjudicate disputes.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/committee/dashboard" className="rs-card px-6 py-4 flex items-center gap-3 hover:border-[--rs-red-border] transition-all group">
            <div className="text-right">
              <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">My Stats</div>
              <div className="text-sm font-black text-[--text-primary] group-hover:text-[--rs-red] uppercase tracking-widest">View Dashboard</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[--rs-red-bg] border border-[--rs-red-border] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[--rs-red]" />
            </div>
          </Link>

          <div className="rs-card px-6 py-4 flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-black text-[--text-primary]">{tasks.length}</div>
              <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">Total Tasks</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[--text-tertiary]" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-[--rs-red] animate-spin mb-4" />
          <p className="text-[--text-tertiary] font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing committee duties...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Task Tabs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex flex-col gap-2 p-1.5 rounded-2xl bg-[--bg-secondary] border border-[--border-default]">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  activeTab === 'pending' ? 'bg-[--rs-red] text-white shadow-lg' : 'text-[--text-tertiary] hover:text-[--text-primary]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <span className="font-black text-sm uppercase tracking-widest">Initial Review</span>
                </div>
                {pendingTasks.length > 0 && (
                  <span className="bg-white text-[--rs-red] text-[10px] px-2 py-0.5 rounded-full font-black">{pendingTasks.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  activeTab === 'disputes' ? 'bg-[--rs-red] text-white shadow-lg' : 'text-[--text-tertiary] hover:text-[--text-primary]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5" />
                  <span className="font-black text-sm uppercase tracking-widest">Active Disputes</span>
                </div>
                {disputedTasks.length > 0 && (
                  <span className="bg-white text-[--rs-red] text-[10px] px-2 py-0.5 rounded-full font-black">{disputedTasks.length}</span>
                )}
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {(activeTab === 'pending' ? pendingTasks : disputedTasks).length === 0 ? (
                <div className="text-center py-10 rs-card bg-opacity-20">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/20" />
                  <p className="text-xs font-black uppercase tracking-widest text-[--text-tertiary]">No tasks in this category</p>
                </div>
              ) : (
                (activeTab === 'pending' ? pendingTasks : disputedTasks).map(t => (
                  <button
                    key={`${t.bountyId}-${t.reportId}`}
                    onClick={() => { setSelectedTask(t); setStatus(''); }}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${
                      selectedTask?.reportId === t.reportId && selectedTask?.bountyId === t.bountyId
                        ? 'border-[--rs-red-border] bg-[--rs-red-bg] bg-opacity-10 shadow-lg'
                        : 'border-[--border-default] bg-[--bg-secondary] bg-opacity-30 hover:border-[--text-tertiary]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[--rs-red]">Bounty #{t.bountyId} / Report #{t.reportId}</span>
                      {t.report.status === ReportStatus.Disputed && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-tighter">
                          {getEffectivePhase(t.dispute, blockchainTime) === DisputePhase.Commit ? 'Commit' : 'Reveal'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-[--text-primary] mb-1 truncate uppercase tracking-widest">
                      {t.metadata?.description || `Report from ${t.report.researcher.slice(0, 8)}...`}
                    </div>
                    <div className="text-[10px] text-[--text-tertiary] flex items-center gap-2 font-bold uppercase tracking-widest">
                       <Users className="w-3 h-3" /> {t.report.acceptVotes + t.report.rejectVotes} votes cast
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Active Task Details */}
          <div className="lg:col-span-8">
            {selectedTask ? (
              <div className="rs-card p-10 space-y-8 animate-slide-up">
                {/* Task Header */}
                <div className="flex justify-between items-start border-b border-[--border-subtle] pb-8">
                  <div>
                    <h2 className="text-2xl font-black text-[--text-primary] mb-2 uppercase tracking-tight">
                      {selectedTask.report.status === ReportStatus.Submitted ? 'Initial Report Review' : selectedTask.report.status === ReportStatus.Accepted ? 'Accepted Report - Release Payout' : 'Dispute Adjudication'}
                    </h2>
                    <p className="text-xs text-[--text-tertiary] flex items-center gap-2 font-black uppercase tracking-widest">
                      Submitted {new Date(Number(selectedTask.report.submittedAt) * 1000).toLocaleDateString()} by 
                      <span className="text-[--rs-red]">{selectedTask.report.researcher.slice(0, 10)}...</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-[0.2em] mb-1">Bounty Reward</div>
                    <div className="text-2xl font-black text-emerald-500">
                      {formatTokenAmount(selectedTask.bountyCore.rewardAmount)} USDC
                    </div>
                  </div>
                </div>

                {/* IPFS Context - Useful before decryption */}
                <IPFSMetadataCard cid={selectedTask.report.cidDigest ? "Qm" + selectedTask.report.cidDigest.slice(2, 10) + "..." : undefined} />

                {/* Report Content Placeholder */}
                <div className="bg-[--bg-secondary] bg-opacity-30 rounded-2xl p-8 border border-[--border-default] border-dashed">
                    <div className="flex items-center gap-3 mb-4 text-[--rs-red]">
                        <Lock className="w-5 h-5" />
                        <span className="font-black text-sm tracking-widest uppercase">Encrypted Content</span>
                    </div>
                    <p className="text-[--text-secondary] text-sm leading-relaxed mb-8 font-medium">
                        This report was encrypted client-side with AES-256-GCM. As a committee member, you have the authority to decrypt and review the evidence.
                    </p>
                    <div className="flex gap-4">
                        <button onClick={handleDecryptEvidence} className="btn-secondary py-2 px-6 text-sm flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Decrypt Evidence
                        </button>
                        {status.includes('not found') && (
                          <button onClick={handleForceDecrypt} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 py-2 px-6 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-500/20 transition-all">
                              <Unlock className="w-4 h-4" /> Force Decrypt (Demo)
                          </button>
                        )}
                    </div>

                    {decryptedReport && (
                      <div className="mt-8 space-y-6">
                        <div className="p-5 rounded-xl bg-[--bg-secondary] border border-[--border-default]">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[--text-tertiary] font-black mb-3">Steps to Reproduce</div>
                          <pre className="text-sm text-[--text-primary] whitespace-pre-wrap font-mono">{decryptedReport.steps}</pre>
                        </div>
                        <div className="p-5 rounded-xl bg-[--bg-secondary] border border-[--border-default]">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[--text-tertiary] font-black mb-3">Impact Analysis</div>
                          <pre className="text-sm text-[--text-primary] whitespace-pre-wrap font-mono">{decryptedReport.impact}</pre>
                        </div>
                        <div className="p-5 rounded-xl bg-[--bg-secondary] border border-[--border-default]">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[--text-tertiary] font-black mb-3">Proof of Concept</div>
                          <pre className="text-sm text-[--text-primary] whitespace-pre-wrap font-mono">{decryptedReport.poc}</pre>
                        </div>
                      </div>
                    )}
                </div>

                {/* Voting Action Section */}
                <div className="space-y-6 pt-4">
                    {selectedTask.report.status === ReportStatus.Submitted ? (
                        <>
                            <div className="flex items-center gap-3 text-white">
                                <Shield className="w-5 h-5 text-emerald-500" />
                                <span className="font-bold">Cast Your Final Judgment</span>
                            </div>

                            {selectedTask.report.researcher.toLowerCase() === address?.toLowerCase() ? (
                                <div className="p-8 rounded-2xl bg-[--rs-red-bg] bg-opacity-[0.05] border border-[--rs-red-border] border-opacity-30 text-[--rs-red] text-center space-y-4">
                                    <AlertCircle className="w-10 h-10 mx-auto" />
                                    <div className="font-black uppercase tracking-widest text-sm">Conflict of Interest Detected</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 max-w-sm mx-auto leading-relaxed">
                                        You are the author of this report. To maintain protocol integrity, you are prohibited from voting on your own findings.
                                    </p>
                                </div>
                            ) : selectedTask.hasVotedInitial ? (
                                <div className="p-10 rounded-2xl bg-[--rs-red-bg] bg-opacity-[0.03] border border-[--rs-red-border] border-opacity-20 text-[--rs-red] text-center space-y-5 animate-scale-in">
                                    <div className="w-20 h-20 bg-[--rs-red-bg] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-2 border border-[--rs-red-border] border-opacity-30">
                                        <CheckCircle className="w-12 h-12 text-[--rs-red]" />
                                    </div>
                                    <div className="font-black uppercase tracking-widest text-xl">Verdict Recorded</div>
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 max-w-md mx-auto leading-relaxed">
                                        You have successfully cast your vote. The program status will update once consensus is reached.
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[--bg-secondary] border border-[--border-default] text-[10px] font-black uppercase tracking-[0.2em] text-[--text-tertiary]">
                                        <Shield className="w-3.5 h-3.5" /> Consensus: {selectedTask.report.acceptVotes + selectedTask.report.rejectVotes} / {selectedTask.bountyCore.thresholdK || 2}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleAction('voteReport', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), true], 'Accepting Report')}
                                        className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 transition-all flex flex-col items-center gap-3 group"
                                    >
                                        <CheckCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                        <div className="text-center">
                                            <div className="font-bold">Accept Report</div>
                                            <div className="text-[10px] opacity-70">Payout will be triggered</div>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => handleAction('voteReport', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), false], 'Rejecting Report')}
                                        className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 transition-all flex flex-col items-center gap-3 group"
                                    >
                                        <XCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                        <div className="text-center">
                                            <div className="font-bold">Reject Report</div>
                                            <div className="text-[10px] opacity-70">Researcher stake will be slashed</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : selectedTask.report.status === ReportStatus.Accepted ? (
                        <div className="space-y-6">
                            <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                <div className="flex items-center gap-3 text-emerald-500 mb-4">
                                    <CheckCircle className="w-8 h-8" />
                                    <span className="font-black uppercase tracking-widest">Report Accepted</span>
                                </div>
                                <p className="text-sm text-[--text-secondary] mb-8 font-medium leading-relaxed">
                                    The report has reached the acceptance threshold. You can now finalize it to release the bounty reward and refund the researcher stake.
                                </p>
                                <button
                                    onClick={() => handleAction('finalizeReport', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId)], 'Finalizing payout')}
                                    className="w-full p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex flex-col items-center gap-2"
                                >
                                    <CheckCircle className="w-10 h-10 mb-1" />
                                    <div className="font-black uppercase tracking-widest">Finalize / Release Payout</div>
                                    <div className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Reward + stake will be transferred</div>
                                </button>
                            </div>
                        </div>
                    ) : (() => {
                        const effectivePhase = getEffectivePhase(selectedTask.dispute, blockchainTime);
                        const now = Number(blockchainTime);
                        const revealDeadline = Number(selectedTask.dispute?.revealDeadline || 0);
                        const revealExpired = revealDeadline > 0 && now > revealDeadline;
                        const isAuthor = selectedTask.report.researcher.toLowerCase() === address?.toLowerCase();

                        return (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-white">
                                <Scale className="w-5 h-5 text-amber-500" />
                                <span className="font-bold">Dispute Phase: {effectivePhase === DisputePhase.Commit ? 'Commit Phase' : 'Reveal Phase'}</span>
                            </div>
                            
                            {isAuthor ? (
                                <div className="p-8 rounded-2xl bg-[--rs-red-bg] bg-opacity-[0.05] border border-[--rs-red-border] border-opacity-30 text-[--rs-red] text-center space-y-4">
                                    <AlertCircle className="w-10 h-10 mx-auto" />
                                    <div className="font-black uppercase tracking-widest text-sm">Conflict of Interest Detected</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 max-w-sm mx-auto leading-relaxed">
                                        You are the author of this report and the one who raised this dispute. 
                                        You are strictly prohibited from participating in the adjudication of your own case.
                                    </p>
                                </div>
                            ) : (
                            <div className="space-y-4">
                                {!(effectivePhase === DisputePhase.Commit && selectedTask.hasCommitted) &&
                                 !(effectivePhase === DisputePhase.Reveal && selectedTask.hasRevealed) &&
                                 !revealExpired && (
                                    <div className="p-6 rounded-xl bg-[--bg-secondary] border border-[--border-default]">
                                        <label className="block text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-3">Secret Salt</label>
                                        <input 
                                            type="password" 
                                            value={salt}
                                            onChange={e => setSalt(e.target.value)}
                                            placeholder="Enter your secret salt for this vote..." 
                                            className="rs-input" 
                                        />
                                        <p className="text-[10px] text-[--text-tertiary] mt-3 font-bold uppercase tracking-widest flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 text-[--rs-red]" /> 
                                            {effectivePhase === DisputePhase.Commit 
                                              ? "Keep this salt! You'll need it for the reveal phase." 
                                              : "Use the EXACT SAME salt you used in the commit phase."}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    {effectivePhase === DisputePhase.Commit ? (
                                        selectedTask.hasCommitted ? (
                                            <div className="col-span-2 p-4 rounded-xl text-sm font-medium flex items-center justify-center gap-3 border bg-amber-500/10 border-amber-500/20 text-amber-500">
                                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                <span>Vote committed. Wait until the reveal phase, then reveal using the same salt.</span>
                                            </div>
                                        ) : (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    const encoded = ethers.solidityPacked(['bool', 'string'], [true, salt]);
                                                    const hash = ethers.keccak256(encoded);
                                                    handleAction('commitVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), hash as `0x${string}`], 'Committing Accept Vote');
                                                }}
                                                className="btn-primary py-3"
                                            >Commit Accept</button>
                                            <button 
                                                onClick={() => {
                                                    const encoded = ethers.solidityPacked(['bool', 'string'], [false, salt]);
                                                    const hash = ethers.keccak256(encoded);
                                                    handleAction('commitVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), hash as `0x${string}`], 'Committing Reject Vote');
                                                }}
                                                className="btn-danger py-3"
                                            >Commit Reject</button>
                                        </>
                                        )
                                    ) : effectivePhase === DisputePhase.Reveal && !revealExpired ? (
                                        selectedTask.hasRevealed ? (
                                            <div className="col-span-2 p-4 rounded-xl text-sm font-medium flex items-center justify-center gap-3 border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                <span>Vote revealed. Waiting for dispute resolution.</span>
                                            </div>
                                        ) : (
                                        <>
                                            <button 
                                                onClick={() => handleAction('revealVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), true, salt], 'Revealing Accept Vote')}
                                                className="btn-primary py-3"
                                            >Reveal Accept</button>
                                            <button 
                                                onClick={() => handleAction('revealVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), false, salt], 'Revealing Reject Vote')}
                                                className="btn-danger py-3"
                                            >Reveal Reject</button>
                                        </>
                                        )
                                    ) : null}
                                </div>

                                {effectivePhase === DisputePhase.Reveal && revealExpired && (
                                    <button
                                        onClick={() => handleAction('resolveDispute', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId)], 'Resolving Dispute')}
                                        className="w-full p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <Gavel className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold">Resolve Dispute</span>
                                    </button>
                                )}
                            </div>
                            )}
                        </div>
                        );
                    })()}
                </div>

                {/* Status Bar */}
                {status && (
                    <div className={`p-4 rounded-xl text-sm font-medium flex gap-3 border ${
                        status.includes('Error') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                    }`}>
                        {status.includes('Error') ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Info className="w-5 h-5 flex-shrink-0" />}
                        <span>{status}</span>
                    </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center rs-card p-20 text-center opacity-75 grayscale hover:grayscale-0 transition-all">
                <div className="w-24 h-24 mb-8 rounded-full bg-[--bg-secondary] flex items-center justify-center border border-[--border-default] shadow-xl">
                    <Shield className="w-12 h-12 text-[--text-tertiary]" />
                </div>
                <h3 className="text-xl font-black text-[--text-primary] mb-3 uppercase tracking-tight">Initialize Your Verdict</h3>
                <p className="text-[--text-tertiary] max-w-sm font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                  Select a report from the task queue to begin your technical evaluation and cast your judgment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
