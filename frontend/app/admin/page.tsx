'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { AdminGuard } from '@/components/AdminGuard';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import {
  Shield, FileText, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Clock, Plus, Loader2, ExternalLink, Tag, Coins,
  Users, Activity, Globe, Database, TrendingUp, Search
} from 'lucide-react';
import Link from 'next/link';

const STATUS_MAP = ['Submitted', 'Accepted', 'Rejected', 'Disputed', 'Finalized'];

export default function AdminPage() {
  return (
    <AdminGuard>
      <SuperAdminDashboard />
    </AdminGuard>
  );
}

function SuperAdminDashboard() {
  const { address } = useAccount();
  const [activeView, setActiveView] = useState<'overview' | 'bounties' | 'logs'>('overview');
  const [selectedBountyId, setSelectedBountyId] = useState<number | null>(null);

  // 1. Fetch Protocol Stats
  const { data: bountyCountStr, isLoading: isBountyCountLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'bountyCount',
  });

  const bountyCount = Number(bountyCountStr || 0);

  // 2. Fetch All Bounties
  const bountyCalls = Array.from({ length: bountyCount }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'getBountyCore',
    args: [i],
  }));

  const { data: bountiesData } = useReadContracts({
    contracts: bountyCalls,
  });

  const allBounties = (bountiesData || [])
    .map((res: any, i: number) => {
      if (res.status === 'success' && res.result) {
        return { id: i, core: res.result };
      }
      return null;
    })
    .filter(b => b !== null);

  // Stats Calculations
  const totalTVL = allBounties.reduce((acc, b) => acc + BigInt(b.core[2].toString()), 0n);
  const totalBounties = allBounties.length;

  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchLogs() {
      if (activeView !== 'logs' || !publicClient) return;
      setIsLogsLoading(true);
      try {
        const eventConfigs = [
          { name: 'BountyCreated', color: 'border-brand-500 text-brand-400' },
          { name: 'ReportCommitted', color: 'border-blue-500 text-blue-400' },
          { name: 'ReportAccepted', color: 'border-emerald-500 text-emerald-400' },
          { name: 'ReportRejected', color: 'border-rose-500 text-rose-400' },
          { name: 'DisputeRaised', color: 'border-amber-500 text-amber-400' }
        ];

        const allFetchedLogs: any[] = [];
        for (const config of eventConfigs) {
          try {
            const l = await publicClient.getLogs({
              address: CONTRACT_ADDRESS as `0x${string}`,
              event: {
                type: 'event',
                name: config.name,
                inputs: BUG_BOUNTY_PLATFORM_ABI.find((x: any) => x.name === config.name)?.inputs || []
              } as any,
              fromBlock: 0n,
              toBlock: 'latest'
            });
            
            l.forEach(log => {
              allFetchedLogs.push({
                ...log,
                eventName: config.name,
                color: config.color,
                timestamp: new Date()
              });
            });
          } catch (e) { console.error(`Error fetching ${config.name}:`, e); }
        }

        setLogs(allFetchedLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber)));
      } catch (err) {
        console.error("Logs fetch error:", err);
      } finally {
        setIsLogsLoading(false);
      }
    }
    fetchLogs();
  }, [activeView, publicClient]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in font-sans">
      {/* Header Admin */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[--border-subtle] pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-[--rs-red] flex items-center justify-center shadow-2xl shadow-[--rs-red-glow] rotate-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-[--rs-red] uppercase tracking-[0.3em]">Protocol Governance</span>
              <div className="h-1 w-1 rounded-full bg-[--rs-red] animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-[--text-primary] tracking-tighter">Super Admin <span className="text-[--text-tertiary]">Dashboard</span></h1>
          </div>
        </div>

        <div className="flex bg-[--bg-secondary] p-1 rounded-xl border border-[--border-default]">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'overview' ? 'bg-[--rs-red] text-white shadow-lg' : 'text-[--text-tertiary] hover:text-[--text-primary]'}`}
          >Overview</button>
          <button
            onClick={() => setActiveView('bounties')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'bounties' ? 'bg-[--rs-red] text-white shadow-lg' : 'text-[--text-tertiary] hover:text-[--text-primary]'}`}
          >All Programs</button>
          <button
            onClick={() => setActiveView('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'logs' ? 'bg-[--rs-red] text-white shadow-lg' : 'text-[--text-tertiary] hover:text-[--text-primary]'}`}
          >Live Logs</button>
        </div>
      </div>

      {activeView === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
          {/* Global Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="rs-card p-6 border-[--rs-red-border] border-opacity-30 bg-[--rs-red-bg] bg-opacity-[0.03]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-[--rs-red-bg] text-[--rs-red]"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-[--rs-red] uppercase">Growth</span>
              </div>
              <div className="text-3xl font-black text-[--text-primary]">{totalBounties}</div>
              <div className="text-[10px] font-bold text-[--text-tertiary] uppercase mt-1">Total Active Programs</div>
            </div>
            <div className="rs-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500"><Coins className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Liquidity</span>
              </div>
              <div className="text-3xl font-black text-[--text-primary]">{formatTokenAmount(totalTVL.toString(), 6)} <span className="text-sm font-bold text-[--text-tertiary]">USDC</span></div>
              <div className="text-[10px] font-bold text-[--text-tertiary] uppercase mt-1">Total Value Locked</div>
            </div>
            <div className="rs-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500"><Users className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-blue-500 uppercase">Ecosystem</span>
              </div>
              <div className="text-3xl font-black text-[--text-primary]">Active</div>
              <div className="text-[10px] font-bold text-[--text-tertiary] uppercase mt-1">Researcher Network</div>
            </div>
            <div className="rs-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-[--color-special] bg-opacity-[0.2] text-[--color-special]"><Database className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-[--color-special] uppercase">Health</span>
              </div>
              <div className="text-3xl font-black text-[--text-primary]">100%</div>
              <div className="text-[10px] font-bold text-[--text-tertiary] uppercase mt-1">System Uptime</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Global Bounties */}
            <div className="rs-card overflow-hidden">
              <div className="p-6 border-b border-[--border-subtle] flex items-center justify-between">
                <h3 className="font-black text-[--text-primary] uppercase text-xs tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[--rs-red]" /> Recent Protocol Programs
                </h3>
                <button onClick={() => setActiveView('bounties')} className="text-[10px] font-black text-[--rs-red] hover:underline uppercase tracking-widest">View All</button>
              </div>
              <div className="divide-y divide-[--border-subtle]">
                {allBounties.slice(0, 5).map(b => (
                  <div key={b.id} className="p-4 hover:bg-[--bg-secondary] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[--bg-secondary] border border-[--border-default] flex items-center justify-center text-[10px] font-black text-[--text-primary]">#{b.id}</div>
                      <div>
                        <div className="text-xs font-black text-[--text-primary]">Owner: {b.core[0].slice(0, 6)}...{b.core[0].slice(-4)}</div>
                        <div className="text-[10px] text-[--text-tertiary] uppercase font-bold">Reward: {formatTokenAmount(b.core[2], 6)} USDC</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[--text-tertiary]" />
                  </div>
                ))}
              </div>
            </div>

            {/* System Integrity / Logs Preview */}
            <div className="rs-card overflow-hidden">
              <div className="p-6 border-b border-[--border-subtle] flex items-center justify-between">
                <h3 className="font-black text-[--text-primary] uppercase text-xs tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" /> System Integrity Feed
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
              <div className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-[--border-default] mx-auto mb-4 animate-spin" />
                <p className="text-[--text-tertiary] text-xs italic">Protocol event indexer is processing new blocks...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'bounties' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-widest">Full Protocol Index</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
              <input type="text" placeholder="Filter by Owner or ID..." className="input-field py-2 pl-10 pr-4 text-xs w-64" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBounties.map(b => {
              const token = getTokenByAddress(b.core[1]);
              return (
                <div key={b.id} className="rs-card p-6 hover:border-[--rs-red-border] transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-[--bg-secondary] border border-[--border-default] text-[--text-primary] font-black text-xs">#{b.id}</div>
                    <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-1">Created By</div>
                      <div className="text-xs font-mono text-[--text-primary] truncate">{b.core[0]}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-1">Reward Pool</div>
                        <div className="text-sm font-black text-[--text-primary]">{formatTokenAmount(b.core[2], 6)} <span className="text-[10px] text-[--text-tertiary]">USDC</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-1">Researcher Stake</div>
                        <div className="text-sm font-black text-[--text-primary]">{formatTokenAmount(b.core[3], 6)} <span className="text-[10px] text-[--text-tertiary]">USDC</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-[--border-subtle] flex justify-between items-center">
                    <span className="text-[10px] text-[--text-tertiary] font-black uppercase tracking-widest">SLA: {b.core[6]} Days</span>
                    <Link href={`/admin/reports?bountyId=${b.id}`} className="text-[--rs-red] text-[10px] font-black uppercase hover:underline flex items-center gap-1 tracking-widest">
                      Inspect Reports <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeView === 'logs' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="rs-card overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-6 border-b border-[--border-subtle] flex items-center justify-between bg-[--bg-secondary] bg-opacity-50">
                <div className="flex items-center gap-3">
                   <Activity className="w-5 h-5 text-[--rs-red]" />
                   <h3 className="text-xs font-black text-[--text-primary] uppercase tracking-widest">Protocol-Wide Activity Feed</h3>
                </div>
                <div className="flex gap-2">
                   <span className="px-2 py-1 rounded bg-[--bg-secondary] text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2 border border-emerald-500 border-opacity-20">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
                   </span>
                </div>
              </div>

              {isLogsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                   <Loader2 className="w-10 h-10 text-[--rs-red] animate-spin" />
                   <p className="text-[--text-tertiary] text-xs font-black uppercase tracking-widest animate-pulse">Syncing events from Arbitrum Sepolia...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                   <Database className="w-12 h-12 text-[--border-default]" />
                   <p className="text-[--text-tertiary] text-sm max-w-xs mx-auto leading-relaxed font-bold uppercase tracking-widest">
                      No protocol events found on the current network. Start by creating a bounty program.
                   </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[700px] font-mono text-[11px]">
                  {logs.map((log, idx) => (
                    <div key={idx} className={`p-4 bg-[--bg-secondary] bg-opacity-50 rounded-xl border-l-4 shadow-sm transition-all hover:bg-[--bg-secondary] ${log.color.replace('text-brand-400', 'text-[--rs-red]').replace('border-brand-500', 'border-[--rs-red]')}`}>
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-black uppercase tracking-tighter">[{log.eventName}]</span>
                         <span className="text-[--text-hint] text-[9px]">BLOCK #{log.blockNumber.toString()}</span>
                      </div>
                      <div className="text-gray-400 space-y-1">
                         <div className="truncate">TX: {log.transactionHash}</div>
                         <div className="flex items-center gap-2">
                            {log.eventName === 'BountyCreated' && <span>Bounty #{log.args.bountyId?.toString()} launched by {log.args.owner?.slice(0,10)}...</span>}
                            {log.eventName === 'ReportCommitted' && <span>New report #{log.args.reportId?.toString()} for Bounty #{log.args.bountyId?.toString()}</span>}
                            {log.eventName === 'ReportAccepted' && <span className="text-emerald-500">Bounty #{log.args.bountyId?.toString()} Report #{log.args.reportId?.toString()} ACCEPTED</span>}
                            {log.eventName === 'ReportRejected' && <span className="text-rose-500">Bounty #{log.args.bountyId?.toString()} Report #{log.args.reportId?.toString()} REJECTED</span>}
                            {log.eventName === 'DisputeRaised' && <span className="text-amber-500">Dispute opened for Bounty #{log.args.bountyId?.toString()} Report #{log.args.reportId?.toString()}</span>}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
