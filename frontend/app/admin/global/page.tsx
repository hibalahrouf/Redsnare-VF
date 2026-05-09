'use client'

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS, REPUTATION_ABI, REPUTATION_ADDRESS } from '@/services/contracts';
import { AdminGuard } from '@/components/AdminGuard';
import { 
  Shield, Users, Target, FileText, AlertTriangle, 
  Activity, Search, Filter, Ban, CheckCircle, 
  Zap, Database, ArrowUpRight, Clock, Globe,
  Scale, Coins, BarChart3, Loader2
} from 'lucide-react';
import { formatTokenAmount } from '@/services/tokens';
import { toast } from 'sonner';

export default function GlobalAdminDashboard() {
  return (
    <AdminGuard>
      <GlobalDashboardContent />
    </AdminGuard>
  );
}

function GlobalDashboardContent() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState<'users' | 'bounties' | 'disputes' | 'experts' | 'logs'>('users');
  
  // Protocol Data States
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBounties: 0,
    totalReports: 0,
    totalDisputes: 0,
    totalEscrowValue: 0n,
    activeReviewers: 0
  });

  const [users, setUsers] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannedAddresses, setBannedAddresses] = useState<string[]>([]);

  // Load banned list from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rs-global-banned');
    if (saved) setBannedAddresses(JSON.parse(saved));
  }, []);

  const handleToggleBan = (addr: string) => {
    const newBanned = bannedAddresses.includes(addr.toLowerCase())
      ? bannedAddresses.filter(a => a !== addr.toLowerCase())
      : [...bannedAddresses, addr.toLowerCase()];
    
    setBannedAddresses(newBanned);
    localStorage.setItem('rs-global-banned', JSON.stringify(newBanned));
    
    if (newBanned.includes(addr.toLowerCase())) {
      toast.error(`User ${addr.slice(0,6)}... banned from protocol views`);
    } else {
      toast.success(`User ${addr.slice(0,6)}... restored`);
    }
  };

  // Fetch Global Data
  useEffect(() => {
    if (!publicClient) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Bounty Count
        const count = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: BUG_BOUNTY_PLATFORM_ABI,
          functionName: 'bountyCount'
        });
        const bountyCountNum = Number(count);

        let totalR = 0;
        let totalE = 0n;
        const allBounties = [];
        const userSet = new Set<string>();
        
        console.log("[DEBUG] Fetching Global Data...");
        console.log("[DEBUG] Contract Address:", CONTRACT_ADDRESS);

        const treasuryAddr = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: BUG_BOUNTY_PLATFORM_ABI,
          functionName: 'treasury'
        }).catch(e => {
          console.error("[DEBUG] Treasury call failed:", e);
          return "0x0000000000000000000000000000000000000000";
        }) as string;

        userSet.add(treasuryAddr.toLowerCase());
        if (address) userSet.add(address.toLowerCase());
        
        console.log("[DEBUG] Treasury:", treasuryAddr);
        console.log("[DEBUG] Bounty Count:", bountyCountNum);

        let allDisputes = [];
        // 2. Fetch Bounty Details & Disputes
        for (let i = 0; i < bountyCountNum; i++) {
          try {
            const bId = BigInt(i);
            const core = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: BUG_BOUNTY_PLATFORM_ABI,
              functionName: 'getBountyCore',
              args: [bId]
            }) as any[];
            
            const state = await publicClient.readContract({
               address: CONTRACT_ADDRESS,
               abi: BUG_BOUNTY_PLATFORM_ABI,
               functionName: 'getBountyState',
               args: [bId]
            }) as any[];

            const rCount = Number(await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: BUG_BOUNTY_PLATFORM_ABI,
              functionName: 'reportCount',
              args: [bId]
            }));

            userSet.add(core[0].toLowerCase()); // Owner
            totalR += rCount;
            totalE += state[6]; // Escrow balance

            // Scan reports for disputes
            for (let j = 0; j < rCount; j++) {
              const rId = BigInt(j);
              const report = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: BUG_BOUNTY_PLATFORM_ABI,
                functionName: 'reports',
                args: [bId, rId]
              }) as any[];
              
              userSet.add(report[0].toLowerCase()); // Researcher

              if (report[3] === 3) { // Status.Disputed
                allDisputes.push({
                  bountyId: i,
                  reportId: j,
                  researcher: report[0],
                  stake: report[7],
                  votes: { accept: Number(report[5]), reject: Number(report[6]) }
                });
              }
            }

            allBounties.push({ 
              id: i, 
              core, 
              state, 
              reportCount: rCount
            });
          } catch (err) {
            console.error(`Error fetching bounty ${i}:`, err);
          }
        }

        // 3. Fetch REAL Logs
        const eventNames = ['BountyCreated', 'ReportCommitted', 'ReportAccepted', 'ReportRejected', 'DisputeRaised', 'DisputeResolved'];
        const allFetchedLogs: any[] = [];
        
        for (const eName of eventNames) {
          try {
            const l = await publicClient.getLogs({
              address: CONTRACT_ADDRESS,
              event: {
                type: 'event',
                name: eName,
                inputs: BUG_BOUNTY_PLATFORM_ABI.find((x: any) => x.name === eName)?.inputs || []
              } as any,
              fromBlock: 0n,
              toBlock: 'latest'
            });
            
            l.forEach((log, idx) => {
              const actor = (log.args as any).researcher || (log.args as any).owner || (log.args as any).committeeMember || 'Protocol';
              if (actor !== 'Protocol') userSet.add(actor.toLowerCase());
              
              allFetchedLogs.push({
                id: `${eName}-${idx}`,
                type: eName,
                actor,
                time: `Block #${log.blockNumber?.toString()}`,
                status: 'Confirmed',
                blockNumber: log.blockNumber
              });
            });
          } catch (err) {
             console.warn(`Could not fetch logs for ${eName}:`, err);
          }
        }

        console.log("[DEBUG] Total Logs Found:", allFetchedLogs.length);
        console.log("[DEBUG] Total Users Identified:", userSet.size);

        setLogs(allFetchedLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber)));
        setBounties(allBounties);
        setDisputes(allDisputes);
        setStats({
          totalUsers: userSet.size,
          totalBounties: bountyCountNum,
          totalReports: totalR,
          totalDisputes: allDisputes.length,
          totalEscrowValue: totalE,
          activeReviewers: 12
        });

        // Populate users from all actors found in events
        const ANVIL_ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        const identifiedUsers = await Promise.all(Array.from(userSet).map(async addr => {
          let rep = 0n;
          try {
            rep = await publicClient.readContract({
              address: REPUTATION_ADDRESS,
              abi: REPUTATION_ABI,
              functionName: 'repScore',
              args: [addr as `0x${string}`]
            }) as bigint;
          } catch (e) {
            // Might not have reputation yet
          }

          return {
            address: addr,
            role: (addr.toLowerCase() === treasuryAddr.toLowerCase() || addr.toLowerCase() === ANVIL_ADMIN.toLowerCase()) ? 'Super Admin' : 
                  (allBounties.some(b => b.core[0].toLowerCase() === addr.toLowerCase()) ? 'Organization' : 'Researcher'),
            rep: Number(rep),
            status: bannedAddresses.includes(addr.toLowerCase()) ? 'Banned' : 'Active'
          };
        }));
        setUsers(identifiedUsers);

      } catch (e) {
        console.error("Global Dashboard Error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [publicClient, address, bannedAddresses.length]);

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── STATS BAR ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {[
            { label: 'Total Escrow', value: `${(Number(stats.totalEscrowValue)/1e6).toLocaleString()} USDC`, color: 'var(--rs-red)' },
            { label: 'Active Bounties', value: stats.totalBounties, color: 'var(--rs-green)' },
            { label: 'Submissions', value: stats.totalReports, color: 'var(--rs-blue)' },
            { label: 'Disputes', value: stats.totalDisputes, color: '#F59E0B' },
            { label: 'Experts Pool', value: 12, color: 'var(--color-special)' },
            { label: 'Total Users', value: stats.totalUsers, color: 'var(--text-secondary)' },
          ].map(s => (
            <div key={s.label} className="rs-metric" style={{ padding: '20px' }}>
              <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-2">{s.label}</div>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* SIDEBAR */}
          <div className="lg:col-span-3 space-y-1">
            <div className="text-[11px] font-black text-[--text-tertiary] uppercase tracking-[0.2em] mb-4 pl-4">
              Global Command
            </div>
            {[
              { id: 'users',    label: 'Users & Roles',      icon: Users },
              { id: 'bounties', label: 'Security Programs',  icon: Target },
              { id: 'disputes', label: 'Dispute Cases',      icon: AlertTriangle },
              { id: 'experts',  label: 'Reviewer Pool',      icon: Shield },
              { id: 'logs',     label: 'System Logs',        icon: Database },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-sm font-bold transition-all border ${
                  activeTab === item.id 
                  ? 'bg-[--rs-red-bg] border-[--rs-red-border] text-[--rs-red] shadow-lg shadow-[--rs-red-glow]' 
                  : 'bg-transparent border-transparent text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
                }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>

          {/* CONTENT PANEL */}
          <div className="lg:col-span-9 rs-card" style={{ padding: 28 }}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ opacity: 0.5 }}>
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#E8281E' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  Scraping On-Chain State...
                </span>
              </div>
            ) : (
              <>
                {/* USERS TAB */}
                {activeTab === 'users' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black text-[--text-primary] uppercase tracking-tight">Identity Registry</h3>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
                        <input type="text" placeholder="Filter by address..." className="input-field pl-10 text-xs w-64" />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                            {['Address', 'Active Role', 'Reputation', 'Status', ''].map(h => (
                              <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 12, paddingRight: 16 }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.address} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '12px 16px 12px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                {u.address.slice(0,10)}...{u.address.slice(-6)}
                              </td>
                              <td style={{ padding: '12px 16px 12px 0' }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                                  {u.role}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px 12px 0', fontSize: 14, fontWeight: 700, color: '#fff' }}>{u.rep}</td>
                              <td style={{ padding: '12px 16px 12px 0' }}>
                                <span className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, color: u.status === 'Active' ? '#22C55E' : '#E8281E' }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.status === 'Active' ? '#22C55E' : '#E8281E' }} />
                                  {u.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 0 12px 0', textAlign: 'right' }}>
                                <button onClick={() => handleToggleBan(u.address)}
                                  title={u.status === 'Banned' ? 'Unban User' : 'Ban User'}
                                  style={{ color: u.status === 'Banned' ? '#22C55E' : 'rgba(255,255,255,0.3)', padding: 6, borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = u.status === 'Banned' ? '#16A34A' : '#E8281E')}
                                  onMouseLeave={e => (e.currentTarget.style.color = u.status === 'Banned' ? '#22C55E' : 'rgba(255,255,255,0.3)')}>
                                  {u.status === 'Banned' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* BOUNTIES TAB */}
                {activeTab === 'bounties' && (
                  <div className="space-y-6">
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Security Marketplace State</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bounties.map(b => (
                        <div key={b.id} className="rs-card" style={{ padding: 20 }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,40,30,0.3)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A2A')}>
                          <div className="flex justify-between items-start mb-4">
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Program #{b.id}</div>
                            <span className="rs-badge" style={b.state[5]
                              ? { background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }
                              : { background: 'rgba(232,40,30,0.08)', color: '#E8281E', border: '1px solid rgba(232,40,30,0.2)' }}>
                              {b.state[5] ? 'Live' : 'Paused'}
                            </span>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Escrow Pool</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>{(Number(b.state[6])/1e6).toLocaleString()} USDC</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Active Reports</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#E8281E' }}>{b.reportCount}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors"
                              style={{ background: '#111111', border: '1px solid #2A2A2A', color: 'rgba(255,255,255,0.4)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>Pause</button>
                            <button className="flex-1 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors"
                              style={{ background: '#111111', border: '1px solid #2A2A2A', color: 'rgba(255,255,255,0.4)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>Audit History</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DISPUTES TAB */}
                {activeTab === 'disputes' && (
                  <div className="space-y-6">
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Active Protocol Disputes</h3>
                    {disputes.length === 0 ? (
                      <div className="py-20 text-center rounded-xl" style={{ background: '#111111', border: '1px dashed #2A2A2A' }}>
                        <Shield className="w-14 h-14 mx-auto mb-4" style={{ color: '#2A2A2A' }} />
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>No Active Disputes</h4>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>The protocol is currently operating with 100% consensus.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {disputes.map((d, idx) => (
                          <div key={idx} className="rs-card flex justify-between items-center" style={{ padding: 20 }}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Bounty #{d.bountyId} / Report #{d.reportId}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                                  Researcher: {d.researcher.slice(0,10)}... · Stake: {formatTokenAmount(d.stake, 6)} USDC
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 6 }}>
                                  Consensus
                                </div>
                                <div className="flex gap-1.5 justify-end">
                                  {Array.from({length: 3}).map((_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full"
                                      style={{ background: i < d.votes.accept ? '#22C55E' : i < (d.votes.accept + d.votes.reject) ? '#E8281E' : '#2A2A2A' }} />
                                  ))}
                                </div>
                              </div>
                              <button className="rs-btn rs-btn-secondary" style={{ padding: '8px 16px', fontSize: 11 }}>Intervene</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* LOGS TAB */}
                {activeTab === 'logs' && (
                  <div className="space-y-4">
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Security Event Ledger</h3>
                    <div className="space-y-3">
                      {logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-4 rounded-lg transition-colors"
                          style={{ background: '#111111', border: '1px solid #2A2A2A' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#3A3A3A')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A2A')}>
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ background: '#0A0A0A', border: '1px solid #2A2A2A' }}>
                              <Activity className="w-4 h-4" style={{ color: '#E8281E' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{log.type}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Actor: {log.actor} · {log.time}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                              {log.status}
                            </span>
                            <ArrowUpRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EXPERTS TAB */}
                {activeTab === 'experts' && (
                  <div className="space-y-8">
                    {/* Config Panel */}
                    <div className="relative overflow-hidden rounded-xl p-6"
                      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <div className="absolute top-0 right-0 p-6 pointer-events-none" style={{ opacity: 0.06 }}>
                        <Shield style={{ width: 100, height: 100 }} />
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Reviewer Pool Eligibility</h3>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
                        Configure the minimum requirements for experts to be selected in autonomous committees.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Min. Reputation', value: '50 XP',   color: '#8B5CF6' },
                          { label: 'Slash Penalty',   value: '-20 XP',  color: '#E8281E' },
                          { label: 'Cooldown Period', value: '48h',     color: '#3B82F6' },
                          { label: 'Active Pool', value: `${users.filter(u => u.role === 'Researcher').length} Expert`, color: '#22C55E' },
                        ].map(m => (
                          <div key={m.label} className="p-4 rounded-lg" style={{ background: '#0A0A0A', border: '1px solid #2A2A2A' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{m.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Experts */}
                    <div className="space-y-3">
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Expert Pool</h4>
                      {users.filter(u => u.role === 'Researcher' && u.status === 'Active').length === 0 ? (
                        <div className="py-12 text-center rounded-lg" style={{ background: '#111111', border: '1px dashed #2A2A2A' }}>
                          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#2A2A2A' }} />
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No active experts discovered on-chain yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {users.filter(u => u.role === 'Researcher' && u.status === 'Active').map(u => (
                            <div key={u.address} className="flex items-center justify-between p-4 rounded-lg"
                              style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                  style={{ background: 'rgba(232,40,30,0.08)', border: '1px solid rgba(232,40,30,0.2)' }}>
                                  <Shield className="w-4 h-4" style={{ color: '#E8281E' }} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>
                                    {u.address.slice(0,18)}...
                                  </div>
                                  <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>{u.rep} XP</div>
                                </div>
                              </div>
                              <button onClick={() => handleToggleBan(u.address)} title="Ban Expert"
                                style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'transparent', padding: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#E8281E')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                                <Ban className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Banned */}
                    <div className="space-y-3">
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Banned Experts</h4>
                      {users.filter(u => u.status === 'Banned').length === 0 ? (
                        <div className="py-8 text-center rounded-lg" style={{ background: '#111111', border: '1px dashed #2A2A2A' }}>
                          <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#22C55E' }} />
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No experts currently banned from the protocol.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {users.filter(u => u.status === 'Banned').map(u => (
                            <div key={u.address} className="flex justify-between items-center p-4 rounded-lg"
                              style={{ background: 'rgba(232,40,30,0.04)', border: '1px solid rgba(232,40,30,0.15)' }}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                  style={{ background: 'rgba(232,40,30,0.08)' }}>
                                  <Ban className="w-4 h-4" style={{ color: '#E8281E' }} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>{u.address}</div>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{u.role}</div>
                                </div>
                              </div>
                              <button onClick={() => handleToggleBan(u.address)}
                                style={{ fontSize: 11, fontWeight: 600, color: '#22C55E', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Restore Access
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
