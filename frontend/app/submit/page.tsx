'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { prepareSubmission, calculateQualityScore } from '@/services/ipfs';
import { 
  Send, Shield, AlertCircle, CheckCircle, Info, Lock, 
  Terminal, ArrowRight, Zap, Target, Coins, Fingerprint, Loader2, ShieldCheck,
  ChevronRight, Tag, X, Clock, ShieldAlert, Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { WalletConnect } from '@/components/WalletConnect';
import { toast } from 'sonner';
import { NotificationService } from '@/services/NotificationService';

const ERC20_ABI = [
  {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
] as const;

function DropdownList({ isOpen, count, current, onSelect }: { isOpen: boolean, count: number, current: number, onSelect: (id: number) => void }) {
  if (!isOpen) return null;
  return (
    <div className="absolute top-full left-0 right-0 mt-3 bg-[#0D0D0D] border border-[#222222] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="max-h-60 overflow-y-auto scrollbar-thin">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center justify-between group
              ${current === i ? 'bg-brand-500/10 text-brand-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <span>Program Instance #{i}</span>
            {current === i && <CheckCircle className="w-4 h-4" />}
            <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all ${current === i ? 'hidden' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SubmitReportPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const searchParams = useSearchParams();
  const initialBountyId = searchParams.get('bountyId') ? parseInt(searchParams.get('bountyId')!) : 0;
  
  const [bountyId, setBountyId] = useState<number>(initialBountyId);
  
  // Form State
  const [steps, setSteps] = useState('');
  const [impact, setImpact] = useState('');
  const [poc, setPoc] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');

  // Logic State
  const [status, setStatus] = useState('');
  const [submitTxHash, setSubmitTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isApproving, setIsApproving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);

  const { writeContractAsync } = useWriteContract();
  
  const { isSuccess: isSubmitConfirmed, isPending: isSubmitConfirming } = useWaitForTransactionReceipt({ 
    hash: submitTxHash,
    chainId: 31337
  });
  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ 
    hash: approveTxHash,
    chainId: 31337
  });

  // 1. Fetch total bounties
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
    chainId: 31337
  });
  const bountyCountNum = Number(bountyCount || 0);

  // 2. Fetch Bounty Core
  const { data: bountyCore } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyCore',
    args: [BigInt(bountyId)],
    chainId: 31337,
    query: { enabled: bountyCountNum > 0 }
  });

  // 3. Fetch Required Stake
  const { data: requiredStake } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getRequiredStake',
    args: [BigInt(bountyId), address!],
    chainId: 31337,
    query: { enabled: !!address && bountyCountNum > 0 }
  });

  const tokenAddr = bountyCore ? (bountyCore as any)[1] : null;
  const token = tokenAddr ? getTokenByAddress(tokenAddr) : null;
  const displayStake = requiredStake !== undefined ? requiredStake : bountyCore ? (bountyCore as any)[3] : undefined;

  // 4. Check Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACT_ADDRESS as `0x${string}`],
    chainId: 31337,
    query: { enabled: !!address && !!tokenAddr }
  });

  // 5. Check Active Reports Limit
  const { data: bountyState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyState',
    args: [BigInt(bountyId)],
    chainId: 31337,
    query: { enabled: bountyCountNum > 0 }
  });

  const { data: userActiveCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'activeReports',
    args: [BigInt(bountyId), address!],
    chainId: 31337,
    query: { enabled: !!address && bountyCountNum > 0 }
  });

  useEffect(() => {
    if (bountyState) {
      console.log("DEBUG - Bounty State:", bountyState);
      console.log("DEBUG - User Active Count:", userActiveCount);
    }
  }, [bountyState, userActiveCount]);

  const maxActive = bountyState ? Number((bountyState as any)[0]) : 0;
  const currentActive = Number(userActiveCount || 0);
  const isRateLimited = maxActive > 0 && currentActive >= maxActive;

  // Background polling for allowance while page is active
  useEffect(() => {
    if (!address || !tokenAddr) return;
    const interval = setInterval(() => {
      refetchAllowance();
    }, 10000); // Every 10s
    return () => clearInterval(interval);
  }, [address, tokenAddr, refetchAllowance]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isApproveConfirmed) {
      queryClient.invalidateQueries();
      refetchAllowance();
      setIsApproving(false);
      setStatus('Approval confirmed! Updating state...');
      
      // Poll for 10 seconds to ensure we catch the update
      interval = setInterval(async () => {
        if (!address || !publicClient) return;
        queryClient.invalidateQueries();
        
        try {
          const ownerAddr = address.toLowerCase() as `0x${string}`;
          const spenderAddr = CONTRACT_ADDRESS.toLowerCase() as `0x${string}`;
          
          const newAllowance = await publicClient.readContract({
            address: tokenAddr as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [ownerAddr, spenderAddr],
          }) as bigint;

          const required = BigInt(requiredStake?.toString() || '0');
          if (newAllowance >= required) {
            refetchAllowance();
            setStatus('✅ Stake verified!');
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Sync error:", err);
          refetchAllowance();
        }
      }, 2000);
      
      setTimeout(() => clearInterval(interval), 10000);
    }
    return () => clearInterval(interval);
  }, [isApproveConfirmed, refetchAllowance]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bypassAllowance, setBypassAllowance] = useState(false);
  const ownerAddr = bountyCore ? (bountyCore as any)[0] : null;
  const isOwnerOfThisBounty = !!(ownerAddr && address && ownerAddr.toLowerCase() === address.toLowerCase());

  // Reset state on account change
  useEffect(() => {
    setIsSubmitting(false);
    setStatus('');
    setSubmitTxHash(undefined);
    setApproveTxHash(undefined);
  }, [address]);

  useEffect(() => {
    if (isSubmitConfirmed) {
      toast.success('Report submitted successfully!', { description: 'Your encrypted evidence is now on-chain.' });
    }
  }, [isSubmitConfirmed]);

  // This is kept as is — the encrypted var comes from prepareSubmission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return setStatus('Connect your wallet first');
    if (!bountyCore) return setStatus('Loading bounty data, please wait...');
    
    if (isOwnerOfThisBounty) {
      setStatus('Security Violation: You are the owner of this program. Self-submission is strictly prohibited.');
      return;
    }

    // ── QUALITY GATE ──
    const score = calculateQualityScore({ steps, impact, poc });
    if (score < 70 && !bypassAllowance) {
      setCurrentScore(score);
      setShowWarningModal(true);
      return;
    }

    await executeSubmission();
  };

  const executeSubmission = async () => {
    setIsSubmitting(true);
    setStatus('Encrypting report client-side...');
    try {
      const { submission, qualityScore, encrypted } = await prepareSubmission(
        { steps, impact, poc, metadata: { severity, tags: ['Web3'] } },
        bountyId,
        31337
      );

      const stake = requiredStake ? BigInt(requiredStake.toString()) : BigInt(0);
      
      // PRE-FLIGHT CHECK: Balance
      try {
        const userBalance = await publicClient.readContract({
          address: tokenAddr as `0x${string}`,
          abi: [
            { "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
          ],
          functionName: 'balanceOf',
          args: [address]
        }) as bigint;

        if (userBalance < stake) {
          setStatus(`Insufficient USDC Balance. You need ${formatTokenAmount(stake.toString(), 6)} USDC but only have ${formatTokenAmount(userBalance.toString(), 6)}. Please use the Faucet.`);
          setIsSubmitting(false);
          return;
        }
      } catch (e) { console.error("Balance check failed:", e); }

      if (stake > 0 && (!allowance || BigInt(allowance.toString()) < stake)) {
        setStatus('Please approve USDC spending first.');
        setIsSubmitting(false);
        return;
      }

      setStatus('Awaiting wallet signature...');
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submitReport',
        args: [
          BigInt(bountyId),
          submission.salt as `0x${string}`,
          submission.cidDigest as `0x${string}`,
          submission.hSteps as `0x${string}`,
          submission.hImpact as `0x${string}`,
          submission.hPoc as `0x${string}`,
        ],
      });

      setSubmitTxHash(hash);
      setStatus('Transaction submitted. Waiting for confirmation...');
      
      const cidIndex = JSON.parse(localStorage.getItem('rs-cid-index') || '{}');
      const legacyIndex = JSON.parse(localStorage.getItem('reportCidIndex') || '{}');
      
      if (encrypted) {
        const decryptionData = { cid: encrypted.cid, keyHex: encrypted.keyHex };
        cidIndex[submission.cidDigest] = decryptionData;
        legacyIndex[`${bountyId}-${submission.cidDigest}`] = decryptionData;
        localStorage.setItem('rs-cid-index', JSON.stringify(cidIndex));
        localStorage.setItem('reportCidIndex', JSON.stringify(legacyIndex));
      }

      toast.info('Report transaction submitted', { description: 'Waiting for blockchain confirmation...' });

      NotificationService.addNotification({
        title: 'Report Transmitting',
        message: 'Your bug report is being broadcasted to the network...',
        type: 'info',
        txHash: hash,
        eventName: 'ReportTransmitting',
        details: { bountyId }
      });
    } catch (error: any) {
      console.error(error);
      setStatus(`Failed: ${error.shortMessage || error.message}`);
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!address || !tokenAddr || !requiredStake) return;
    try {
      setStatus(`Approving ${token?.symbol}...`);
      setIsApproving(true);
      const hash = await writeContractAsync({
        address: tokenAddr as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS as `0x${string}`, BigInt(requiredStake.toString())],
      });
      setApproveTxHash(hash);
    } catch (e: any) {
      setIsApproving(false);
      setStatus(`Approval Failed: ${e.shortMessage}`);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center mx-auto mb-8 shadow-xl">
          <Wallet className="w-10 h-10 text-[--rs-red]" />
        </div>
        <h2 className="text-3xl font-black text-[--text-primary] mb-3">Identity Required</h2>
        <p className="text-[--text-secondary] mb-10 leading-relaxed font-medium uppercase tracking-widest text-[10px]">
          Connect your secure wallet to submit security findings and deposit your stake.
        </p>
        <div className="flex justify-center"><WalletConnect inline /></div>
      </div>
    );
  }

  if (isSubmitConfirmed) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/20">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-[--text-primary] mb-3">Transmission Successful</h2>
        <p className="text-[--text-secondary] mb-10 leading-relaxed font-medium">
          Your report has been encrypted and committed to the blockchain. The committee will review your findings within the SLA window.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/submit/my-reports" className="rs-btn rs-btn-primary px-8">View My Reports</Link>
          <Link href="/" className="rs-btn rs-btn-secondary px-8">Explorer</Link>
        </div>
      </div>
    );
  }

  const sevConfig: Record<string, { color: string; bg: string; border: string }> = {
    critical: { color: '#E8281E', bg: 'rgba(232,40,30,0.08)',  border: 'rgba(232,40,30,0.4)' },
    high:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.4)' },
    medium:   { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.4)' },
    low:      { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.2)' },
  };

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 bg-[--rs-red-bg] border border-[--rs-red-border]">
              <Zap className="w-3.5 h-3.5 text-[--rs-red]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--rs-red]">
                Secure Submission Interface
              </span>
            </div>
            <h1 className="text-4xl font-black text-[--text-primary] tracking-tight">
              Submit{' '}
              <span className="rs-hero-gradient">
                Findings
              </span>
            </h1>
            <p className="text-[--text-secondary] mt-4 max-w-lg leading-relaxed text-sm font-medium">
              Your report will be encrypted in your browser using AES-256-GCM.
              Only the elected committee can decrypt your evidence.
            </p>
          </div>

          {/* Target selector — Premium Custom Dropdown */}
          <div className="rs-card flex items-center gap-5 min-w-[320px] relative group p-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[--rs-red-bg] border border-[--rs-red-border] shadow-lg shadow-[--rs-red-glow]">
              <Target className="w-6 h-6 text-[--rs-red]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-1.5">
                Target Selection
              </div>
              
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-between w-full text-left bg-transparent border-none p-0 outline-none cursor-pointer group/btn"
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Program Instance #{bountyId}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-90' : ''}`} />
                </button>

                <DropdownList 
                  isOpen={dropdownOpen} 
                  count={bountyCountNum} 
                  current={bountyId} 
                  onSelect={(id) => {
                    setBountyId(id);
                    setDropdownOpen(false);
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 2-COLUMN LAYOUT ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* FORM */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">

            {/* Vulnerability Details */}
            <div className="rs-card" style={{ padding: 28 }}>
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-5 h-5" style={{ color: 'var(--rs-red)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Vulnerability Details</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="rs-label">Steps to Reproduce</label>
                  <textarea value={steps} onChange={e => setSteps(e.target.value)} required
                    className="rs-textarea" style={{ minHeight: 200, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                    placeholder={"1. Navigate to...\n2. Provide input..."} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="rs-label">Impact Analysis</label>
                    <textarea value={impact} onChange={e => setImpact(e.target.value)} required
                      className="rs-textarea" style={{ minHeight: 150 }} placeholder="An attacker can..." />
                  </div>
                  <div>
                    <label className="rs-label">Proof of Concept</label>
                    <textarea value={poc} onChange={e => setPoc(e.target.value)} required
                      className="rs-textarea" style={{ minHeight: 150, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                      placeholder="// Foundry test..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Severity */}
            <div className="rs-card" style={{ padding: 24 }}>
              <label className="rs-label" style={{ marginBottom: 16 }}>Self-Assessed Severity</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['critical', 'high', 'medium', 'low'] as const).map(s => {
                  const cfg = sevConfig[s];
                  const isActive = severity === s;
                  return (
                    <button key={s} type="button" onClick={() => setSeverity(s)}
                      className="py-3 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: isActive ? cfg.bg : 'transparent',
                        border:     `1px solid ${isActive ? cfg.border : 'var(--border-default)'}`,
                        color:      isActive ? cfg.color : 'var(--text-tertiary)',
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isOwnerOfThisBounty ? (
                <div className="p-5 rounded-xl flex items-start gap-4 bg-[--rs-red-bg] border border-[--rs-red-border]">
                  <ShieldAlert className="w-6 h-6 flex-shrink-0 text-[--rs-red]" />
                  <div>
                    <div className="text-sm font-black text-[--rs-red] mb-1 uppercase tracking-tight">Self-Submission Blocked</div>
                    <div className="text-xs text-[--text-secondary] leading-relaxed font-medium">
                      You are the owner of this program. Switch to another account to submit a researcher report.
                    </div>
                  </div>
                </div>
              ) : isRateLimited ? (
                <div className="p-5 rounded-xl flex items-start gap-4 bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-6 h-6 flex-shrink-0 text-amber-500" />
                  <div>
                    <div className="text-sm font-black text-amber-500 mb-1 uppercase tracking-tight">Submission Limit Reached</div>
                    <div className="text-xs text-[--text-secondary] leading-relaxed font-medium">
                      This program only allows {maxActive} active submission{maxActive > 1 ? 's' : ''} at a time. 
                      Please wait for the committee to review your existing report before submitting a new one.
                    </div>
                  </div>
                </div>
              ) : !bypassAllowance && requiredStake && BigInt(requiredStake.toString()) > 0 && (!allowance || BigInt(allowance.toString()) < BigInt(requiredStake.toString())) ? (
                <button type="button" onClick={handleApprove} disabled={isApproving}
                  className="rs-btn rs-btn-primary w-full" style={{ padding: '14px', fontSize: 15, justifyContent: 'center' }}>
                  {isApproving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  1. Approve Stake
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting || (!!submitTxHash && isSubmitConfirming)}
                  className="rs-btn rs-btn-primary w-full shadow-lg shadow-[--rs-red-glow]" style={{ padding: '14px', fontSize: 15, justifyContent: 'center' }}>
                  {(isSubmitting || (!!submitTxHash && isSubmitConfirming))
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><Lock className="w-5 h-5" /> {bypassAllowance ? "Force Submit Report" : (requiredStake && BigInt(requiredStake.toString()) > 0 ? "2. Submit Encrypted Report" : "Submit Report")}</>
                  }
                </button>
              )}
              {status && (
                <div className="p-4 rounded-lg text-center"
                  style={{ background: '#111111', border: '1px solid #2A2A2A', fontSize: 12, fontWeight: 600, color: '#E8281E', letterSpacing: '0.04em' }}>
                  {status}
                  {status.includes('Updating state') && (
                    <button 
                      type="button" 
                      onClick={() => setBypassAllowance(true)}
                      className="block mx-auto mt-2 underline text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100 text-amber-500"
                    >
                      Skip Check (Emergency)
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* INFO PANEL */}
          <div className="lg:col-span-4 space-y-5">

            {/* Staking */}
            <div className="rs-card" style={{ padding: 24, borderColor: 'rgba(232,40,30,0.15)' }}>
              <h3 className="flex items-center gap-2 mb-5" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                <Coins className="w-4 h-4" style={{ color: 'var(--rs-red)' }} /> Staking Details
              </h3>
              <div className="flex justify-between items-end pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Required</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {displayStake ? formatTokenAmount(displayStake.toString(), 6) : '0'} <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>USDC</span>
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, fontStyle: 'italic' }}>
                Stake is returned once the report is finalized.
              </p>
            </div>

            {/* Privacy */}
            <div className="rs-card" style={{ padding: 24 }}>
              <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                <Fingerprint className="w-4 h-4" style={{ color: '#3B82F6' }} /> Evidence Privacy
              </h3>
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Client-Side Encryption. Your evidence never touches our servers in plain text.
                </span>
              </div>
            </div>

            {/* Program Info */}
            {bountyCore && (
              <div className="rs-card" style={{ padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                  Program Info
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Program</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>#{bountyId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Max Reward</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#22C55E' }}>
                      {formatTokenAmount((bountyCore as any)[2], token?.decimals)} {token?.symbol}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── QUALITY WARNING MODAL ── */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rs-card border-[--rs-red-border] bg-[--bg-secondary] overflow-hidden shadow-[0_0_50px_rgba(232,40,30,0.2)] animate-in zoom-in-95 duration-200" style={{ padding: 0 }}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[--rs-red-bg] border border-[--rs-red-border] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[--rs-red-glow]">
                <ShieldAlert className="w-8 h-8 text-[--rs-red]" />
              </div>
              
              <h3 className="text-xl font-black text-[--text-primary] mb-2 uppercase tracking-tighter">Low Quality Score</h3>
              
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-1.5 w-32 bg-[--border-default] rounded-full overflow-hidden">
                  <div className="h-full bg-[--rs-red] transition-all duration-500" style={{ width: `${currentScore}%` }} />
                </div>
                <span className="text-[10px] font-black text-[--rs-red] tracking-widest">{currentScore}/100</span>
              </div>

              <p className="text-[--text-secondary] text-[13px] leading-relaxed mb-8 font-medium">
                Your report is extremely brief. Committees usually reject short reports, and you will <span className="text-[--text-primary] font-bold">lose your USDC stake</span> if they do. 
                Are you sure your finding is clear enough?
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setShowWarningModal(false); executeSubmission(); }}
                  className="rs-btn rs-btn-primary w-full py-4 justify-center text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[--rs-red-glow]"
                >
                  Confirm Submission
                </button>
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[--text-tertiary] hover:text-[--text-primary] transition-colors"
                >
                  Go Back & Improve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
