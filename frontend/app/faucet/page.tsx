'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract, useChainId, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import { CONTRACT_ADDRESS } from '@/services/contracts';
import { Droplet, CheckCircle, AlertCircle, ExternalLink, Coins, Shield, Wallet } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';

const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export default function FaucetPage() {
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [ethStatus, setEthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [usdcStatus, setUsdcStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isOnWrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  const getEthFromFaucet = async () => {
    window.open('https://www.alchemy.com/faucets/arbitrum-sepolia', '_blank');
    setMessage('Opened Alchemy faucet - claim ETH there for Sepolia. On Anvil, you already have 10k ETH.');
    setEthStatus('success');
  };

  const getUsdcFromFaucet = async () => {
    if (!address) return;
    setUsdcStatus('loading');
    setMessage('Minting 10,000 MockUSDC locally...');

    try {
      // Direct call to MockUSDC mint function (only works on Anvil/Testnet if owner or if mint is public)
      // Since the deployer is likely the user, this should work.
      const hash = await writeContractAsync({
        address: USDC_ADDRESS as `0x${string}`,
        abi: [
          {"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"}
        ],
        functionName: 'mint',
        args: [address, BigInt(10000 * 10**6)], // 10k USDC
      });

      setMessage(`Local mint successful! TX: ${hash.slice(0, 10)}...`);
      setUsdcStatus('success');
    } catch (error: any) {
      console.error(error);
      setMessage(`Minting failed: ${error.shortMessage || error.message}`);
      setUsdcStatus('error');
    }
  };

  if (!isConnected) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[--rs-red-bg] mb-4">
            <Droplet className="w-8 h-8 text-[--rs-red]" />
          </div>
          <h1 className="text-3xl font-black text-[--text-primary]">Test Token Faucet</h1>
          <p className="mt-2 text-[--text-secondary]">Get free testnet tokens for Anvil Local</p>
        </div>
        <div className="rs-card p-8 mt-8 flex flex-col items-center text-center">
          <Wallet className="w-12 h-12 text-[--text-tertiary] mb-4" />
          <p className="text-[--text-secondary] mb-6 font-bold">Please connect your wallet to claim test tokens</p>
          <WalletConnect inline />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-[--rs-red-bg] mb-4">
          <Droplet className="w-8 h-8 text-[--rs-red]" />
        </div>
        <h1 className="text-3xl font-black text-[--text-primary]">Test Token Faucet</h1>
        <p className="mt-2 text-[--text-secondary]">Get free testnet tokens for Anvil Local</p>
      </div>

      {/* Network Warning */}
      {isOnWrongNetwork && (
        <div className="rs-card p-6 mb-6 border-[--color-warning] border-opacity-20 bg-[--color-warning] bg-opacity-[0.05]">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[--color-warning] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-[--text-primary]">Wrong Network</p>
              <p className="text-sm text-[--text-secondary] mt-1">
                Switch to <strong>Anvil Local</strong> to claim tokens. Current chain ID: {chainId}
              </p>
              <button
                onClick={() => switchChain({ chainId: EXPECTED_CHAIN_ID })}
                className="mt-4 px-6 py-2 bg-[--color-warning] hover:filter hover:brightness-110 text-white rounded-lg text-sm font-bold transition-all"
              >
                Switch Network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div className={`rs-card p-4 mb-6 flex items-center gap-3 ${
          ethStatus === 'error' || usdcStatus === 'error'
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          {ethStatus === 'error' || usdcStatus === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          )}
          <p className={`text-sm font-bold ${ethStatus === 'error' || usdcStatus === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
            {message}
          </p>
        </div>
      )}

      {/* ETH Card */}
      <div className="rs-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Coins className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-[--text-primary]">Anvil Local ETH</h3>
              <p className="text-sm text-[--text-tertiary]">For gas fees</p>
            </div>
          </div>
          <button
            onClick={getEthFromFaucet}
            disabled={ethStatus === 'loading' || isOnWrongNetwork}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all"
          >
            {ethStatus === 'loading' ? 'Claiming...' : 'Claim ETH'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ExternalLink className="w-3 h-3" />
          <a href="https://www.alchemy.com/faucets/arbitrum-sepolia" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Alternative: Alchemy Faucet
          </a>
        </div>
      </div>

      {/* USDC Card */}
      <div className="rs-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-[--text-primary]">USDC</h3>
              <p className="text-sm text-[--text-tertiary]">For report stakes</p>
            </div>
          </div>
          <button
            onClick={getUsdcFromFaucet}
            disabled={usdcStatus === 'loading' || isOnWrongNetwork}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all"
          >
            {usdcStatus === 'loading' ? 'Claiming...' : 'Claim USDC'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ExternalLink className="w-3 h-3" />
          <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Alternative: Circle Faucet
          </a>
        </div>
      </div>

      {/* Info Box */}
      <div className="rs-card p-8 bg-[--rs-red-bg] bg-opacity-[0.03] border-[--rs-red-border] border-opacity-30">
        <h4 className="font-black text-[--rs-red] uppercase tracking-widest mb-4">About Test Tokens</h4>
        <ul className="space-y-3 text-sm text-[--text-secondary]">
          <li>• <strong className="text-[--text-primary]">ETH:</strong> Needed for transaction gas fees on Anvil Local</li>
          <li>• <strong className="text-[--text-primary]">USDC:</strong> Required as stake when submitting vulnerability reports</li>
          <li>• Faucets may have daily limits - check back tomorrow if you've reached the limit</li>
          <li>• Test tokens have no real value and cannot be converted to real tokens</li>
        </ul>
      </div>
    </div>
  );
}
