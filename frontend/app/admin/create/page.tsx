'use client'
import React, { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract, useBalance, useConfig, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS, REPUTATION_ABI, REPUTATION_ADDRESS } from '@/services/contracts';
import { SUPPORTED_TOKENS, getTokenByAddress } from '@/services/tokens';
import { uploadBountyMetadata } from '@/services/ipfs';
import { AdminGuard } from '@/components/AdminGuard';
import { 
  Shield, Zap, Coins, Clock, ChevronRight, PlusCircle, AlertCircle, 
  Info, Loader2, CheckCircle, ShieldCheck, Tag, Plus, ArrowLeft, X, Wallet 
} from 'lucide-react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { WalletConnect } from '@/components/WalletConnect';
import { toast } from 'sonner';
import { NotificationService } from '@/services/NotificationService';

const ERC20_ABI = [
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const;

export default function CreateBountyPage() {
  const { isConnected, address } = useAccount();
  const queryClient = useQueryClient();

  if (!isConnected || !address) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-24 h-24 bg-[--bg-secondary] border border-[--border-default] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3">
          <Wallet className="w-12 h-12 text-[--rs-red]" />
        </div>
        <h2 className="text-4xl font-black text-[--text-primary] mb-4 tracking-tighter">Identity Required</h2>
        <p className="text-[--text-secondary] mb-8 max-w-md mx-auto leading-relaxed">
          Please connect your secure wallet to initialize a new security program and fund the escrow.
        </p>
        <div className="flex justify-center">
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <CreateBountyForm />
  );
}

function CreateBountyForm() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  // Basic Config
  const [selectedTokenAddr, setSelectedTokenAddr] = useState(SUPPORTED_TOKENS[0].address);
  const [rewardAmount, setRewardAmount] = useState('5000');
  const [initialFund, setInitialFund] = useState('5000');
  const [stakeAmount, setStakeAmount] = useState('50');
  const [appealBond, setAppealBond] = useState('100');

  // Metadata & Tags
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Smart Contract', 'Web3', 'High Severity']);
  const [description, setDescription] = useState('');

  // Dates & SLA
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 14);
  const [submissionDeadline, setSubmissionDeadline] = useState(defaultDate.toISOString().split('T')[0]);
  const [reviewSlaDays, setReviewSlaDays] = useState('3');

  // Rate limits
  const [rateLimitWindowHours, setRateLimitWindowHours] = useState('48');
  const [stakeEscalationBps, setStakeEscalationBps] = useState('1000');
  const [maxInWindow, setMaxInWindow] = useState('2');
  const [maxActiveSubmissions, setMaxActiveSubmissions] = useState('1');

  // Committee
  const [committeeStr, setCommitteeStr] = useState('');
  const [thresholdK, setThresholdK] = useState('1');
  const [disputeCommitDays, setDisputeCommitDays] = useState('3');
  const [disputeRevealDays, setDisputeRevealDays] = useState('6');
  
  const [committeeSize, setCommitteeSize] = useState('3');

  // Auto-fill committee with current user
  useEffect(() => {
    if (address && !committeeStr) {
      setCommitteeStr(address);
    }
  }, [address, committeeStr]);

  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeploymentSuccess, setIsDeploymentSuccess] = useState(false);
  const [bypassAllowance, setBypassAllowance] = useState(false);

  const { isSuccess: isConfirmed, isPending: isConfirming, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: 31337,
  });

  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ 
    hash: approveTxHash,
    chainId: 31337,
  });



  const selectedToken = getTokenByAddress(selectedTokenAddr)!;

  // Check Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedTokenAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACT_ADDRESS as `0x${string}`],
    query: { enabled: !!address }
  });

  // Check Balance
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: address,
    token: selectedTokenAddr,
  });

  useEffect(() => {
    if (isApproveConfirmed) {
      setIsApproved(true);
      queryClient.invalidateQueries();
      refetchAllowance?.();
      refetchBalance?.();
      setIsApproving(false);
      setStatus('✅ Funds approved and verified!');
      toast.success('Blockchain synchronized');
    }
  }, [isApproveConfirmed, refetchAllowance, refetchBalance, queryClient]);

  // Background polling for allowance/balance while page is active
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAllowance();
      refetchBalance();
    }, 10000); // Every 10s
    return () => clearInterval(interval);
  }, [refetchAllowance, refetchBalance]);

  const fundAmountBigInt = BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken?.decimals || 6)));
  const hasEnoughBalance = balance && balance.value >= fundAmountBigInt;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Uploading metadata to IPFS...');

    try {
      const metadata = { tags, description };
      const cid = await uploadBountyMetadata(metadata);

      // 2. Dynamic Committee Selection Logic
      setStatus('Protocol scanning blockchain for high-reputation researchers...');
      
      let dynamicCommittee: `0x${string}`[] = [];
      
      try {
        // Find all researchers from past report events
        const logs = await publicClient?.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'ReportCommitted',
            inputs: [
              { indexed: true, name: "bountyId", type: "uint256" },
              { indexed: true, name: "reportId", type: "uint256" },
              { indexed: true, name: "researcher", type: "address" },
            ]
          } as any,
          fromBlock: 0n
        });

        const allResearchers = Array.from(new Set(logs?.map(log => (log as any).args.researcher as `0x${string}`) || []));
        
        // Filter out the owner (you) and fetch reputations
        const candidates: { address: `0x${string}`, rep: bigint }[] = [];
        
        for (const researcher of allResearchers) {
          if (researcher.toLowerCase() === address?.toLowerCase()) continue;
          
          try {
            const rep = await readContract(config, {
              address: REPUTATION_ADDRESS as `0x${string}`,
              abi: REPUTATION_ABI,
              functionName: 'repScore',
              args: [researcher]
            }) as bigint;

            // In dev/fresh environments, we allow 0 reputation
            candidates.push({ address: researcher, rep });
          } catch (e) {
            console.warn(`Could not fetch reputation for ${researcher}, assuming 0`);
            candidates.push({ address: researcher, rep: 0n });
          }
        }

        console.log("[DYNAMIC-COMMITTEE] Eligible candidates:", candidates);

        // Sort by reputation (descending) and take top 10 for randomness pool
        const topPool = candidates
          .sort((a, b) => Number(b.rep - a.rep))
          .slice(0, 10)
          .map(c => c.address);

        // Shuffle and pick N
        const shuffled = topPool.sort(() => 0.5 - Math.random());
        dynamicCommittee = shuffled.slice(0, parseInt(committeeSize)) as `0x${string}`[];
      } catch (logError) {
        console.error("Failed to fetch dynamic committee, using expert pool fallback:", logError);
      }

        // Fallback: If still too few, use pre-defined expert pool (Anvil Test Accounts)
        if (dynamicCommittee.length < parseInt(committeeSize)) {
          const FALLBACK_EXPERTS: `0x${string}`[] = [
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Anvil #1
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Anvil #2
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Anvil #3
            "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"  // Anvil #4
          ];
          
          const needed = parseInt(committeeSize) - dynamicCommittee.length;
          const extra = FALLBACK_EXPERTS
            .filter(addr => addr.toLowerCase() !== address?.toLowerCase() && !dynamicCommittee.includes(addr))
            .slice(0, needed);
          
          dynamicCommittee = [...dynamicCommittee, ...extra];
          console.log("[AUTO-COMMITTEE] Using Fallback Experts:", extra);
        }

        if (dynamicCommittee.length < parseInt(committeeSize)) {
          throw new Error(`Insufficient researchers or experts found. Need ${committeeSize}, but only have ${dynamicCommittee.length}. Please register more accounts.`);
        }

      // CRITICAL: Filter out owner from final committee to prevent Revert
      const selectedCommittee = dynamicCommittee.filter(addr => 
        addr && addr.toLowerCase() !== address?.toLowerCase()
      );
      
      if (selectedCommittee.length < 1) {
          setStatus('Error: No eligible committee members found (owner excluded). Please add more experts.');
          return;
      }

      console.log("[AUTO-COMMITTEE] Final Selection (Strictly On-Chain):", selectedCommittee);
      // alert("Diagnostic: Committee filtered. Total members: " + selectedCommittee.length);

      const deadlineTimestamp = Math.floor(new Date(submissionDeadline).getTime() / 1000);
      const parseToken = (val: string) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, selectedToken.decimals)));

      const fundAmount = parseToken(initialFund);

      // 3. Approval Flow (Now handled via explicit button)
      if (fundAmount > 0 && !isApproved && !bypassAllowance && (!allowance || allowance < fundAmount)) {
        setStatus('Approval required for initial funding. Please use the Approve button below.');
        return;
      }

      const args = [
        selectedTokenAddr,
        parseToken(rewardAmount),
        parseToken(stakeAmount),
        parseToken(appealBond),
        BigInt(deadlineTimestamp),
        parseInt(reviewSlaDays) * 86400,
        parseInt(rateLimitWindowHours) * 3600,
        parseInt(stakeEscalationBps),
        parseInt(maxInWindow),
        parseInt(maxActiveSubmissions),
        selectedCommittee,
        parseInt(thresholdK),
        parseInt(disputeCommitDays) * 86400,
        parseInt(disputeRevealDays) * 86400,
        cid,
        fundAmount
      ];

      console.log("[TX] Pre-Submission Log (CreateBounty):", {
        to: CONTRACT_ADDRESS,
        function: "createBounty",
        args: args.map(a => a?.toString()),
        value: "0n"
      });

      setIsSubmitting(true);
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'createBounty',
        args: args,
        value: 0n,
      });

      setTxHash(hash);
      setStatus('Transaction submitted. Waiting for confirmation...');
      toast.info('Program deployment in progress', {
        description: 'Waiting for blockchain confirmation...'
      });

      // Add to Inbox using Service
      NotificationService.addNotification({
        title: 'Deploying Protocol',
        message: 'Initializing a new bug bounty program on the blockchain...',
        type: 'info',
        txHash: hash,
        eventName: 'BountyDeploying',
        details: { rewardAmount }
      });
      await waitForTransactionReceipt(config, { hash, chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337) });
      toast.success('Bounty program launched!', {
        description: 'Escrow funded and registry active.'
      });
      setIsDeploymentSuccess(true);
      setIsSubmitting(false);
    } catch (error: any) {
      console.error(error);
      setIsSubmitting(false);
      setStatus(`Failed: ${error.shortMessage || error.message || 'Unknown error'}`);
    }
  };

  if (isDeploymentSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Bounty Successfully Deployed!</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Your bounty has been created and funded. It is now active and ready for researcher submissions.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard" className="rs-btn rs-btn-primary py-3 px-10">View Bounties (Command Center)</Link>
          {process.env.NEXT_PUBLIC_EXPLORER_URL ? (
            <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noreferrer" className="btn-secondary py-3 px-8">View on Explorer</a>
          ) : (
            <div className="btn-secondary py-3 px-8 opacity-50">Local Hash: {txHash?.slice(0,10)}...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[--text-tertiary] hover:text-[--text-primary] transition-colors mb-4 uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-[--text-primary] flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-[--rs-red-bg] border border-[--rs-red-border]">
              <Plus className="w-8 h-8 text-[--rs-red]" />
            </div>
            Create New Bounty
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Info & Token */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-[--text-primary] flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-[--rs-red]" /> Token & Reward
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="rs-label">Payout Token</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUPPORTED_TOKENS.map(t => (
                    <button
                      key={t.address}
                      type="button"
                      onClick={() => setSelectedTokenAddr(t.address)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedTokenAddr === t.address
                          ? 'border-[--rs-red] bg-[--rs-red-bg] text-[--text-primary] shadow-lg shadow-[--rs-red-glow]'
                          : 'border-[--border-default] bg-[--bg-secondary] text-[--text-tertiary] hover:border-[--text-tertiary]'
                        }`}
                    >
                      <img src={t.logoUrl} alt={t.symbol} className="w-6 h-6 rounded-full" />
                      <span className="font-bold">{t.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="rs-label">Reward Amount</label>
                <div className="relative">
                  <input type="number" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} required className="input-field pr-16" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-tertiary]">{selectedToken.symbol}</span>
                </div>
              </div>

              <div>
                <label className="rs-label flex items-center justify-between">
                  Initial Funding
                  <span className="text-[10px] uppercase text-[--rs-red] font-bold bg-[--rs-red-bg] px-2 py-0.5 rounded">Deploy + Fund</span>
                </label>
                <div className="relative">
                  <input type="number" value={initialFund} onChange={e => setInitialFund(e.target.value)} required className="input-field pr-16" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-tertiary]">{selectedToken.symbol}</span>
                </div>
                {balance && (
                  <div className={`mt-2 text-[10px] font-bold flex justify-between ${hasEnoughBalance ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <span>WALLET BALANCE:</span>
                    <span>{balance.formatted} {selectedToken.symbol}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-[--text-primary] flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-[--rs-red]" /> Metadata & Tags
            </h3>

            <div>
              <label className="rs-label">Bounty Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[--bg-secondary] text-[--text-primary] text-sm font-bold border border-[--border-default] animate-fade-up">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-[--text-tertiary] hover:text-[--rs-red]"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag and press Enter..."
                className="input-field"
              />
            </div>


            <div>
              <label className="rs-label">Description (Optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide a high-level description of what researchers should focus on..."
                className="input-field resize-none"
              />
            </div>
          </div>

          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-[--text-primary] flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-[--color-special]" /> Autonomous Governance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="p-6 rounded-2xl bg-[--bg-secondary] border border-[--color-special] border-opacity-30 relative overflow-hidden shadow-inner">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Zap className="w-12 h-12 text-[--color-special]" />
                   </div>
                   <h4 className="text-sm font-black text-[--color-special] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Protocol Selection Active
                   </h4>
                   <p className="text-xs text-[--text-secondary] leading-relaxed mb-6 font-medium">
                      Committee members are selected automatically from the RedSnare Expert Pool based on reputation and availability. This ensures an impartial, anti-collusion adjudication process.
                   </p>
                   
                   <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[--border-subtle]">
                      <div>
                         <label className="rs-label !text-[--text-secondary]">Committee Size (N)</label>
                         <input 
                            type="number" 
                            value={committeeSize} 
                            onChange={e => setCommitteeSize(e.target.value)} 
                            className="input-field" 
                         />
                      </div>
                      <div>
                         <label className="rs-label !text-[--text-secondary]">Threshold (K)</label>
                         <input 
                            type="number" 
                            value={thresholdK} 
                            onChange={e => setThresholdK(e.target.value)} 
                            className="input-field" 
                         />
                      </div>
                   </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="rs-label">Appeal Bond (Disputes)</label>
                <div className="relative">
                   <input type="number" value={appealBond} onChange={e => setAppealBond(e.target.value)} className="input-field" />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[--text-tertiary]">USDC</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters & Submit */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-bold text-[--text-primary] flex items-center gap-2">
              <Info className="w-4 h-4 text-[--rs-red]" /> Rules & Timeframes
            </h3>

            <div className="space-y-4">
              <div>
                <label className="rs-label">Deadline</label>
                <input type="date" value={submissionDeadline} onChange={e => setSubmissionDeadline(e.target.value)} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="rs-label">Review SLA (Days)</label>
                <input type="number" value={reviewSlaDays} onChange={e => setReviewSlaDays(e.target.value)} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="rs-label">Base Stake</label>
                <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="rs-label">Max reports in {rateLimitWindowHours}h</label>
                <input type="number" value={maxInWindow} onChange={e => setMaxInWindow(e.target.value)} className="input-field py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-[--rs-red-border] bg-[--rs-red-bg] bg-opacity-[0.03] space-y-6">
            <h3 className="text-lg font-bold text-[--text-primary] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[--rs-red]" /> Deployment Workflow
            </h3>
            
            <div className="space-y-4">
              {/* Step 1: Approval */}
              <div className="relative pl-8">
                  <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                    allowance && allowance >= BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken.decimals)))
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-[--bg-secondary] border-[--border-default] text-[--text-tertiary]'
                  }`}>
                    {allowance && allowance >= BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken.decimals))) ? <CheckCircle className="w-4 h-4" /> : "1"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[--text-primary]">Approve Funds</h4>
                    <p className="text-[10px] text-[--text-tertiary] mb-3">Grant permission to lock {initialFund} {selectedToken.symbol} in escrow.</p>
                  
                  <button 
                    type="button"
                    onClick={async () => {
                      if (!address || !selectedTokenAddr) return;
                      setIsApproving(true);
                      setStatus(`Approving ${selectedToken.symbol}...`);
                      const fundAmount = BigInt(Math.floor(parseFloat(initialFund) * Math.pow(10, selectedToken.decimals)));
                      
                      try {
                        const hash = await writeContractAsync({
                          address: selectedTokenAddr,
                          abi: ERC20_ABI,
                          functionName: 'approve',
                          args: [CONTRACT_ADDRESS as `0x${string}`, fundAmount],
                          value: 0n,
                        });
                        
                        setApproveTxHash(hash);
                        setStatus('Approval confirmed! Waiting for blockchain sync...');
                        toast.success('Approval transaction sent');
                      } catch (e: any) {
                        setStatus(`Approval Error: ${e.shortMessage || e.message}`);
                        setIsApproving(false);
                      }
                    }}
                    disabled={isApproving || (allowance !== undefined && allowance >= BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken.decimals))))}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      allowance && allowance >= BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken.decimals)))
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 cursor-default'
                      : 'rs-btn rs-btn-primary w-full shadow-lg shadow-[--rs-red-glow]'
                    }`}
                  >
                    {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {allowance && allowance >= BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken.decimals))) ? "Funds Approved" : "Approve Funding"}
                  </button>
                </div>
              </div>

              <div className="w-px h-4 bg-slate-800 ml-3" />

              {/* Step 2: Create */}
               <div className="relative pl-8">
                <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                  isSubmitting ? 'bg-[--rs-red] border-[--rs-red] text-white animate-pulse' : 'bg-[--bg-secondary] border-[--border-default] text-[--text-tertiary]'
                }`}>
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[--text-primary]">Deploy Bounty</h4>
                  <p className="text-[10px] text-[--text-tertiary] mb-3">Finalize configuration and launch the program on-chain.</p>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting || (!bypassAllowance && !isApproved && (!allowance || allowance < fundAmountBigInt))}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      isSubmitting || (!bypassAllowance && !isApproved && (!allowance || allowance < fundAmountBigInt))
                      ? 'bg-[--bg-secondary] border border-[--border-default] text-[--text-tertiary] cursor-not-allowed opacity-50'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    Launch Program
                  </button>
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div className={`p-4 rounded-xl text-sm font-medium flex gap-3 border shadow-lg animate-slide-up ${status.includes('Failed') || status.includes('Error')
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
              }`}>
              {status.includes('Failed') || status.includes('Error') ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Info className="w-5 h-5 flex-shrink-0" />}
              <div className="flex-1">
                <span>{status}</span>
                {status.includes('Waiting') && (
                  <div className="mt-2 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => { refetchAllowance(); refetchBalance(); }}
                      className="underline text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100"
                    >
                      Force Refresh
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setStatus('✅ Approval check bypassed. You can now try to launch.');
                        setBypassAllowance(true);
                      }}
                      className="underline text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100 text-amber-500"
                    >
                      Skip Check (Emergency)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Panel - visible only during sync or if stuck */}
          {(status.includes('Waiting') || isApproving) && (
            <div className="mt-8 p-6 rounded-2xl bg-[--bg-secondary] border border-[--border-default] overflow-hidden relative group animate-fade-in">
              {/* Decorative background element */}
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <ShieldCheck className="w-32 h-32 text-[--rs-red]" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-[--rs-red] animate-pulse" />
                  <h4 className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-[0.3em]">Protocol Manifest</h4>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-wider">Origin Wallet</span>
                    <span className="text-[11px] font-mono text-[--text-primary] truncate bg-black/20 p-2 rounded-lg border border-white/5">{address}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-wider">Target Contract</span>
                    <span className="text-[11px] font-mono text-[--rs-red] truncate bg-black/20 p-2 rounded-lg border border-[--rs-red-border] border-opacity-20">{CONTRACT_ADDRESS}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-wider">Asset Address</span>
                      <span className="text-[11px] font-mono text-[--text-secondary] truncate">{selectedTokenAddr.slice(0, 10)}...</span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-wider">Required Satoshis</span>
                      <span className="text-[13px] font-black text-[--text-primary] tracking-tight">
                        {BigInt(Math.floor(parseFloat(initialFund || '0') * Math.pow(10, selectedToken.decimals))).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[--border-subtle] flex justify-between items-center">
                  <span className="text-[8px] font-bold text-[--text-tertiary] uppercase tracking-widest">Status: Handshaking with EVM...</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-[--rs-red] opacity-20" />
                    <div className="w-1 h-1 rounded-full bg-[--rs-red] opacity-40 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-[--rs-red] opacity-60" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
