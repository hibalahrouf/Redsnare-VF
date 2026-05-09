'use client'

import React, { useEffect, useState } from 'react';
import { useAccount, useSwitchChain, useReadContract } from 'wagmi';
import { ShieldAlert, Lock, Loader2 } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isMounted, setIsMounted] = useState(false);

  // Fetch Protocol Treasury (Admin) from Blockchain
  const { data: platformAdmin, isLoading: isAdminLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'treasury'
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // 1. Connection Check
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in">
        <div className="bg-[--bg-secondary] border border-[--border-default] rounded-3xl p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[--rs-red] to-[--color-special]" />
          <div className="w-16 h-16 bg-[--rs-red-bg] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-[--rs-red]" />
          </div>
          <h2 className="text-2xl font-black text-[--text-primary] mb-3 uppercase tracking-tight">Identity Required</h2>
          <p className="text-sm text-[--text-secondary] mb-8 leading-relaxed font-medium">
            This sector is restricted to protocol operators. Please connect your administrative wallet to continue.
          </p>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  // 2. Network Check (Anvil Local)
  if (chainId !== 31337) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-[--bg-secondary] border border-[--border-default] rounded-3xl p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-[--text-primary] mb-3 uppercase tracking-tight">Wrong Network</h2>
          <p className="text-sm text-[--text-secondary] mb-8 leading-relaxed">
            Protocol governance is currently limited to the Local Anvil environment (Chain ID: 31337).
          </p>
          <button
            onClick={() => switchChain({ chainId: 31337 })}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-900/20"
          >
            Switch to Anvil
          </button>
        </div>
      </div>
    );
  }

  // 3. Admin Loading State
  if (isAdminLoading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-[0.2em]">Verifying Credentials...</span>
       </div>
    );
  }

  // 4. THE CRITICAL CHECK: Is the current user the Admin?
  const ANVIL_ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const isOwner = (platformAdmin?.toLowerCase() === address?.toLowerCase()) || 
                  (address?.toLowerCase() === ANVIL_ADMIN.toLowerCase());
  
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-[--bg-secondary] border border-[--border-default] rounded-3xl p-10 max-w-md w-full text-center shadow-2xl relative">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-[--text-primary] mb-3 uppercase tracking-tight">Access Denied</h2>
          <p className="text-sm text-[--text-secondary] mb-8 leading-relaxed">
            Your address <span className="text-[--rs-red] font-mono font-bold">{address?.slice(0,6)}...{address?.slice(-4)}</span> is not authorized to access this command center.
          </p>
          <Link href="/" className="inline-block px-8 py-3 bg-[--bg-elevated] hover:bg-[--bg-hover] text-[--text-primary] border border-[--border-default] rounded-xl font-bold transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

import Link from 'next/link';
