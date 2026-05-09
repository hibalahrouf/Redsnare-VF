'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WalletConnect } from './WalletConnect';
import { useTheme } from './ThemeProvider';
import { Shield, Sun, Moon, Menu, X, Target, Bell } from 'lucide-react';
import { useAccount, useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { RedSnareLogo } from './RedSnareLogo';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { address, isConnected } = useAccount();

  // 1. Protocol Metadata
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
    query: { staleTime: 1000 * 5 }
  });

  const { data: bountyData } = useReadContracts({
    contracts: Array.from({ length: Math.min(Number(bountyCount || 0), 100) }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'getBountyCore',
      args: [BigInt(i)]
    })),
    query: { enabled: Number(bountyCount || 0) > 0 }
  });

  const { data: committeeStatus } = useReadContracts({
    contracts: Array.from({ length: Number(bountyCount || 0) }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'isCommitteeMember',
      args: [BigInt(i), address || '0x0000000000000000000000000000000000000000']
    })),
    query: { enabled: !!address }
  });

  const isCommittee = committeeStatus?.some(res => res.status === 'success' && res.result === true) || false;

  const [roles, setRoles] = useState<string[]>([]);
  const publicClient = usePublicClient();
  
  // 3. Fetch Reports (to check if Researcher)
  const { data: allReportsData } = useReadContracts({
    contracts: Array.from({ length: Number(bountyCount || 0) }).map((_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'reportCount',
      args: [BigInt(i)]
    })),
    query: { enabled: !!address && Number(bountyCount || 0) > 0 }
  });

  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'owner',
  });

  useEffect(() => {
    if (!address || !publicClient) {
      setRoles([]);
      return;
    }
    const checkActivity = async () => {
      const activeRoles: string[] = [];
      const ANVIL_ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      
      // 1. Check Admin (Owner)
      if ((ownerAddress && ownerAddress.toLowerCase() === address.toLowerCase()) || 
           address.toLowerCase() === ANVIL_ADMIN.toLowerCase()) {
        activeRoles.push('Admin');
      }

      // 2. Check Org
      const ownsAny = bountyData?.some(res =>
        res.status === 'success' && (res.result as any[])[0].toLowerCase() === address.toLowerCase()
      );
      if (ownsAny) activeRoles.push('Organization');
      
      // 3. Check Committee
      if (isCommittee) activeRoles.push('Committee');
      
      // 4. Check Researcher - Ultra-fast check using activeReports
      try {
        const bCount = Number(bountyCount || 0);
        if (bCount > 0) {
          const activeChecks = await Promise.all(
            Array.from({ length: bCount }).map((_, i) => 
              publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: BUG_BOUNTY_PLATFORM_ABI,
                functionName: 'activeReports',
                args: [BigInt(i), address]
              }) as Promise<bigint>
            )
          );
          
          if (activeChecks.some(count => count > 0n)) {
            activeRoles.push('Researcher');
          }
        }
      } catch (e) { console.error("Error checking researcher role:", e); }
      
      // Fallback if not active but has history
      if (!activeRoles.includes('Researcher')) {
        if (pathname.includes('/submit/my-reports')) {
          activeRoles.push('Researcher');
        }
        const localReports = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('rs-cid-index') || '{}') : {};
        if (Object.keys(localReports).length > 0) {
          activeRoles.push('Researcher');
        }
      }
      
      // Fallback to Visitor if NO other roles
      if (activeRoles.length === 0 && address) {
        activeRoles.push('Visitor');
      }
      
      setRoles(activeRoles);

      // Auto-redirect Admin to Supervision Console if they are on a non-admin page
      if (activeRoles.includes('Admin') && pathname === '/') {
        router.push('/dashboard?tab=admin');
      }
    };
    checkActivity();
  }, [address, publicClient, bountyData, isCommittee, isConnected, allReportsData, bountyCount, pathname, ownerAddress, router]);

  const isAdmin = roles.includes('Admin');

  const navLinks = isAdmin ? [
    { id: 'nav-admin-global', href: '/dashboard?tab=admin', label: 'Supervision Console', visible: true },
    { id: 'nav-create',       href: '/admin/create',       label: 'Launch Program',      visible: true },
    { href: '/faucet',        label: 'Asset Faucet',        visible: true },
  ] : [
    { id: 'nav-explorer', href: '/', label: 'Explorer', visible: true },
    { id: 'nav-docs',     href: '/how-it-works', label: 'Docs', visible: true },
    { id: 'nav-submit',   href: '/submit', label: 'Submit Report', visible: true },
    { 
      href: '/submit/my-reports', 
      label: 'My Submissions', 
      visible: roles.includes('Researcher') 
    },
    { 
      href: '/dashboard', 
      label: 'Command Center', 
      visible: roles.includes('Organization') 
    },
    { id: 'nav-create',   href: '/admin/create', label: 'Create Program', visible: isConnected },
    { href: '/committee', label: 'Committee',      visible: roles.includes('Committee') },
    { href: '/faucet',    label: 'Faucet',         visible: true },
  ];

  const visibleLinks = navLinks.filter(l => l.visible);

  return (
    <nav className="rs-navbar fixed top-0 left-0 right-0 z-50 h-16 flex items-center">
      <div className="w-full max-w-[1400px] mx-auto px-6 flex items-center justify-between gap-6">

        {/* ── Logo & Roles ── */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 flex items-center justify-center">
              <RedSnareLogo className="w-full h-full text-[--rs-red]" />
            </div>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 16, letterSpacing: '0.05em' }}>
              <span style={{ color: 'var(--rs-red)' }}>RED</span>
              <span style={{ color: 'var(--text-primary)' }}>SNARE</span>
            </span>
          </Link>

          {/* Role Badges */}
          <div className="hidden lg:flex items-center gap-2">
            {roles.map(role => (
              <span 
                key={role}
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                  role === 'Admin' ? 'bg-[--rs-red-bg] text-[--rs-red] border-[--rs-red-border] shadow-[0_0_15px_rgba(232,40,30,0.1)]' :
                  role === 'Organization' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  role === 'Committee' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  role === 'Visitor' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                  'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* ── Nav Links (Desktop) ── */}
        <div className="hidden lg:flex items-center justify-center gap-1 flex-1 px-4">
          {visibleLinks.map((link) => {
            const isActive = pathname === link.href;
            const shortLabel = link.label === 'Submit Report' ? 'Submit' : 
                               link.label === 'Create Program' ? 'Create' :
                               link.label === 'My Submissions' ? 'Submissions' :
                               link.label === 'My Bounties' ? 'Bounties' : link.label;
            return (
              <Link key={link.href} href={link.href} id={link.id}
                className={`relative flex items-center gap-2 px-3 py-2 text-[13px] font-black uppercase tracking-tight transition-all duration-150 whitespace-nowrap ${isActive ? 'active' : ''}`}
                style={{ color: isActive ? 'var(--rs-red)' : 'var(--text-secondary)' }}
              >
                <span>{shortLabel}</span>
                {isActive && (
                  <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full" style={{ background: 'var(--rs-red)' }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Right Section ── */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggle}
            className="p-2 rounded-lg text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <WalletConnect />

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-[--text-secondary]">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 md:hidden animate-fade-up rs-navbar p-4 border-b">
          {visibleLinks.map(link => (
            <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-lg mb-1"
              style={{
                fontSize: 13, fontWeight: 700,
                color: pathname === link.href ? 'var(--rs-red)' : 'var(--text-secondary)',
                background: pathname === link.href ? 'var(--rs-red-bg)' : 'transparent',
              }}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
