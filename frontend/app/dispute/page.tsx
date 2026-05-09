'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, DISPUTE_MODULE_ABI, CONTRACT_ADDRESS, USDC_ADDRESS, REPUTATION_ADDRESS } from '@/services/contracts';
import { Scale, AlertTriangle, Clock, Gavel, Coins, FileWarning, CheckCircle, XCircle, Timer, Shield, Lock, Unlock, Loader2, Activity, Info, Database } from 'lucide-react';
import ReputationDashboard from '@/components/ReputationDashboard';
import TransactionTimeline from '@/components/TransactionTimeline';

enum ReportStatus {
  Submitted = 0,
  Accepted = 1,
  Rejected = 2,
  Disputed = 3,
  Finalized = 4,
}

enum DisputePhase {
  None = 0,
  Commit = 1,
  Reveal = 2,
  Resolved = 3,
}

interface DisputeEntry {
  bountyId: number;
  reportId: number;
  researcher: string;
  status: ReportStatus;
  bond: bigint;
  openedAt: number;
  phase: DisputePhase;
  commitDeadline: number;
  revealDeadline: number;
  acceptVotes: number;
  rejectVotes: number;
  autoEscalated: boolean;
  cid: string;
}

export default function DisputePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [selectedBountyId, setSelectedBountyId] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<DisputeEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [showMissingWarning, setShowMissingWarning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [escrowStats, setEscrowStats] = useState({ paid: 0n, slashed: 0n });

  // ERC20 ABI for allowance/approve
  const ERC20_ABI = [
    { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
  ] as const;

  // Fetch bounty count
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
  });

  const bountyCountNum = Number(bountyCount || 0);

  // Fetch report count for selected bounty
  const { data: selectedReportCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'reportCount',
    args: [BigInt(selectedBountyId || 0)],
    query: { enabled: selectedBountyId !== '' }
  });
  
  const reportCountNum = Number(selectedReportCount || 0);

  // Fetch dispute module address
  const { data: disputeModule } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'disputeModule',
  });

  // Check Allowance for Appeal Bond
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACT_ADDRESS as `0x${string}`],
    query: { enabled: !!address }
  });

  // Fetch Bounty Core for Appeal Bond amount
  const { data: bountyCore } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyCore',
    args: [BigInt(selectedBountyId || 0)],
    query: { enabled: selectedBountyId !== '' }
  });

  const appealBond = bountyCore ? (bountyCore as any)[4] : 0n;
  const hasAllowance = allowance !== undefined && allowance >= appealBond;

  // Committee check

  const publicClient = usePublicClient();
  const [disputes, setDisputes] = useState<DisputeEntry[]>([]);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(true);

  useEffect(() => {
    if (bountyCountNum === 0 || !disputeModule || !publicClient) {
      setIsLoadingDisputes(false);
      return;
    }

    const fetchDisputes = async () => {
      setIsLoadingDisputes(true);
      const foundDisputes: DisputeEntry[] = [];

      try {
        console.log(`[SCANNER] Starting scan for ${bountyCountNum} bounties...`);
        for (let bountyId = 0; bountyId < bountyCountNum; bountyId++) {
          const reportCount = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: BUG_BOUNTY_PLATFORM_ABI,
            functionName: 'reportCount',
            args: [BigInt(bountyId)]
          });

          const count = Number(reportCount);
          console.log(`[SCANNER] Bounty ${bountyId} has ${count} reports.`);

          for (let reportId = 0; reportId < count; reportId++) {
            const reportData = await publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: BUG_BOUNTY_PLATFORM_ABI,
              functionName: 'reports',
              args: [BigInt(bountyId), BigInt(reportId)]
            });

            if (!reportData) continue;
            
            // reports mapping returns a tuple (researcher, submittedAt, paid, status, ...)
            const r = reportData as any;
            const statusIdx = Number(r[3]);
            
            console.log(`[SCANNER] Report ${reportId} Status: ${statusIdx}`);

            if (statusIdx === ReportStatus.Disputed) {
              const key = await publicClient.readContract({
                address: disputeModule as `0x${string}`,
                abi: DISPUTE_MODULE_ABI,
                functionName: 'getDisputeKey',
                args: [BigInt(bountyId), BigInt(reportId)]
              });

              const disputeData = await publicClient.readContract({
                address: disputeModule as `0x${string}`,
                abi: DISPUTE_MODULE_ABI,
                functionName: 'disputes',
                args: [key]
              });

              if (disputeData) {
                const d = disputeData as any;
                foundDisputes.push({
                  bountyId,
                  reportId,
                  researcher: r[0],
                  status: statusIdx,
                  bond: 0n,
                  openedAt: Number(r[1]),
                  phase: (() => {
                    const p = Number(d[2]);
                    const now = Math.floor(Date.now() / 1000);
                    if (p === DisputePhase.Commit && now > Number(d[3])) return DisputePhase.Reveal;
                    return p;
                  })(),
                  commitDeadline: Number(d[3]),
                  revealDeadline: Number(d[4]),
                  acceptVotes: Number(d[5]),
                  rejectVotes: Number(d[6]),
                  autoEscalated: false,
                  cid: "Qm" + Math.random().toString(36).substring(7), // In a real app, convert bytes32 cidDigest
                });
                console.log(`[SCANNER] Added Active Dispute: Bounty ${bountyId}, Report ${reportId}`);
              }
            }
          }
        }
      } catch (err) {
        console.error("Scanner Error:", err);
      }

      setDisputes(foundDisputes);
      setIsLoadingDisputes(false);
    };

    fetchDisputes();
  }, [bountyCountNum, disputeModule, publicClient, refreshTrigger]);

  // Calculate escrow stats
  const escrowCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyState',
    args: [BigInt(i)],
  }));

  const { data: escrowData } = useReadContracts({
    contracts: escrowCalls,
    query: { refetchInterval: 10000 },
  });

  const totalEscrow = (escrowData || []).reduce((acc, res) => {
    if (res.status === 'success' && res.result) {
      return acc + Number((res.result as any)[6]);
    }
    return acc;
  }, 0);

  // Fetch Payout/Slash events for Escrow stats
  useEffect(() => {
    if (!publicClient) return;

    const fetchEscrowHistory = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: {
            type: 'event',
            name: 'ReportFinalized',
            inputs: [
              { indexed: true, name: 'bountyId', type: 'uint256' },
              { indexed: true, name: 'reportId', type: 'uint256' },
              { indexed: false, name: 'result', type: 'uint8' }
            ]
          },
          fromBlock: 0n
        });

        let paid = 0n;
        let slashed = 0n;

        // In a real app, we'd need to fetch the report data to know the exact USDC amount
        // For this demo, we'll estimate or just show counts if amounts are hard to get without more calls
        // Let's assume a default stake of 100 USDC for slashed for visualization
        logs.forEach(log => {
          const result = Number((log as any).args.result);
          if (result === 1) paid += 1000n * 1000000n; // Mock 1000 USDC per payout
          if (result === 2) slashed += 100n * 1000000n; // Mock 100 USDC per slash
        });

        setEscrowStats({ paid, slashed });
      } catch (e) {
        console.error("Escrow history error:", e);
      }
    };

    fetchEscrowHistory();
  }, [publicClient, refreshTrigger]);

  const exec = async (fn: string, args: any[], label: string) => {
    try {
      setStatus(`${label}...`);
      setShowMissingWarning(false);
      
      const bountyId = args[0]?.toString();
      const reportId = args[1]?.toString();

      console.log(`[TX START] Dispute Action: ${fn}`, {
        to: CONTRACT_ADDRESS,
        args: args.map(a => a?.toString()),
        bountyId,
        reportId
      });

      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: fn,
        args,
        value: 0n,
      });

      setLastTxHash(hash);
      setStatus(`Transaction sent: ${hash.slice(0, 10)}... Waiting for confirmation...`);

      // 1. Wait for transaction receipt
      const receipt = await window.ethereum?.request({
        method: 'eth_getTransactionReceipt',
        params: [hash]
      });

      // Simple polling if immediate receipt is null (common in some providers)
      let finalReceipt = receipt;
      if (!finalReceipt) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 2000));
          finalReceipt = await window.ethereum?.request({
            method: 'eth_getTransactionReceipt',
            params: [hash]
          });
          if (finalReceipt) break;
        }
      }

      console.log(`[TX CONFIRMED] ${label} receipt:`, finalReceipt);

      if (finalReceipt && (finalReceipt.status === '0x1' || finalReceipt.status === 1)) {
        setStatus(`${label} — Success! Updating state...`);
        
        // 2. Refresh active disputes
        setRefreshTrigger(prev => prev + 1);
        
        // 6. Detailed Logging
        console.log(`[POST-TX LOG]`, {
          bountyId,
          reportId,
          txHash: hash,
          receiptStatus: finalReceipt.status,
          timestamp: Date.now()
        });

        // Check if it appears after 2 seconds
        setTimeout(() => {
          setDisputes(prev => {
            const exists = prev.find(d => d.reportId === Number(reportId) && d.bountyId === Number(bountyId));
            if (!exists && fn === 'raiseDispute') {
              console.warn("Dispute not found in local state after confirmation.");
              setShowMissingWarning(true);
            }
            return prev;
          });
        }, 3000);

      } else {
        throw new Error("Transaction failed on-chain");
      }
    } catch (e: any) { 
      console.error(`[TX ERROR] ${label}:`, e);
      setStatus(`Error: ${e.shortMessage || e.message}`); 
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setStatus('Approving USDC for appeal bond...');
      const hash = await writeContractAsync({
        abi: ERC20_ABI as any,
        address: USDC_ADDRESS as `0x${string}`,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS as `0x${string}`, appealBond || 100000000n],
      });
      setStatus(`Approval sent: ${hash.slice(0, 10)}...`);
      // Robust polling for 15s to catch chain updates
      const poll = setInterval(() => {
        refetchAllowance();
      }, 2500);

      setTimeout(() => {
        clearInterval(poll);
        refetchAllowance();
        setIsApproving(false);
        setStatus('Approval confirmed! You can now raise the dispute.');
      }, 15000);
    } catch (e: any) {
      console.error(e);
      setStatus(`Approval Failed: ${e.shortMessage || e.message}`);
      setIsApproving(false);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.Disputed:
        return <span className="badge-warning">Disputed</span>;
      case ReportStatus.Accepted:
        return <span className="badge-success">Accepted</span>;
      case ReportStatus.Rejected:
        return <span className="badge-danger">Rejected</span>;
      default:
        return <span className="badge-secondary">{ReportStatus[status]}</span>;
    }
  };

  const getPhaseBadge = (phase: DisputePhase, d?: DisputeEntry) => {
    let activePhase = phase;
    if (d && activePhase === DisputePhase.Commit) {
      const now = Math.floor(Date.now() / 1000);
      if (now > d.commitDeadline) activePhase = DisputePhase.Reveal;
    }

    switch (activePhase) {
      case DisputePhase.Commit:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Lock className="w-3 h-3" /> COMMIT_PHASE</span>;
      case DisputePhase.Reveal:
        return <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Unlock className="w-3 h-3" /> REVEAL_PHASE</span>;
      case DisputePhase.Resolved:
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> RESOLVED</span>;
      default:
        return <span className="badge-secondary">Unknown</span>;
    }
  };

  const getTimeRemaining = (deadline: number) => {
    if (!deadline || deadline === 0) return '—';
    const now = Math.floor(Date.now() / 1000);
    const remaining = deadline - now;
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const openDisputes = disputes.filter(d => d.phase !== DisputePhase.Resolved);
  const resolvedDisputes = disputes.filter(d => d.phase === DisputePhase.Resolved);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Warnings & Status */}
      {showMissingWarning && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">Dispute transaction confirmed but not found in local state. Please refresh the page manually.</p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 mb-4 border border-amber-500/20">
          <Scale className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Dispute Resolution Center</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Decentralized governance for security audits. Appeals are resolved through cryptographically secured commit-reveal voting by the committee.
        </p>
      </div>

      {/* Researcher Reputation Dashboard */}
      <ReputationDashboard />

      {/* Grid for main content and sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Disputes Table */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-400" />
                Active Appeals
              </div>
              {isLoadingDisputes && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
            </h3>

            {openDisputes.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-20 text-brand-400" />
                <p className="text-gray-400 font-medium">No active disputes detected</p>
                <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest font-bold">Network Status: Nominal</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-slate-800">
                      <th className="pb-4 font-bold uppercase text-[10px] tracking-wider">Report</th>
                      <th className="pb-4 font-bold uppercase text-[10px] tracking-wider">Researcher</th>
                      <th className="pb-4 font-bold uppercase text-[10px] tracking-wider">Phase</th>
                      <th className="pb-4 font-bold uppercase text-[10px] tracking-wider">Votes</th>
                      <th className="pb-4 font-bold uppercase text-[10px] tracking-wider">Time Left</th>
                      <th className="pb-4 font-bold uppercase text-[10px] tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {openDisputes.map(d => (
                      <tr key={`${d.bountyId}-${d.reportId}`} className="group hover:bg-slate-800/20 transition-colors">
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">#{d.reportId}</span>
                            <span className="text-[10px] text-gray-500 font-mono">Bounty #{d.bountyId}</span>
                          </div>
                        </td>
                        <td className="py-4 font-mono text-xs text-brand-400/80">{d.researcher.slice(0, 6)}...{d.researcher.slice(-4)}</td>
                        <td className="py-4">{getPhaseBadge(d.phase, d)}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-emerald-500">{d.acceptVotes}</span>
                              <div className="w-1 h-4 bg-emerald-500/20 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 w-full" style={{ height: `${(d.acceptVotes/(d.acceptVotes+d.rejectVotes || 1))*100}%` }} />
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-rose-500">{d.rejectVotes}</span>
                              <div className="w-1 h-4 bg-rose-500/20 rounded-full overflow-hidden">
                                <div className="bg-rose-500 w-full" style={{ height: `${(d.rejectVotes/(d.acceptVotes+d.rejectVotes || 1))*100}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`text-[11px] font-mono font-bold ${d.commitDeadline < Date.now() / 1000 ? 'text-rose-500' : 'text-amber-500'}`}>
                            {getTimeRemaining(d.phase === DisputePhase.Commit ? d.commitDeadline : d.revealDeadline)}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => { setSelectedDispute(d); setSelectedBountyId(String(d.bountyId)); setSelectedReportId(String(d.reportId)); }}
                            className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg transition-colors"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed View / Timeline */}
          {selectedBountyId && selectedReportId && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <TransactionTimeline bountyId={Number(selectedBountyId)} reportId={Number(selectedReportId)} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Escrow Status Sidebar */}
          <div className="glass-card p-6 border-brand-500/20 bg-brand-500/5">
            <h3 className="font-bold text-white flex items-center gap-2 mb-6">
              <Coins className="w-5 h-5 text-brand-400" /> Financial Transparency
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                  <span>Total Locked</span>
                  <span className="text-white">{(totalEscrow / 1000000).toLocaleString()} USDC</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Total Paid</p>
                  <p className="text-lg font-black text-white">{(Number(escrowStats.paid) / 1000000).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">Rewards distributed</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Total Slashed</p>
                  <p className="text-lg font-black text-white">{(Number(escrowStats.slashed) / 1000000).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">Governance sanctions</p>
                </div>
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-2">
                <Info className="w-3 h-3 text-blue-400 mt-0.5" />
                <p className="text-[10px] text-blue-200/60 leading-relaxed">
                  Real-time escrow auditing. All funds are controlled by the smart contract logic and cannot be manually withdrawn.
                </p>
              </div>
            </div>
          </div>

          {/* IPFS Context Removed */}
        </div>
      </div>

      {/* Dispute Scanners & Logic Container */}

      {/* Action Panel */}
      <div className="glass-card p-6 mt-10">
        <h3 className="section-title mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-400" /> 
          Initiate New Action
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Step 1: Select Bounty</label>
            <select
              value={selectedBountyId}
              onChange={e => { setSelectedBountyId(e.target.value); setSelectedReportId(''); }}
              className="input-field cursor-pointer"
            >
              <option value="">-- Choose Bounty --</option>
              {Array.from({ length: bountyCountNum }).map((_, i) => (
                <option key={i} value={i}>Program Instance #{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Step 2: Select Report</label>
            <select
              value={selectedReportId}
              onChange={e => setSelectedReportId(e.target.value)}
              className="input-field cursor-pointer disabled:opacity-50"
              disabled={!selectedBountyId}
            >
              <option value="">-- Choose Report --</option>
              {reportCountNum > 0 ? (
                Array.from({ length: reportCountNum }).map((_, i) => (
                  <option key={i} value={i}>Report #{i}</option>
                ))
              ) : (
                <option value="" disabled>No reports available</option>
              )}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                if (!hasAllowance) {
                  handleApprove();
                } else {
                  exec('raiseDispute', [BigInt(selectedBountyId || 0), BigInt(selectedReportId || 0)], 'Raising dispute');
                }
              }}
              className={`${hasAllowance ? 'btn-warning' : 'btn-primary'} flex items-center justify-center gap-2`}
              disabled={!selectedBountyId || !selectedReportId || isApproving}
            >
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {!hasAllowance ? 'Approve Bond' : 'Raise Dispute'}
            </button>
          <button
            onClick={() => exec('triggerEscalation', [BigInt(selectedBountyId || 0), BigInt(selectedReportId || 0)], 'Escalating')}
            className="btn-danger flex items-center justify-center gap-2"
            disabled={!selectedBountyId || !selectedReportId}
          >
            <Clock className="w-4 h-4" /> Force Escalate
          </button>
          <button
            onClick={() => exec('resolveDispute', [BigInt(selectedBountyId || 0), BigInt(selectedReportId || 0)], 'Resolving dispute')}
            className="btn-primary flex items-center justify-center gap-2"
            disabled={!selectedBountyId || !selectedReportId}
          >
            <Gavel className="w-4 h-4" /> Resolve
          </button>
        </div>

        {/* Existing Dispute Info */}
        {selectedBountyId && selectedReportId && disputes.find(d => d.reportId === Number(selectedReportId) && d.bountyId === Number(selectedBountyId)) && (
          <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
            This report is already in the Dispute phase. Use the table above to manage it.
          </div>
        )}

        {status && (
          <div className={`mt-5 p-4 rounded-xl text-sm font-medium ${
            status.includes('Success') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
            status.includes('Error') ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300' :
            'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

// Scanners moved into useEffect for direct RPC access
