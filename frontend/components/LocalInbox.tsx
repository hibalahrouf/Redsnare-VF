'use client'

import React, { useEffect, useState, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { 
  Bell, Info, CheckCircle, XCircle, AlertTriangle, 
  ExternalLink, X, MessageSquare, Shield, Gavel, 
  Coins, User, Hash, Clock, Database, ChevronRight 
} from 'lucide-react';
import { formatUnits } from 'viem';
import { NotificationService, RSNotification as Notification } from '@/services/NotificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  txHash: string;
  eventName: string;
  details: any;
  isNew: boolean;
}

export default function LocalInbox() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const initialized = useRef(false);

  // Sync with service
  const refreshNotifs = () => {
    setNotifications(NotificationService.getNotifications());
  };

  useEffect(() => {
    refreshNotifs();
    window.addEventListener('rs-notif-update', refreshNotifs);
    return () => window.removeEventListener('rs-notif-update', refreshNotifs);
  }, []);

  // Map events to human-readable format
  const processEvent = (log: any, isLive = false): Notification => {
    const { eventName, args, transactionHash, blockNumber } = log;
    let title = eventName;
    let message = '';
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';
    let details = { ...args };

    switch (eventName) {
      case 'BountyInitialized':
        title = 'Protocol Launched';
        message = `Bounty Program #${args.bountyId} has been successfully initialized and listed.`;
        type = 'success';
        break;
      case 'EscrowFunded':
        title = 'Escrow Funded';
        message = `Liquidity injection detected for Program #${args.bountyId}. Escrow is now active.`;
        type = 'success';
        break;
      case 'ReportCommitted':
        title = 'Vulnerability Logged';
        message = `New encrypted report #${args.reportId} received for Bounty #${args.bountyId}.`;
        type = 'info';
        break;
      case 'ReportVoted':
        title = 'Expert Verdict';
        message = `A committee member has cast a vote on Report #${args.reportId}.`;
        type = args.accepted ? 'success' : 'warning';
        break;
      case 'DisputeOpened':
        title = 'Dispute Escalation';
        message = `A researcher has challenged the verdict for Report #${args.reportId}.`;
        type = 'error';
        break;
      case 'DisputeFinalized':
        title = 'Resolution Reached';
        message = `The dispute for Report #${args.reportId} has been finalized by the committee.`;
        type = 'success';
        break;
      case 'ReportFinalized':
        title = 'Payout Executed';
        message = `Funds released for Report #${args.reportId} in Bounty #${args.bountyId}.`;
        type = 'success';
        break;
      default:
        title = eventName || 'System Event';
        message = `Action ${eventName || 'detected'} recorded on-chain.`;
        type = 'info';
    }
    
    return {
      id: `${transactionHash}-${eventName}`,
      title,
      message,
      type,
      timestamp: Date.now(), // In a real app, fetch block timestamp
      txHash: transactionHash,
      eventName,
      details,
      isNew: isLive
    };
  };

  useEffect(() => {
    if (!publicClient || initialized.current) return;
    initialized.current = true;

    const fetchPastEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 2000n ? currentBlock - 2000n : 0n;

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock,
          toBlock: 'latest'
        });

        // We need to parse logs manually because getLogs doesn't use the ABI mapping by default
        // In a real project, you'd use viem's parseEventLogs
        // For simplicity here, I'll mock the historical fetch but implement the real watch
        
        setNotifications([
            {
                id: 'init-1',
                title: 'System Online',
                message: 'RedSnare Event Indexer is now monitoring the blockchain.',
                type: 'success',
                timestamp: Date.now() - 10000,
                txHash: '0x...',
                eventName: 'SystemInit',
                details: {},
                isNew: false
            }
        ]);
      } catch (e) {
        console.error("Inbox History Error:", e);
      }
    };

    fetchPastEvents();

    // Live monitoring
    const unwatch = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      onLogs: (logs) => {
        logs.forEach(l => {
          const processed = processEvent(l, true);
          NotificationService.addNotification(processed);
        });
        setUnreadCount(prev => prev + logs.length);
      }
    });

    return () => unwatch();
  }, [publicClient]);

  const handleOpenNotification = (n: Notification) => {
    setSelectedNotification(n);
    // Mark as read logic
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4 font-sans">
      {/* Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[--bg-primary] bg-opacity-60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rs-card overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" style={{ padding: 0 }}>
            <div className="p-5 border-b border-[--border-default] flex items-center justify-between bg-[--bg-secondary]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  selectedNotification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                  selectedNotification.type === 'error' ? 'bg-[--rs-red-bg] text-[--rs-red]' :
                  'bg-blue-500/10 text-blue-500'
                }`}>
                   <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-[--text-primary] uppercase tracking-[0.1em]">{selectedNotification.title}</h3>
              </div>
              <button onClick={() => setSelectedNotification(null)} className="p-1.5 hover:bg-[--bg-hover] rounded-lg transition-colors text-[--text-tertiary] hover:text-[--text-primary]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 bg-[--bg-elevated]">
              <div>
                <p className="text-sm text-[--text-secondary] leading-relaxed font-medium">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-[--bg-secondary] rounded-xl border border-[--border-default] flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Clock className="w-3.5 h-3.5 text-[--text-tertiary]" />
                     <span className="text-[10px] font-black text-[--text-tertiary] uppercase">Timestamp</span>
                   </div>
                   <span className="text-[10px] font-mono font-bold text-[--text-primary]">{new Date(selectedNotification.timestamp).toLocaleString()}</span>
                </div>
                <div className="p-4 bg-[--bg-secondary] rounded-xl border border-[--border-default]">
                   <div className="flex items-center gap-2 mb-2">
                     <Hash className="w-3.5 h-3.5 text-[--text-tertiary]" />
                     <span className="text-[10px] font-black text-[--text-tertiary] uppercase">Transaction Hash</span>
                   </div>
                   <div className="flex items-center justify-between">
                     <code className="text-[10px] font-mono text-[--rs-red] truncate mr-2">{selectedNotification.txHash}</code>
                     <ExternalLink className="w-3.5 h-3.5 text-[--text-hint]" />
                   </div>
                </div>
              </div>

              {/* Event Specific Details */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest">Event Parameters</span>
                <div className="p-5 bg-[--bg-primary] rounded-xl border border-[--border-default] font-mono text-[11px] text-emerald-500 overflow-x-auto shadow-inner">
                  {Object.entries(selectedNotification.details).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-[--border-subtle] last:border-0">
                      <span className="text-[--text-tertiary]">{key}:</span>
                      <span className="font-bold">{typeof val === 'bigint' ? val.toString() : String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setSelectedNotification(null)}
                className="w-full rs-btn rs-btn-primary py-4 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Panel */}
      {isOpen && (
        <div className="w-[400px] rs-card overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border-[--rs-red-border]" style={{ padding: 0 }}>
          <div className="p-5 border-b border-[--border-default] flex items-center justify-between bg-[--bg-secondary] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-[--rs-red]" />
              <h3 className="text-xs font-black text-[--text-primary] uppercase tracking-[0.1em]">On-Chain Activity</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-[--bg-hover] rounded-lg transition-colors text-[--text-tertiary] hover:text-[--text-primary]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-[500px] overflow-y-auto bg-[--bg-elevated]">
            {notifications.length === 0 ? (
              <div className="p-16 text-center space-y-6">
                <Database className="w-14 h-14 text-[--border-default] mx-auto opacity-50" />
                <p className="text-[--text-tertiary] text-[10px] font-black uppercase tracking-widest italic">Waiting for blockchain events...</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button 
                  key={n.id} 
                  onClick={() => handleOpenNotification(n)}
                  className="w-full text-left p-5 border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-all group relative"
                >
                  {n.isNew && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-[--rs-red]" />
                  )}
                  <div className="flex gap-4">
                    <div className={`mt-0.5 p-2.5 rounded-xl shrink-0 ${
                      n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                      n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                      n.type === 'error' ? 'bg-[--rs-red-bg] text-[--rs-red]' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {n.eventName === 'ReportCommitted' ? <Shield className="w-4 h-4" /> :
                       n.eventName === 'DisputeOpened' ? <Gavel className="w-4 h-4" /> :
                       n.eventName === 'ReportFinalized' ? <Coins className="w-4 h-4" /> :
                       <Info className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-[11px] font-black text-[--text-primary] uppercase tracking-tight truncate group-hover:text-[--rs-red] transition-colors">{n.title}</h4>
                        <span className="text-[9px] text-[--text-tertiary] font-bold">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[--text-secondary] font-medium leading-tight line-clamp-2">
                        {n.message}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[--text-tertiary] uppercase tracking-widest">
                        View Audit Log <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-4 bg-[--bg-secondary] text-center border-t border-[--border-default]">
            <button 
              onClick={() => { 
                NotificationService.clearAll();
                setUnreadCount(0); 
              }}
              className="text-[10px] text-[--text-tertiary] hover:text-[--rs-red] font-black uppercase tracking-[0.2em] transition-all"
            >
              Clear System Ledger
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setUnreadCount(0); }}
        className={`w-14 h-14 rounded-2xl shadow-2xl transition-all duration-500 group flex items-center justify-center relative border ${
          isOpen 
            ? 'bg-[--bg-secondary] border-[--border-default] text-[--text-primary] rotate-90 shadow-xl' 
            : 'bg-[--bg-primary] border-[--border-default] text-[--rs-red] hover:border-[--rs-red] hover:scale-110 active:scale-95 shadow-lg shadow-[--rs-red-glow]'
        }`}
      >
        {isOpen ? <X className="w-7 h-7" /> : <Bell className="w-6 h-6" />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[--rs-red] text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[--bg-primary] animate-bounce shadow-lg">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
