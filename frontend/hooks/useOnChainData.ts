'use client';
import { useReadContract, useReadContracts } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, DISPUTE_MODULE_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

export enum ReportStatus {
  Submitted = 0,
  Accepted = 1,
  Rejected = 2,
  Disputed = 3,
  Finalized = 4,
}

export enum DisputePhase {
  None = 0,
  Commit = 1,
  Reveal = 2,
  Resolved = 3,
}

interface ReportData {
  bountyId: number;
  reportId: number;
  researcher: string;
  submittedAt: number;
  paid: boolean;
  status: ReportStatus;
  acceptVotes: number;
  rejectVotes: number;
  stakeAmount: bigint;
}

interface DisputeData {
  bountyId: number;
  reportId: number;
  phase: DisputePhase;
  commitDeadline: number;
  revealDeadline: number;
  acceptVotes: number;
  rejectVotes: number;
  autoEscalated: boolean;
}

/**
 * Fetch all bounties with their core data and state
 */
export function useBounties() {
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
  });

  const bountyCountNum = Number(bountyCount || 0);

  const bountyCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyCore',
    args: [BigInt(i)],
  }));

  const stateCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyState',
    args: [BigInt(i)],
  }));

  const { data: bountiesData } = useReadContracts({
    contracts: bountyCalls,
    query: { refetchInterval: 10000 },
  });

  const { data: statesData } = useReadContracts({
    contracts: stateCalls,
    query: { refetchInterval: 10000 },
  });

  const bounties = Array.from({ length: bountyCountNum }).map((_, i) => {
    const bounty = bountiesData?.[i]?.status === 'success' ? (bountiesData[i].result as any) : null;
    const state = statesData?.[i]?.status === 'success' ? (statesData[i].result as any) : null;

    if (!bounty || !state) return null;

    return {
      id: i,
      owner: bounty[0] as string,
      token: bounty[1] as string,
      rewardAmount: bounty[2] as bigint,
      stakeAmount: bounty[3] as bigint,
      appealBond: bounty[4] as bigint,
      submissionDeadline: Number(bounty[5]),
      reviewSLA: Number(bounty[6]),
      rateLimitWindow: Number(bounty[7]),
      stakeEscalationBps: Number(bounty[8]),
      maxInWindow: Number(bounty[9]),
      maxActiveSubmissions: Number(state[0]),
      committeeSize: Number(state[1]),
      thresholdK: Number(state[2]),
      disputeCommitSeconds: Number(state[3]),
      disputeRevealSeconds: Number(state[4]),
      active: state[5] as boolean,
      escrowBalance: state[6] as bigint,
    };
  }).filter(Boolean);

  return { bounties, isLoading: !bountiesData || !statesData };
}

/**
 * Fetch all reports across all bounties
 */
export function useAllReports() {
  const { bounties } = useBounties();

  const allReportCalls: { address: `0x${string}`; abi: any; functionName: string; args: [bigint, bigint] }[] = [];
  const reportMap: { bountyId: number; reportId: number }[] = [];

  bounties?.forEach(bounty => {
    // Fetch report count for each bounty
    const reportCountCall = {
      address: CONTRACT_ADDRESS,
      abi: BUG_BOUNTY_PLATFORM_ABI,
      functionName: 'reportCount',
      args: [BigInt(bounty.id)],
    };
  });

  // For now, return empty - will be populated on-demand
  return { reports: [] as ReportData[], isLoading: false };
}

/**
 * Fetch reports for a specific bounty
 */
export function useBountyReports(bountyId: number) {
  const { data: reportCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'reportCount',
    args: [BigInt(bountyId)],
  });

  const reportCountNum = Number(reportCount || 0);

  const reportCalls = Array.from({ length: reportCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'reports',
    args: [BigInt(bountyId), BigInt(i)],
  }));

  const { data: reportsData } = useReadContracts({
    contracts: reportCalls,
    query: { refetchInterval: 10000 },
  });

  const reports = Array.from({ length: reportCountNum }).map((_, i) => {
    const report = reportsData?.[i]?.status === 'success' ? (reportsData[i].result as any) : null;
    if (!report) return null;

    return {
      bountyId,
      reportId: i,
      researcher: report[0] as string,
      submittedAt: Number(report[1]),
      paid: report[2] as boolean,
      status: Number(report[3]) as ReportStatus,
      acceptVotes: Number(report[4]),
      rejectVotes: Number(report[5]),
      stakeAmount: report[10] as bigint,
    } as ReportData;
  }).filter(Boolean);

  return { reports, isLoading: !reportsData };
}

/**
 * Fetch dispute data for a specific report
 */
export function useDispute(reportId: number) {
  const { data: disputeModule } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'disputeModule',
  });

  const { data: disputeData } = useReadContract({
    address: disputeModule as `0x${string}`,
    abi: DISPUTE_MODULE_ABI,
    functionName: 'disputes',
    args: [BigInt(reportId)],
  });

  if (!disputeData) return { dispute: null, isLoading: true };

  const dispute = disputeData as any;
  return {
    dispute: {
      phase: Number(dispute[0]) as DisputePhase,
      commitDeadline: Number(dispute[1]),
      revealDeadline: Number(dispute[2]),
      acceptVotes: Number(dispute[3]),
      rejectVotes: Number(dispute[4]),
    } as Omit<DisputeData, 'bountyId' | 'reportId' | 'autoEscalated'>,
    isLoading: false,
  };
}

/**
 * Dashboard stats - aggregate platform data
 */
export function useDashboardStats() {
  const { bounties } = useBounties();

  // Calculate total rewards locked
  const totalRewardsLocked = bounties?.reduce((acc, b) => acc + (b.rewardAmount || 0n), 0n) || 0n;

  // Calculate total escrow balance
  const totalEscrowBalance = bounties?.reduce((acc, b) => acc + (b.escrowBalance || 0n), 0n) || 0n;

  // Count active bounties
  const activeBounties = bounties?.filter(b => b.active).length || 0;

  // Count reports by status (requires fetching all reports)
  const stats = {
    totalBounties: bounties?.length || 0,
    activeBounties,
    totalRewardsLocked,
    totalEscrowBalance,
    totalReports: 0, // Will be populated on-demand
    pendingReports: 0,
    disputedReports: 0,
    resolvedDisputes: 0,
  };

  return { stats, bounties, isLoading: !bounties };
}

/**
 * Check if current user is committee member for a bounty
 */
export function useIsCommitteeMember(bountyId: number, userAddress?: string) {
  const { data: isMember } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'isCommitteeMember',
    args: [BigInt(bountyId), userAddress as `0x${string}`],
    enabled: !!userAddress,
  });

  return { isMember: isMember || false, isLoading: isMember === undefined };
}
