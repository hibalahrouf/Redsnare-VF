'use client'
import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, ArrowRight, Loader2, User, ChevronRight, ShieldCheck, Award, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface WalletConnectProps {
  inline?: boolean;
}

export function WalletConnect({ inline = false }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMounted, setIsMounted] = React.useState(false);
  const [showOptions, setShowOptions] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIsMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isMounted) {
    return (
      <button disabled className="btn-primary flex items-center gap-2 text-sm !px-4 !py-2 opacity-70">
        <Wallet className="w-4 h-4" />
        Loading...
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-4 pl-2 pr-5 py-2 rounded-2xl bg-gradient-to-r from-[--bg-secondary] to-[--bg-elevated] border border-[--border-default] hover:border-[--rs-red-border] hover:shadow-[0_0_20px_rgba(255,51,51,0.1)] transition-all group relative overflow-hidden"
        >
          {/* Active Glow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[--rs-red-bg] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
          
          <div className="relative w-11 h-11 rounded-xl bg-[--bg-primary] border border-[--border-subtle] flex items-center justify-center text-[--text-tertiary] group-hover:text-[--rs-red] group-hover:border-[--rs-red-border] transition-all shadow-inner">
            <User className="w-5 h-5" />
            {/* Live Indicator Dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[--bg-secondary] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
          </div>

          <div className="text-left hidden md:block relative z-10">
            <div className="flex items-center gap-2 mb-0.5">
               <div className="text-[8px] font-black text-[--text-tertiary] uppercase tracking-[0.2em]">Connected Identity</div>
               <div className="w-1 h-1 rounded-full bg-[--rs-red] animate-pulse" />
            </div>
            <div className="text-sm font-mono font-black text-[--text-primary] tracking-tight group-hover:text-white transition-colors">
              {address?.slice(0, 6)}<span className="text-[--text-tertiary] mx-0.5">...</span>{address?.slice(-4)}
            </div>
          </div>
          
          <div className={`p-1 rounded-lg bg-[--bg-primary]/50 border border-[--border-subtle] text-[--text-tertiary] transition-all ${showOptions ? 'rotate-180 text-[--rs-red]' : 'group-hover:text-[--text-primary]'}`}>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </button>

        {showOptions && (
          <div className="absolute top-full right-0 mt-3 w-80 rs-card overflow-hidden shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200" style={{ padding: 0 }}>
            <div className="p-5 border-b border-[--border-default] bg-[--bg-secondary]">
               <div className="text-[10px] font-black text-[--text-tertiary] uppercase tracking-widest mb-4">Protocol Identity</div>
               <div className="flex items-center gap-4 mb-2">
                 <div className="w-12 h-12 rounded-2xl bg-[--rs-red-bg] flex items-center justify-center text-[--rs-red]">
                    <ShieldCheck className="w-6 h-6" />
                 </div>
                 <div>
                   <div className="text-sm font-black text-[--text-primary] font-mono">{address}</div>
                   <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Network Verified</div>
                 </div>
               </div>
            </div>

            <div className="p-5 bg-[--bg-elevated] space-y-4">
              <Link href={`/profile/${address}`} onClick={() => setShowOptions(false)} className="flex items-center justify-between p-4 rounded-xl bg-[--bg-secondary] border border-[--border-default] hover:bg-[--bg-hover] transition-all group">
                 <div className="flex items-center gap-3">
                   <User className="w-4 h-4 text-[--rs-red]" />
                   <span className="text-xs font-black text-[--text-secondary] uppercase tracking-widest group-hover:text-[--text-primary]">Public Profile</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-[--text-tertiary]" />
              </Link>

              <Link href="/dashboard?tab=reputation" onClick={() => setShowOptions(false)} className="flex items-center justify-between p-4 rounded-xl bg-[--bg-secondary] border border-[--border-default] hover:bg-[--bg-hover] transition-all group">
                 <div className="flex items-center gap-3">
                   <Award className="w-4 h-4 text-amber-500" />
                   <span className="text-xs font-black text-[--text-secondary] uppercase tracking-widest group-hover:text-[--text-primary]">View XP & Status</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-[--text-tertiary]" />
              </Link>

              <button 
                onClick={() => { disconnect(); setShowOptions(false); }}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-[--rs-red-bg] border border-[--rs-red-border] text-[--rs-red] hover:bg-[--rs-red] hover:text-white transition-all text-xs font-black uppercase tracking-[0.2em]"
              >
                <LogOut className="w-4 h-4" /> Terminate Session
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (connectors.length === 0) {
    const hasEth = typeof window !== 'undefined' && !!(window as any).ethereum;
    if (hasEth) {
       return (
        <button 
          onClick={async () => {
            try {
              const eth = (window as any).ethereum;
              await eth.request({ method: 'eth_requestAccounts' });
              window.location.reload();
            } catch (err) {
              console.error(err);
            }
          }}
          className="rs-btn rs-btn-primary flex items-center gap-2 text-sm !px-5 !py-2.5 shadow-lg shadow-[--rs-red-glow]"
        >
          <Wallet className="w-4 h-4" />
          Connect MetaMask
        </button>
       );
    }
    return (
      <button 
        onClick={() => window.open('https://metamask.io/download/', '_blank')}
        className="btn-primary flex items-center gap-2 text-sm !px-4 !py-2 bg-orange-500 hover:bg-orange-600 border-none"
      >
        <Wallet className="w-4 h-4" />
        Install MetaMask
      </button>
    );
  }

  // Prefer specialized connectors over generic injected
  const uniqueConnectors = connectors.filter((c, i, self) => {
    const isDuplicate = self.findIndex(t => t.name === c.name) !== i;
    if (isDuplicate) return false;
    return true;
  });

  const hasInjected = typeof window !== 'undefined' && !!(window as any).ethereum;

  if (inline) {
    return (
      <div className="w-full max-w-sm space-y-3">
        {uniqueConnectors.map((connector) => (
          <button 
            key={connector.uid}
            onClick={async () => {
              console.log(`[WALLET] Attempting to connect to ${connector.name}...`);
              try {
                await connectAsync({ connector });
                console.log(`[WALLET] Successfully connected to ${connector.name}`);
              } catch (err: any) {
                console.error(`[WALLET] Connection failed for ${connector.name}:`, err);
              }
            }} 
            className="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-[#0D0D0D] border border-[#222222] hover:border-brand-500/50 hover:bg-[#111111] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#050505] border border-white/5 group-hover:border-brand-500/30 transition-colors">
                <Wallet className="w-5 h-5 text-brand-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white uppercase tracking-wider">
                  {isPending ? 'Connecting...' : connector.name}
                </div>
                <div className="text-[10px] text-gray-500 font-medium">
                  {isPending ? 'Check your wallet extension' : `Connect using ${connector.name} wallet`}
                </div>
              </div>
            </div>
            {isPending ? (
              <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
            )}
          </button>
        ))}
        {connectError && (
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-center animate-shake">
            <div className="text-[10px] text-red-500 font-bold uppercase mb-1">Connection Error</div>
            <div className="text-[10px] text-gray-500 leading-tight">{connectError.message}</div>
          </div>
        )}
        {uniqueConnectors.length === 0 && hasInjected && (
          <button 
            onClick={async () => {
              try {
                const eth = (window as any).ethereum;
                await eth.request({ method: 'eth_requestAccounts' });
                window.location.reload();
              } catch (err) {
                console.error(err);
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest mt-4"
          >
            Force Connect MetaMask (Direct)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setShowOptions(!showOptions)} 
        className="rs-btn rs-btn-primary flex items-center gap-2 text-sm !px-6 !py-2.5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[--rs-red-glow]"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>

      {showOptions && (
        <div className="absolute top-full right-0 mt-3 w-64 bg-[#0D0D0D]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">
            Select Provider
          </div>
          <div className="space-y-1">
            {uniqueConnectors.map((connector) => (
              <button 
                key={connector.uid}
                onClick={async () => {
                  console.log(`[WALLET] Attempting to connect to ${connector.name} (dropdown)...`);
                  setShowOptions(false);
                  try {
                    await connectAsync({ connector });
                  } catch (err) {
                    console.error(`[WALLET] Connection failed:`, err);
                  }
                }} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-medium text-gray-300 hover:text-white transition-colors text-left group"
              >
                <div className="p-2 rounded-lg bg-[#050505] border border-white/5 group-hover:border-brand-500/50 transition-colors">
                  <Wallet className="w-4 h-4 text-brand-400" />
                </div>
                {connector.name}
              </button>
            ))}
            
            {uniqueConnectors.length === 0 && hasInjected && (
              <button 
                onClick={async () => {
                  try {
                    const eth = (window as any).ethereum;
                    await eth.request({ method: 'eth_requestAccounts' });
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                  }
                }} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-medium text-gray-300 hover:text-white transition-colors text-left group"
              >
                <div className="p-2 rounded-lg bg-[#050505] border border-white/5 group-hover:border-brand-500/50 transition-colors">
                  <Wallet className="w-4 h-4 text-orange-400" />
                </div>
                MetaMask (Direct)
              </button>
            )}
          </div>

          {connectError && (
            <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="text-[10px] text-red-500 font-bold uppercase mb-1">Error</div>
              <div className="text-[9px] text-gray-400 leading-tight">
                {connectError.message}
              </div>
            </div>
          )}
          
          <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[8px] text-gray-500 text-center uppercase tracking-tighter">
              By connecting, you agree to the protocol terms
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
