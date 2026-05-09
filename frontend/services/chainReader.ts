import { ethers } from 'ethers';
import { 
  BUG_BOUNTY_PLATFORM_ABI, 
  DISPUTE_MODULE_ABI, 
  REPUTATION_ABI, 
  ESCROW_ABI,
  CONTRACT_ADDRESS, 
  REPUTATION_ADDRESS,
  ESCROW_ADDRESS
} from './contracts';

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
  researcher: string;
  submittedAt: bigint;
  paid: boolean;
  status: ReportStatus;
  acceptVotes: number;
  rejectVotes: number;
  commitHash: string;
  cidDigest: string;
  hSteps: string;
  hImpact: string;
  hPoc: string;
  stakeAmount: bigint;
}

interface DisputeData {
  phase: DisputePhase;
  commitDeadline: bigint;
  revealDeadline: bigint;
  acceptVotes: number;
  rejectVotes: number;
}

interface BountyCore {
  owner: string;
  token: string;
  rewardAmount: bigint;
  stakeAmount: bigint;
  appealBond: bigint;
  submissionDeadline: bigint;
  reviewSLA: number;
  rateLimitWindow: number;
  stakeEscalationBps: number;
  maxInWindow: number;
}

interface BountyState {
  maxActiveSubmissions: number;
  committeeSize: number;
  thresholdK: number;
  disputeCommitSeconds: number;
  disputeRevealSeconds: number;
  active: boolean;
  escrowBalance: bigint;
}

export interface ReputationData {
  acceptedReports: number;
  rejectedReports: number;
  disputesWon: number;
  disputesLost: number;
  score: number;
}

export interface ResearcherEarnings {
  totalPaid: bigint;
  totalPending: bigint;
  totalSlashed: bigint;
  lockedStake: bigint;
  reportCount: number;
}

let provider: ethers.Provider | null = null;
let contract: ethers.Contract | null = null;
let disputeModuleContract: ethers.Contract | null = null;

function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

function getContract() {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('CONTRACT_ADDRESS is not configured in .env');
  }
  if (!contract) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, getProvider());
  }
  return contract;
}

export async function checkContractBytecode(address: string, name: string): Promise<boolean> {
  return await verifyBytecode(address, name);
}

async function verifyBytecode(address: string, name: string): Promise<boolean> {
  try {
    const code = await getProvider().getCode(address);
    if (code === '0x' || code === '0x0') {
      console.error(`[CHAIN] Bytecode missing for ${name} at ${address}. Contract not deployed on this network.`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[CHAIN] Error checking bytecode for ${name}:`, e);
    return false;
  }
}

async function getDisputeModuleContract() {
  if (!disputeModuleContract) {
    const platformContract = getContract();
    const disputeModuleAddress = await platformContract.disputeModule();
    disputeModuleContract = new ethers.Contract(disputeModuleAddress, DISPUTE_MODULE_ABI, getProvider());
  }
  return disputeModuleContract;
}

export async function getBountyCount(): Promise<number> {
  const provider = getProvider();
  const chainId = (await provider.getNetwork()).chainId.toString();
  
  try {
    const isDeployed = await verifyBytecode(CONTRACT_ADDRESS, "Main Contract");
    if (!isDeployed) {
      console.warn(`[CHAIN] Contract NOT deployed at ${CONTRACT_ADDRESS} on chain ${chainId}. Skipping calls.`);
      return 0;
    }

    const c = getContract();
    const count = await c.bountyCount();
    console.log(`[CHAIN] bountyCount(): ${count} (Chain: ${chainId}, Addr: ${CONTRACT_ADDRESS})`);
    return Number(count);
  } catch (e: any) {
    console.error(`[CHAIN] bountyCount() FAILED:`, { error: e.message, address: CONTRACT_ADDRESS, chainId });
    return 0;
  }
}

export async function getBountyCore(bountyId: number): Promise<BountyCore | null> {
  try {
    const isDeployed = await verifyBytecode(CONTRACT_ADDRESS, "Main Contract");
    if (!isDeployed) return null;

    const c = getContract();
    console.log(`[CHAIN] Calling getBountyCore(${bountyId})...`);
    const result = await c.getBountyCore(bountyId);
    
    return {
      owner: result[0],
      token: result[1],
      rewardAmount: result[2],
      stakeAmount: result[3],
      appealBond: result[4],
      submissionDeadline: result[5],
      reviewSLA: Number(result[6]),
      rateLimitWindow: Number(result[7]),
      stakeEscalationBps: Number(result[8]),
      maxInWindow: Number(result[9]),
    };
  } catch (e: any) {
    console.warn(`[CHAIN] getBountyCore(${bountyId}) reverted:`, e.shortMessage || e.message);
    return null;
  }
}

export async function getBountyState(bountyId: number): Promise<BountyState | null> {
  try {
    const c = getContract();
    const result = await c.getBountyState(bountyId);
    return {
      maxActiveSubmissions: Number(result[0]),
      committeeSize: Number(result[1]),
      thresholdK: Number(result[2]),
      disputeCommitSeconds: Number(result[3]),
      disputeRevealSeconds: Number(result[4]),
      active: result[5],
      escrowBalance: result[6],
    };
  } catch (e) {
    return null;
  }
}

export async function getReport(bountyId: number, reportId: number): Promise<ReportData | null> {
  try {
    const isDeployed = await verifyBytecode(CONTRACT_ADDRESS, "Main Contract");
    if (!isDeployed) return null;

    // Safety: Verify reportId < reportCount before calling reports()
    const count = await getReportCount(bountyId);
    if (reportId >= count) {
      console.warn(`[CHAIN] getReport safety triggered: ID ${reportId} >= count ${count} for bounty ${bountyId}`);
      return null;
    }

    const c = getContract();
    console.log(`[CHAIN] Calling reports(${bountyId}, ${reportId})...`);
    const result = await c.reports(bountyId, reportId);
    
    return {
      researcher: result[0],
      submittedAt: result[1],
      paid: result[2],
      status: Number(result[3]),
      acceptVotes: Number(result[4]),
      rejectVotes: Number(result[5]),
      commitHash: result[6],
      cidDigest: result[7],
      hSteps: result[8],
      hImpact: result[9],
      hPoc: result[10],
      stakeAmount: result[11],
    };
  } catch (e: any) {
    console.warn(`[CHAIN] getReport(${bountyId}, ${reportId}) reverted:`, e.shortMessage || e.message);
    return null;
  }
}

export async function getReportCount(bountyId: number): Promise<number> {
  try {
    const isDeployed = await verifyBytecode(CONTRACT_ADDRESS, "Main Contract");
    if (!isDeployed) return 0;

    const c = getContract();
    const count = await c.reportCount(bountyId);
    console.log(`[CHAIN] reportCount(${bountyId}): ${count}`);
    return Number(count);
  } catch (e: any) {
    console.warn(`[CHAIN] reportCount(${bountyId}) reverted:`, e.shortMessage || e.message);
    return 0;
  }
}

export async function getDispute(bountyId: number, reportId: number) {
  try {
    const dm = await getDisputeModuleContract();
    const key = await dm.getDisputeKey(bountyId, reportId);
    const result = await dm.disputes(key);
    return {
      bountyId: Number(result[0]),
      reportId: Number(result[1]),
      phase: Number(result[2]),
      commitDeadline: Number(result[3]),
      revealDeadline: Number(result[4]),
      acceptVotes: Number(result[5]),
      rejectVotes: Number(result[6]),
    };
  } catch (e) {
    return null;
  }
}

export async function isCommitteeMember(bountyId: number, address: string): Promise<boolean> {
  try {
    const normalized = ethers.getAddress(address);

    // Use minimal ABI to avoid frontend ABI mismatch.
    const committeeAbi = [
      "function isCommitteeMember(uint256 bountyId, address member) view returns (bool)"
    ];

    const c = new ethers.Contract(CONTRACT_ADDRESS, committeeAbi, getProvider());
    const result = await c.isCommitteeMember(bountyId, normalized);

    console.log('chainReader.isCommitteeMember result:', { bountyId, normalized, result });
    return Boolean(result);
  } catch (e) {
    console.error('chainReader.isCommitteeMember error:', { bountyId, address, e });
    return false;
  }
}

export async function hasVoted(bountyId: number, reportId: number, user: string): Promise<boolean> {
  try {
    const c = getContract();
    return await c.hasVoted(bountyId, reportId, user);
  } catch (e) {
    return false;
  }
}

export async function getCommitment(bountyId: number, reportId: number, user: string): Promise<string | null> {
  try {
    const dm = await getDisputeModuleContract();
    const key = await dm.getDisputeKey(bountyId, reportId);
    const result = await dm.commitments(key, user);
    return result === ethers.ZeroHash ? null : result;
  } catch (e) {
    return null;
  }
}

export async function getHasRevealed(bountyId: number, reportId: number, user: string): Promise<boolean> {
  try {
    const dm = await getDisputeModuleContract();
    const key = await dm.getDisputeKey(bountyId, reportId);
    return await dm.hasRevealed(key, user);
  } catch (e) {
    return false;
  }
}

/**
 * Fetch all reports across all bounties with optional status filter
 */
export async function getAllReports(statusFilter?: ReportStatus): Promise<{ bountyId: number; reportId: number; report: ReportData }[]> {
  const bountyCount = await getBountyCount();
  const allReports: { bountyId: number; reportId: number; report: ReportData }[] = [];

  for (let bountyId = 0; bountyId < bountyCount; bountyId++) {
    const reportCount = await getReportCount(bountyId);
    for (let reportId = 0; reportId < reportCount; reportId++) {
      const report = await getReport(bountyId, reportId);
      if (report) {
        if (statusFilter === undefined || report.status === statusFilter) {
          allReports.push({ bountyId, reportId, report });
        }
      }
    }
  }

  return allReports;
}

/**
 * Fetch all active disputes
 */
export async function getAllDisputes(): Promise<{ bountyId: number; reportId: number; report: ReportData; dispute: DisputeData }[]> {
  const pendingReports = await getAllReports(ReportStatus.Disputed);
  const disputes: { bountyId: number; reportId: number; report: ReportData; dispute: DisputeData }[] = [];

  for (const { bountyId, reportId, report } of pendingReports) {
    const dispute = await getDispute(bountyId, reportId);
    if (dispute) {
      disputes.push({ bountyId, reportId, report, dispute });
    }
  }

  return disputes;
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  const diff = now - ts;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Calculate time remaining until deadline
 */
export function getTimeRemaining(deadline: bigint | number): { expired: boolean; remaining: number; text: string } {
  const now = Math.floor(Date.now() / 1000);
  const dl = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const remaining = dl - now;

  if (remaining <= 0) {
    return { expired: true, remaining: 0, text: 'Expired' };
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return {
    expired: false,
    remaining,
    text: `${hours}h ${minutes}m ${seconds}s`,
  };
}

export async function getReputation(user: string): Promise<ReputationData | null> {
  try {
    const isDeployed = await verifyBytecode(REPUTATION_ADDRESS, "Reputation");
    if (!isDeployed) return null;

    const repContract = new ethers.Contract(REPUTATION_ADDRESS, REPUTATION_ABI, getProvider());
    const stats = await repContract.reputations(user);
    const score = await repContract.repScore(user);

    return {
      acceptedReports: Number(stats.acceptedReports),
      rejectedReports: Number(stats.rejectedReports),
      disputesWon: Number(stats.disputesWon),
      disputesLost: Number(stats.disputesLost),
      score: Number(score),
    };
  } catch (e) {
    console.error('Error fetching reputation:', e);
    return null;
  }
}

export async function getEscrowBalance(bountyId: number): Promise<bigint> {
  try {
    const isDeployed = await verifyBytecode(ESCROW_ADDRESS, "Escrow");
    if (!isDeployed) return 0n;

    const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, getProvider());
    return await escrowContract.balances(bountyId);
  } catch (e) {
    return 0n;
  }
}

export interface CommitteeStats {
  reportsReviewed: number;
  votesCast: number;
  pendingCommits: number;
  pendingReveals: number;
  disputesResolved: number;
  accuracyScore: number;
  reliabilityScore: number;
}

export async function getCommitteeStats(address: string): Promise<CommitteeStats> {
  const stats: CommitteeStats = {
    reportsReviewed: 0,
    votesCast: 0,
    pendingCommits: 0,
    pendingReveals: 0,
    disputesResolved: 0,
    accuracyScore: 100, // Base
    reliabilityScore: 100, // Base
  };

  try {
    const bountyCount = await getBountyCount();
    let missedReveals = 0;
    let totalExpectedReveals = 0;

    for (let bId = 0; bId < bountyCount; bId++) {
      const isMember = await isCommitteeMember(bId, address);
      if (!isMember) continue;

      const rCount = await getReportCount(bId);
      for (let rId = 0; rId < rCount; rId++) {
        const report = await getReport(bId, rId);
        if (!report) continue;

        // Count initial votes
        const voted = await hasVoted(bId, rId, address);
        if (voted) {
          stats.votesCast++;
          stats.reportsReviewed++;
        }

        // Count dispute participation
        const dispute = await getDispute(bId, rId);
        if (dispute && (dispute.acceptVotes + dispute.rejectVotes > 0)) {
          const commit = await getCommitment(bId, rId, address);
          const revealed = await getHasRevealed(bId, rId, address);

          if (commit) {
            totalExpectedReveals++;
            if (revealed) {
              stats.votesCast++;
              // If the dispute is resolved and we revealed, count it as a resolution
              if (dispute.phase === DisputePhase.Resolved) {
                stats.disputesResolved++;
              }
            } else if (dispute.phase === DisputePhase.Resolved || (dispute.revealDeadline > 0n && Number(dispute.revealDeadline) < Date.now() / 1000)) {
              missedReveals++;
            } else {
              stats.pendingReveals++;
            }
          } else if (dispute.phase === DisputePhase.Commit) {
            stats.pendingCommits++;
          }
        }
      }
    }

    if (totalExpectedReveals > 0) {
      stats.reliabilityScore = Math.round(((totalExpectedReveals - missedReveals) / totalExpectedReveals) * 100);
    }
    
    // Accuracy based on resolved disputes vs won/lost (simplified for demo)
    stats.accuracyScore = stats.disputesResolved > 0 ? 100 : 100; 
  } catch (e) {
    console.error('Error fetching committee stats:', e);
  }

  return stats;
}

export async function getResearcherEarnings(address: string): Promise<ResearcherEarnings> {
  const stats: ResearcherEarnings = {
    totalPaid: 0n,
    totalPending: 0n,
    totalSlashed: 0n,
    lockedStake: 0n,
    reportCount: 0
  };

  try {
    const count = await getBountyCount();
    const connected = address.toLowerCase();

    for (let bountyId = 0; bountyId < count; bountyId++) {
      const bountyCore = await getBountyCore(bountyId);
      if (!bountyCore) continue;
      
      const rCount = await getReportCount(bountyId);

      for (let reportId = 0; reportId < rCount; reportId++) {
        const report = await getReport(bountyId, reportId);
        if (!report || report.researcher.toLowerCase() !== connected) continue;

        stats.reportCount++;

        // Logic for Paid / Pending / Slashed
        if (report.paid) {
          const dispute = await getDispute(bountyId, reportId);
          const wasRejected = (dispute && dispute.phase === 3 && dispute.rejectVotes > dispute.acceptVotes) || 
                              (!dispute && report.rejectVotes > report.acceptVotes);
          
          if (wasRejected) {
            stats.totalSlashed += report.stakeAmount;
          } else {
            stats.totalPaid += bountyCore.rewardAmount;
          }
        } else {
          stats.lockedStake += report.stakeAmount;
          if (report.status === ReportStatus.Accepted) {
            stats.totalPending += bountyCore.rewardAmount;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching researcher earnings:', e);
  }

  return stats;
}

