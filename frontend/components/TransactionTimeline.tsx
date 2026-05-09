'use client'

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { 
  BUG_BOUNTY_PLATFORM_ABI, 
  CONTRACT_ADDRESS,
  PLATFORM_ADDRESS
} from '@/services/contracts';
import { formatAddress } from '@/services/chainReader';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Hash, 
  User, 
  ExternalLink,
  Loader2,
  Lock,
  Gavel,
  Vote,
  Coins,
  Eye,
  Activity,
  Scale
} from 'lucide-react';

interface TimelineEvent {
  name: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  actor: string;
  details: string;
  status: 'success' | 'pending' | 'warning' | 'danger';
  icon: any;
}

export default function TransactionTimeline({ bountyId, reportId }: { bountyId: number, reportId: number }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, provider);

        // Fetch logs
        // Note: Filter by bountyId and reportId if indexed, otherwise filter manually
        const filter = contract.filters.ReportCommitted(BigInt(bountyId), BigInt(reportId));
        const committedLogs = await contract.queryFilter(filter);

        const votedFilter = contract.filters.ReportVoted(BigInt(bountyId), BigInt(reportId));
        const votedLogs = await contract.queryFilter(votedFilter);

        const disputeOpenedFilter = contract.filters.DisputeOpened(BigInt(bountyId), BigInt(reportId));
        const disputeOpenedLogs = await contract.queryFilter(disputeOpenedFilter);

        const voteCommittedFilter = contract.filters.VoteCommitted(BigInt(bountyId), BigInt(reportId));
        const voteCommittedLogs = await contract.queryFilter(voteCommittedFilter);

        const voteRevealedFilter = contract.filters.VoteRevealed(BigInt(bountyId), BigInt(reportId));
        const voteRevealedLogs = await contract.queryFilter(voteRevealedFilter);

        const disputeFinalizedFilter = contract.filters.DisputeFinalized(BigInt(bountyId), BigInt(reportId));
        const disputeFinalizedLogs = await contract.queryFilter(disputeFinalizedFilter);

        const reportFinalizedFilter = contract.filters.ReportFinalized(BigInt(bountyId), BigInt(reportId));
        const reportFinalizedLogs = await contract.queryFilter(reportFinalizedFilter);

        const allLogs = [
          ...committedLogs.map(l => ({ log: l, name: 'ReportCommitted' })),
          ...votedLogs.map(l => ({ log: l, name: 'ReportVoted' })),
          ...disputeOpenedLogs.map(l => ({ log: l, name: 'DisputeOpened' })),
          ...voteCommittedLogs.map(l => ({ log: l, name: 'VoteCommitted' })),
          ...voteRevealedLogs.map(l => ({ log: l, name: 'VoteRevealed' })),
          ...disputeFinalizedLogs.map(l => ({ log: l, name: 'DisputeFinalized' })),
          ...reportFinalizedLogs.map(l => ({ log: l, name: 'ReportFinalized' })),
        ];

        // Process and sort
        const processedEvents: TimelineEvent[] = await Promise.all(
          allLogs.map(async ({ log, name }) => {
            const block = await provider.getBlock(log.blockNumber);
            const parsed = contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data
            });

            let eventName = name;
            let details = '';
            let actor = '';
            let status: 'success' | 'pending' | 'warning' | 'danger' = 'success';
            let Icon = CheckCircle;

            switch (name) {
              case 'ReportCommitted':
                eventName = 'Report Submitted';
                actor = parsed?.args[2] || '';
                details = `Stake of ${ethers.formatUnits(parsed?.args[8], 6)} USDC locked in Escrow`;
                Icon = Lock;
                break;
              case 'ReportVoted':
                eventName = 'Committee Voted';
                actor = parsed?.args[2] || '';
                details = parsed?.args[3] ? 'Voted to ACCEPT' : 'Voted to REJECT';
                status = parsed?.args[3] ? 'success' : 'warning';
                Icon = Vote;
                break;
              case 'DisputeOpened':
                eventName = 'Dispute Raised';
                details = parsed?.args[2] ? 'Automatically escalated (SLA missed)' : 'Raised by researcher';
                status = 'warning';
                Icon = Gavel;
                break;
              case 'VoteCommitted':
                eventName = 'Commit Vote';
                actor = parsed?.args[2] || '';
                details = 'Secret vote committed during dispute';
                status = 'pending';
                Icon = Lock;
                break;
              case 'VoteRevealed':
                eventName = 'Reveal Vote';
                actor = parsed?.args[2] || '';
                details = `Revealed ${parsed?.args[3] ? 'ACCEPT' : 'REJECT'} vote`;
                Icon = Eye;
                break;
              case 'DisputeFinalized':
                eventName = 'Dispute Resolved';
                const outcome = Number(parsed?.args[2]);
                details = outcome === 1 ? 'Outcome: ACCEPTED' : 'Outcome: REJECTED';
                status = outcome === 1 ? 'success' : 'danger';
                Icon = Scale;
                break;
              case 'ReportFinalized':
                eventName = 'Payout Released';
                const result = Number(parsed?.args[2]);
                details = result === 1 ? 'Bounty reward and stake refund sent' : 'Stake slashed and sent to treasury';
                status = result === 1 ? 'success' : 'danger';
                Icon = Coins;
                break;
            }

            return {
              name: eventName,
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: block ? Number(block.timestamp) : 0,
              actor,
              details,
              status,
              icon: Icon
            };
          })
        );

        setEvents(processedEvents.sort((a, b) => a.timestamp - b.timestamp));
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [bountyId, reportId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin mr-3" />
        <span className="text-gray-500 text-sm">Loading transaction history...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10 border border-slate-800 border-dashed rounded-2xl">
        <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No transaction data found for this report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transaction Timeline</h3>
      </div>

      <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
        {events.map((event, idx) => (
          <div key={event.txHash} className="relative group">
            {/* Dot */}
            <div className={`absolute -left-8 top-1 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${
              event.status === 'success' ? 'bg-emerald-500' :
              event.status === 'warning' ? 'bg-amber-500' :
              event.status === 'danger' ? 'bg-rose-500' : 'bg-blue-500'
            }`}>
              <event.icon className="w-3 h-3 text-white" />
            </div>

            <div className="glass-card p-4 hover:border-slate-700 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                <div className="font-bold text-white flex items-center gap-2">
                  {event.name}
                  <span className="text-[10px] text-gray-500 font-mono">#{event.blockNumber}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {new Date(event.timestamp * 1000).toLocaleString()}
                </div>
              </div>

              <div className="text-sm text-gray-400 mb-3">
                {event.details}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/50">
                {event.actor && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Actor:</span>
                    <span className="text-[10px] font-mono text-brand-400">{formatAddress(event.actor)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                    <Hash className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Tx:</span>
                    <a 
                      href={`#`} 
                      className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors underline decoration-dotted"
                      title={event.txHash}
                    >
                      {event.txHash.slice(0, 10)}...
                    </a>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Duplicate imports removed
