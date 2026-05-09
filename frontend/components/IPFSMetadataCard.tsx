'use client'

import React from 'react';
import { Database, ShieldCheck, Lock, ExternalLink, Copy, Check } from 'lucide-react';

export default function IPFSMetadataCard({ cid }: { cid?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!cid) return;
    navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCid = cid || 'QmPZ9gc...8vzL'; // Fallback for demo

  return (
    <div className="glass-card p-6 border-white/5 bg-[#111111]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">IPFS Security Context</h3>
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">
          <ShieldCheck className="w-3 h-3" /> VERIFIED
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Content Identifier (CID)</label>
          <div className="flex items-center gap-2 bg-[#0D0D0D] border border-[#222222] p-2 rounded-lg">
            <code className="text-xs text-gray-400 font-mono truncate flex-1">{displayCid}</code>
            <button 
              onClick={handleCopy}
              className="p-1 hover:bg-[#222222] rounded transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            </button>
            <a 
              href={`https://ipfs.io/ipfs/${displayCid}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1 hover:bg-[#222222] rounded transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-[#0D0D0D] rounded-xl border border-[#222222]">
            <div className="flex items-center gap-1.5 mb-1">
              <Lock className="w-3 h-3 text-brand-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Encryption</span>
            </div>
            <p className="text-xs text-white font-mono">AES-256-GCM</p>
          </div>
          <div className="p-3 bg-[#0D0D0D] rounded-xl border border-[#222222]">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="w-3 h-3 text-brand-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Storage</span>
            </div>
            <p className="text-xs text-white">Immutable PIN</p>
          </div>
        </div>

        <div className="mt-2 flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
          <Lock className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-200/70 leading-relaxed">
            Raw payload is encrypted before pinning. Only committee members with valid ephemeral keys can decrypt the PoC steps.
          </p>
        </div>
      </div>
    </div>
  );
}
