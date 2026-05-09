'use client'

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS, REPUTATION_ABI, REPUTATION_ADDRESS } from '@/services/contracts';
import { WalletConnect } from '@/components/WalletConnect';
import { 
  LayoutDashboard, Target, Send, Gavel, 
  Activity, Shield, Award, AlertTriangle,
  ChevronRight, Search, Filter, Loader2,
  Lock, Wallet, ArrowUpRight, CheckCircle,
  PlusCircle, Users, Database, ShieldCheck,
  TrendingUp, Coins, Zap, BarChart3,
  ExternalLink, FileText, Plus, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

// Import existing component views — logic untouched
import MyReportsPage from '../submit/my-reports/page';
import ReputationDashboard from '@/components/ReputationDashboard';
import GlobalAdminDashboard from '../admin/global/page';

import { useSearchParams } from 'next/navigation';

export default function UnifiedDashboard() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'bounties' | 'reputation' | 'admin'>(
    (tabParam as any) || 'bounties'
  );

  // Sync tab with URL param if it changes
  useEffect(() => {
    if (tabParam && ['bounties', 'reputation', 'admin'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  const publicClient = usePublicClient();

  // ── All data fetching logic is 100% untouched ─────────────────────────────

  // 1. Get Protocol Metadata
  const { data: bountyCount, refetch: refetchBCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
    query: { refetchInterval: 3000 }
  });
  const bCount = Number(bountyCount || 0);

  const { data: platformAdmin } = useReadContract({
     address: CONTRACT_ADDRESS,
     abi: BUG_BOUNTY_PLATFORM_ABI,
     functionName: 'owner'
  });

  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  const { data: reputation } = useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: 'repScore',
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  const { data: trustScore } = useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: 'getTrustScore',
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  // 2. Multi-Contract Scanning for Roles (Parallel)
  const { data: bountyCores, isLoading: isCoresLoading, refetch: refetchCores } = useReadContracts({
    contracts: Array.from({ length: bCount }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'getBountyCore',
      args: [BigInt(i)]
    })),
    query: { enabled: bCount > 0, staleTime: 2000, refetchInterval: 5000 }
  });

  const { data: bountyStates, refetch: refetchStates } = useReadContracts({
    contracts: Array.from({ length: bCount }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'getBountyState',
      args: [BigInt(i)]
    })),
    query: { enabled: bCount > 0, staleTime: 2000, refetchInterval: 5000 }
  });

  const { data: committeeStatus, refetch: refetchCommittee } = useReadContracts({
    contracts: Array.from({ length: bCount }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'isCommitteeMember',
      args: [BigInt(i), address!]
    })),
    query: { enabled: bCount > 0 && !!address, staleTime: 2000, refetchInterval: 5000 }
  });

  // 3. Process Data
  const myBounties = (bountyCores || []).map((res, i) => {
    if (res.status === 'success' && (res.result as any[])[0].toLowerCase() === address?.toLowerCase()) {
      return { id: i, core: res.result, state: bountyStates?.[i]?.status === 'success' ? bountyStates[i].result : null };
    }
    return null;
  }).filter(b => b !== null);

  const ANVIL_ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const isCommittee = committeeStatus?.some(res => res.status === 'success' && res.result === true) || false;
  const isAdmin = platformAdmin?.toString().toLowerCase() === address?.toLowerCase() || 
                  address?.toLowerCase() === ANVIL_ADMIN.toLowerCase();
  const isDetecting = isCoresLoading && bCount > 0;

  // 4. Fetch Total Earnings (Rewards Won)
  useEffect(() => {
    if (!publicClient || !address) return;
    const fetchEarnings = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: {
            type: 'event',
            name: 'ReportAccepted',
            inputs: [
              { indexed: true, name: "bountyId", type: "uint256" },
              { indexed: true, name: "reportId", type: "uint256" },
              { indexed: true, name: "researcher", type: "address" },
            ]
          } as any,
          args: { researcher: address as `0x${string}` },
          fromBlock: 0n
        });
        let total = 0n;
        for (const log of logs) {
          const bId = (log as any).args.bountyId;
          const core = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: BUG_BOUNTY_PLATFORM_ABI,
            functionName: 'getBountyCore',
            args: [bId]
          }) as any[];
          total += core[2];
        }
        setTotalEarnings(Number(total) / 1e6);
      } catch (e) { console.error("Error fetching earnings:", e); }
    };
    fetchEarnings();
  }, [publicClient, address]);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center mb-8 bg-[--bg-secondary] border border-[--border-default] shadow-2xl rotate-3">
          <Wallet className="w-10 h-10 text-[--rs-red]" />
        </div>
        <h1 className="text-3xl font-black text-[--text-primary] mb-3 uppercase tracking-tight">Identity Required</h1>
        <p className="text-[--text-secondary] max-w-sm mx-auto mb-10 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
          Connect your wallet to access the RedSnare command center.
        </p>
        <WalletConnect inline />
      </div>
    );
  }

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[--text-primary] mb-3 tracking-tight">
              Command <span className="text-[--rs-red]">Center</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--bg-secondary] border border-[--border-default]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[--text-secondary]">
                  {address?.slice(0,10)}...{address?.slice(-6)}
                </span>
              </div>
              {isAdmin && <span className="rs-badge rs-badge-admin font-black uppercase tracking-widest text-[9px]">⬡ Platform Admin</span>}
              {myBounties.length > 0 && <span className="rs-badge rs-badge-verified font-black uppercase tracking-widest text-[9px]">◈ Program Owner</span>}
              {reputation !== undefined && Number(reputation) > 0 && (
                <span className="rs-badge font-black uppercase tracking-widest text-[9px]" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                  ◎ Security Researcher
                </span>
              )}
              {isCommittee && <span className="rs-badge rs-badge-committee font-black uppercase tracking-widest text-[9px]">✦ Committee Member</span>}
              {(!isAdmin && myBounties.length === 0 && (!reputation || Number(reputation) === 0) && !isCommittee) && (
                <span className="rs-badge font-black uppercase tracking-widest text-[9px]" style={{ background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}>
                  ○ Visitor
                </span>
              )}
            </div>
          </div>

          {/* ── METRIC PILLARS ─────────────────────────────────────────── */}
          <div className="flex-1 max-w-2xl">
            {myBounties.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Shield className="w-3.5 h-3.5 text-[--color-info]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-tertiary]">
                    Organizational Metrics
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rs-metric bg-blue-500/5 border-blue-500/20">
                    <div className="text-[9px] font-black uppercase tracking-widest text-blue-500/70 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" /> Trust Score
                    </div>
                    <div className="text-2xl font-black text-[--text-primary]">
                      {trustScore !== undefined ? Number(trustScore) : 100}
                      <span className="text-[10px] text-[--text-tertiary] ml-1">/200</span>
                    </div>
                  </div>
                  <div className="rs-metric bg-indigo-500/5 border-indigo-500/20">
                    <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500/70 mb-2 flex items-center gap-2">
                      <Database className="w-3 h-3" /> Total Escrow
                    </div>
                    <div className="text-2xl font-black text-[--text-primary]">
                      {(Number(myBounties.reduce((acc, b) => acc + (b.state ? BigInt(b.state[6].toString()) : 0n), 0n)) / 1e6).toLocaleString()}
                      <span className="text-[10px] text-[--text-tertiary] ml-1">USDC</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TAB BAR ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-10 p-1.5 rounded-2xl bg-[--bg-secondary] border border-[--border-default] w-fit">
          {[
            { key: 'bounties',   label: 'My Bounties' },
            { key: 'reputation', label: 'Identity & XP' },
            ...(isAdmin      ? [{ key: 'admin',     label: 'Global Control' }] : []),
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                activeTab === key 
                ? 'bg-[--rs-red] text-white shadow-[0_0_20px_rgba(255,51,51,0.3)]' 
                : 'text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[--bg-tertiary]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        {isDetecting ? (
          <div className="py-24 flex flex-col items-center justify-center opacity-60">
            <Loader2 className="w-12 h-12 animate-spin mb-6 text-[--rs-red]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-tertiary] animate-pulse">
              Synchronizing with chain...
            </span>
          </div>
        ) : (
          <div className="animate-fade-up">

            {activeTab === 'bounties' && (
              <div className="space-y-8 animate-fade-up">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-3 text-2xl font-black text-[--text-primary] uppercase tracking-tight">
                    <Shield className="w-8 h-8 text-blue-500" />
                    My Security Programs
                  </h2>
                  <Link href="/admin/create" className="rs-btn rs-btn-primary px-6 py-2.5 text-[10px] uppercase tracking-widest font-black flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Launch New Program
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myBounties.map((b: any) => (
                    <div key={b.id} className="rs-card p-6 border-blue-500/10 hover:border-blue-500/30">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Program #{b.id}</div>
                          <div className="text-xl font-black text-[--text-primary] uppercase tracking-tight">Active Registry</div>
                        </div>
                        <span className={`rs-badge font-black uppercase tracking-widest text-[8px] ${b.state?.[5]
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-[--rs-red-bg] text-[--rs-red] border-[--rs-red-border]'}`}>
                          {b.state?.[5] ? 'Live' : 'Paused'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-[--bg-secondary] border border-[--border-default]">
                          <div className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest mb-2">Escrow Pool</div>
                          <div className="text-lg font-black text-emerald-500">
                            {b.state ? (Number(b.state[6]) / 1e6).toLocaleString() : '0'} <span className="text-[10px] ml-1">USDC</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[--bg-secondary] border border-[--border-default]">
                          <div className="text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest mb-2">Max Reward</div>
                          <div className="text-lg font-black text-blue-500">
                            {b.core ? (Number(b.core[2]) / 1e6).toLocaleString() : '0'} <span className="text-[10px] ml-1">USDC</span>
                          </div>
                        </div>
                      </div>

                      <Link href={`/bounty/${b.id}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[--bg-secondary] border border-[--border-default] text-[10px] font-black uppercase tracking-widest text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-all">
                        Program Details <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'reputation' && (
              <div className="max-w-4xl mx-auto">
                <ReputationDashboard address={address as string} />
              </div>
            )}
            {activeTab === 'admin'     && <GlobalAdminDashboard />}
          </div>
        )}
      </div>
    </div>
  );
}
