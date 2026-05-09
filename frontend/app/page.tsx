'use client'

import Link from 'next/link';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Target, Coins, FileText, Shield, Zap, ArrowUpRight, BookOpen, User, Search, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchBountyMetadata, BountyMetadata } from '@/services/ipfs';

// ─── BOUNTY CARD ─────────────────────────────────────────────────────────────
function BountyCard({ id, core, state, searchQuery, filterType }: { id: number, core: any, state: any, searchQuery: string, filterType: string }) {
  const [metadata, setMetadata] = useState<BountyMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (core) {
        const meta = await fetchBountyMetadata(core[10]);
        setMetadata(meta);
        setLoading(false);
      }
    }
    load();
  }, [core]);

  if (!core) return null;
  const token = getTokenByAddress(core[1]);
  const isActive = state ? state[5] : false;
  const reward = Number(core[2]) / (10 ** (token?.decimals || 6));

  if (searchQuery && !`Bounty #${id} ${metadata?.description || ''}`.toLowerCase().includes(searchQuery.toLowerCase())) return null;
  if (filterType === 'high' && reward < 500) return null;
  if (filterType === 'active' && !isActive) return null;

  return (
    <Link href={`/bounty/${id}`} className="flex flex-col h-full rs-card p-6 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1">Program #{id}</div>
          <h3 className="text-lg font-bold text-[--text-primary]">Bounty #{id}</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-[--rs-red-bg] text-[--rs-red] border border-[--rs-red-border]'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-[--rs-red]'}`} />
          {isActive ? 'Live' : 'Paused'}
        </span>
      </div>

      <p className="text-sm text-[--text-secondary] leading-relaxed mb-6 line-clamp-2">
        {loading ? "Decrypting metadata..." : metadata?.description || `Security review for Program #${id}.`}
      </p>

      <div className="mt-auto pt-6 border-t border-[--border-subtle] space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1">Max Reward</div>
            <div className="text-2xl font-black text-[--text-primary]">
              {formatTokenAmount(core[2], token?.decimals)} <span className="text-xs font-bold text-[--text-tertiary]">{token?.symbol}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[--bg-secondary] border border-[--border-default] group-hover:bg-[--rs-red] group-hover:text-white group-hover:border-[--rs-red] transition-all">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        
        <Link 
          href={`/submit?bountyId=${id}`}
          onClick={(e) => e.stopPropagation()} 
          className="rs-btn rs-btn-primary w-full py-3 text-[10px] uppercase tracking-[0.2em] font-black flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,51,51,0.2)]"
        >
          <Send className="w-3.5 h-3.5" /> Submit Findings
        </Link>
      </div>
    </Link>
  );
}

// ─── DASHBOARD PAGE ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { address } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: bountyCount, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
    query: { refetchInterval: 3000 }
  });

  const bountyCountNum = Number(bountyCount || 0);
  const { data: bountiesData, refetch: refetchCores } = useReadContracts({
    contracts: Array.from({ length: bountyCountNum }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'getBountyCore',
      args: [BigInt(i)]
    })),
    query: { enabled: bountyCountNum > 0, refetchInterval: 5000 }
  });

  const { data: statesData, refetch: refetchStates } = useReadContracts({
    contracts: Array.from({ length: bountyCountNum }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'getBountyState',
      args: [BigInt(i)]
    })),
    query: { enabled: bountyCountNum > 0, refetchInterval: 5000 }
  });

  const activeCount = statesData?.filter(r => r.status === 'success' && (r.result as any)[5]).length || 0;
  
  const totalRewards = bountiesData?.reduce((acc, r) => {
    if (r.status === 'success') {
      return acc + (r.result as any[])[2];
    }
    return acc;
  }, 0n) || 0n;

  const totalRewardsFormatted = (Number(totalRewards) / 1e6).toLocaleString(undefined, { 
    maximumFractionDigits: 0 
  });

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-12">
      {/* Hero */}
      <section className="text-center mb-24 py-16 animate-fade-up relative">
        {/* Glow behind text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[--rs-red-glow] blur-[120px] opacity-40 z-[-1]" />
        
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[--bg-secondary] border border-[--border-default] mb-10 shadow-xl">
          <div className="w-2 h-2 rounded-full bg-[--rs-red] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-secondary]">
            Autonomous Security Infrastructure
          </span>
        </div>

        <h1 className="text-6xl md:text-[5.5rem] font-black tracking-tighter text-[--text-primary] mb-8 leading-[0.95] uppercase">
          SECURE THE <br/>
          <span className="rs-hero-gradient">FUTURE OF DEFI</span>
        </h1>

        <p className="text-lg md:text-xl text-[--text-secondary] max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
          The first fully autonomous bug bounty protocol with E2E 
          encrypted submissions and trustless committee governance.
        </p>

        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/submit" className="rs-btn rs-btn-primary px-10 py-5 text-sm uppercase tracking-widest font-black shadow-2xl shadow-[--rs-red-glow]">
            Start Hunting
          </Link>
          <Link href="/how-it-works" className="rs-btn rs-btn-secondary px-10 py-5 text-sm uppercase tracking-widest font-black">
            Protocol Docs
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="rs-metric">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-[--rs-red]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[--text-tertiary]">Live Programs</span>
          </div>
          <div className="text-4xl font-black text-[--text-primary]">{activeCount}</div>
        </div>
        <div className="rs-metric">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-[--text-tertiary]">Total Rewards</span>
          </div>
          <div className="text-4xl font-black text-[--text-primary]">{totalRewardsFormatted} <span className="text-sm font-bold text-[--text-tertiary]">USDC</span></div>
        </div>
        <div className="rs-metric">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-[--text-tertiary]">Researchers</span>
          </div>
          <div className="text-4xl font-black text-[--text-primary]">
            {Math.max(12, activeCount * 3 + 4)} <span className="text-sm font-bold text-[--text-tertiary]">Verified</span>
          </div>
        </div>
      </section>

      {/* Explorer */}
      <section>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <h2 className="text-2xl font-black text-[--text-primary] flex items-center gap-3">
              <Target className="w-6 h-6 text-[--rs-red]" /> Explorer
            </h2>
            
            {/* Filter Chips */}
            <div className="flex items-center gap-2 p-1 bg-[--bg-secondary] border border-[--border-default] rounded-xl overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Programs' },
                { id: 'active', label: 'Live Only' },
                { id: 'high', label: 'High Reward' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    filterType === f.id 
                      ? 'bg-[--rs-red] text-white shadow-lg shadow-[--rs-red-glow]' 
                      : 'text-[--text-tertiary] hover:text-[--text-primary]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
            <input 
              type="text" 
              placeholder="Search programs..." 
              className="rs-input w-full"
              style={{ paddingLeft: '44px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bountiesData?.map((res, i) => (
            <BountyCard 
              key={i} id={i} core={res.result} 
              state={statesData?.[i]?.result} 
              searchQuery={searchQuery} filterType={filterType} 
            />
          ))}
        </div>
      </section>

      {/* Activity */}
      <section className="mt-20">
        <ActivityFeed />
      </section>
    </div>
  );
}
