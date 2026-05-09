'use client'

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useReadContract, usePublicClient } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { AdminGuard } from '@/components/AdminGuard';
import { 
  ArrowLeft, FileText, ChevronRight, Search, 
  Filter, CheckCircle, XCircle, Clock, Scale, 
  AlertCircle, Shield, Loader2, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

const STATUS_MAP = ['Submitted', 'Accepted', 'Rejected', 'Disputed', 'Finalized'];

export default function AdminReportsPage() {
  return (
    <AdminGuard>
      <ReportsListContent />
    </AdminGuard>
  );
}

function ReportsListContent() {
  const searchParams = useSearchParams();
  const bountyId = searchParams.get('bountyId');
  const publicClient = usePublicClient();

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bountyCore, setBountyCore] = useState<any>(null);

  // 1. Fetch Bounty Info
  const { data: core } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyCore',
    args: [BigInt(bountyId || 0)],
    query: { enabled: !!bountyId }
  });

  // 2. Fetch Reports Count
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'reportCount',
    args: [BigInt(bountyId || 0)],
    query: { enabled: !!bountyId }
  });

  useEffect(() => {
    if (core) setBountyCore(core);
  }, [core]);

  useEffect(() => {
    async function fetchReports() {
      if (!bountyId || count === undefined) return;
      setLoading(true);
      try {
        const reportPromises = [];
        for (let i = 0; i < Number(count); i++) {
          reportPromises.push(
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: BUG_BOUNTY_PLATFORM_ABI,
              functionName: 'reports',
              args: [BigInt(bountyId), BigInt(i)]
            })
          );
        }
        const results = await Promise.all(reportPromises);
        setReports(results.map((r, i) => ({ id: i, data: r })));
      } catch (err) {
        console.error("Fetch reports error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [bountyId, count, publicClient]);

  if (!bountyId) return <div className="p-20 text-center">No Bounty ID provided</div>;

  const token = bountyCore ? getTokenByAddress(bountyCore[1]) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center text-brand-500">
              <FileText className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Bounty #{bountyId} Reports</h1>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mt-1">Inspection Mode</p>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed">
          <Shield className="w-16 h-16 text-slate-800 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-gray-500">No reports found for this program yet.</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="glass-card p-6 hover:border-brand-500/30 transition-all group">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] font-black text-white">REPORT #{report.id}</span>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      report.data[3] === 1 ? 'bg-emerald-500/10 text-emerald-500' :
                      report.data[3] === 2 ? 'bg-rose-500/10 text-rose-500' :
                      report.data[3] === 3 ? 'bg-amber-500/10 text-amber-500' :
                      'bg-slate-800 text-gray-400'
                    }`}>
                      {STATUS_MAP[report.data[3]]}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Researcher</div>
                      <div className="text-xs font-mono text-white truncate">{report.data[0]}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Locked Stake</div>
                      <div className="text-sm font-black text-white">{formatTokenAmount(report.data[7], 6)} USDC</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Votes (A/R)</div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span className="text-emerald-500">{report.data[5]}</span> / <span className="text-rose-500">{report.data[6]}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Paid Status</div>
                      <div className="text-sm font-black text-white uppercase">{report.data[4] ? '✅ Yes' : '❌ No'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center border-l border-slate-800 pl-6 min-w-[150px]">
                  <Link 
                    href={`/bounty/${bountyId}?reportId=${report.id}`} 
                    className="btn-secondary py-2 px-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    View Details <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
