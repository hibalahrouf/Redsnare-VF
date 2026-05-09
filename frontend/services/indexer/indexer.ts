// Indexer Service for Bug Bounty Platform
// Listens to contract events and maintains indexed state

import { ethers } from 'ethers';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '../contracts';

export interface BountyEvent {
  bountyId: number;
  owner: string;
  token: string;
  rewardAmount: string;
  stakeAmount: string;
  appealBond: string;
  submissionDeadline: number;
  committeeSize: number;
  thresholdK: number;
  timestamp: number;
}

export interface ReportEvent {
  bountyId: number;
  reportId: number;
  researcher: string;
  commitHash: string;
  cidDigest: string;
  hSteps: string;
  hImpact: string;
  hPoc: string;
  stakeAmount: string;
  status: number;
  timestamp: number;
}

export interface VoteEvent {
  bountyId: number;
  reportId: number;
  member: string;
  accepted: boolean;
  timestamp: number;
}

export interface DisputeEvent {
  bountyId: number;
  reportId: number;
  autoEscalated: boolean;
  timestamp: number;
}

export class BountyIndexer {
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  // Indexed data stores
  public bounties: Map<number, BountyEvent> = new Map();
  public reports: Map<string, ReportEvent> = new Map(); // key: `${bountyId}-${reportId}`
  public votes: VoteEvent[] = [];
  public disputes: DisputeEvent[] = [];

  // Event listeners
  private listeners: Function[] = [];

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, provider);
  }

  /**
   * Start indexing from a specific block
   */
  async startIndexing(fromBlock: number = 0) {
    console.log(`[Indexer] Starting from block ${fromBlock}`);

    // Fetch historical events
    await this.indexBountyCreated(fromBlock);
    await this.indexReportCommitted(fromBlock);
    await this.indexVotes(fromBlock);
    await this.indexDisputes(fromBlock);

    // Set up real-time listeners
    this.setupEventListeners();

    console.log('[Indexer] Real-time indexing active');
  }

  private async indexBountyCreated(fromBlock: number) {
    const filter = this.contract.filters.BountyCreated();
    const events = await this.contract.queryFilter(filter, fromBlock);

    for (const event of events) {
      const { bountyId, owner, token, rewardAmount, stakeAmount, appealBond, submissionDeadline, committeeSize, thresholdK } = event.args as any;
      this.bounties.set(Number(bountyId), {
        bountyId: Number(bountyId),
        owner,
        token,
        rewardAmount: rewardAmount.toString(),
        stakeAmount: stakeAmount.toString(),
        appealBond: appealBond.toString(),
        submissionDeadline: Number(submissionDeadline),
        committeeSize,
        thresholdK,
        timestamp: event.blockNumber // Use blockNumber as proxy for timestamp
      });
    }

    console.log(`[Indexer] Indexed ${this.bounties.size} bounties`);
  }

  private async indexReportCommitted(fromBlock: number) {
    const filter = this.contract.filters.ReportCommitted();
    const events = await this.contract.queryFilter(filter, fromBlock);

    for (const event of events) {
      const { bountyId, reportId, researcher, commitHash, cidDigest, hSteps, hImpact, hPoc, stakeAmount } = event.args as any;
      const key = `${bountyId}-${reportId}`;
      this.reports.set(key, {
        bountyId: Number(bountyId),
        reportId: Number(reportId),
        researcher,
        commitHash,
        cidDigest,
        hSteps,
        hImpact,
        hPoc,
        stakeAmount: stakeAmount.toString(),
        status: 0, // Submitted
        timestamp: event.blockNumber
      });
    }

    console.log(`[Indexer] Indexed ${this.reports.size} reports`);
  }

  private async indexVotes(fromBlock: number) {
    const filter = this.contract.filters.ReportVoted();
    const events = await this.contract.queryFilter(filter, fromBlock);

    for (const event of events) {
      const { bountyId, reportId, reviewer, accepted } = event.args as any;
      this.votes.push({
        bountyId: Number(bountyId),
        reportId: Number(reportId),
        member: reviewer,
        accepted,
        timestamp: event.blockNumber
      });

      // Update report status if threshold reached
      await this.updateReportStatus(Number(bountyId), Number(reportId));
    }

    console.log(`[Indexer] Indexed ${this.votes.length} votes`);
  }

  private async indexDisputes(fromBlock: number) {
    const filter = this.contract.filters.DisputeOpened();
    const events = await this.contract.queryFilter(filter, fromBlock);

    for (const event of events) {
      const { bountyId, reportId, autoEscalated } = event.args as any;
      this.disputes.push({
        bountyId: Number(bountyId),
        reportId: Number(reportId),
        autoEscalated,
        timestamp: event.blockNumber
      });
    }

    console.log(`[Indexer] Indexed ${this.disputes.length} disputes`);
  }

  private async updateReportStatus(bountyId: number, reportId: number) {
    const key = `${bountyId}-${reportId}`;
    const report = this.reports.get(key);
    if (!report) return;

    // Count votes
    const reportVotes = this.votes.filter(v => v.bountyId === bountyId && v.reportId === reportId);
    const acceptCount = reportVotes.filter(v => v.accepted).length;
    const rejectCount = reportVotes.filter(v => !v.accepted).length;

    // Get bounty threshold
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return;

    // Update status based on threshold
    if (acceptCount >= bounty.thresholdK) {
      report.status = 1; // Accepted
    } else if (rejectCount >= bounty.thresholdK) {
      report.status = 2; // Rejected
    }

    this.reports.set(key, report);
  }

  private setupEventListeners() {
    // Real-time event listeners
    this.contract.on('BountyCreated', (...args: any[]) => {
      const event = args[args.length - 1];
      const { bountyId, owner, token, rewardAmount, stakeAmount, appealBond, submissionDeadline, committeeSize, thresholdK } = event.args;
      this.bounties.set(Number(bountyId), {
        bountyId: Number(bountyId),
        owner,
        token,
        rewardAmount: rewardAmount.toString(),
        stakeAmount: stakeAmount.toString(),
        appealBond: appealBond.toString(),
        submissionDeadline: Number(submissionDeadline),
        committeeSize,
        thresholdK,
        timestamp: Date.now()
      });
      this.notifyListeners('bounty', this.bounties.get(Number(bountyId)));
    });

    this.contract.on('ReportCommitted', (...args: any[]) => {
      const event = args[args.length - 1];
      const { bountyId, reportId, researcher, commitHash, cidDigest, hSteps, hImpact, hPoc, stakeAmount } = event.args;
      const key = `${bountyId}-${reportId}`;
      const report = {
        bountyId: Number(bountyId),
        reportId: Number(reportId),
        researcher,
        commitHash,
        cidDigest,
        hSteps,
        hImpact,
        hPoc,
        stakeAmount: stakeAmount.toString(),
        status: 0,
        timestamp: Date.now()
      };
      this.reports.set(key, report);
      this.notifyListeners('report', report);
    });

    this.contract.on('ReportVoted', (...args: any[]) => {
      const event = args[args.length - 1];
      const { bountyId, reportId, reviewer, accepted } = event.args;
      const vote = {
        bountyId: Number(bountyId),
        reportId: Number(reportId),
        member: reviewer,
        accepted,
        timestamp: Date.now()
      };
      this.votes.push(vote);
      this.updateReportStatus(Number(bountyId), Number(reportId));
      this.notifyListeners('vote', vote);
    });

    this.contract.on('DisputeOpened', (...args: any[]) => {
      const event = args[args.length - 1];
      const { bountyId, reportId, autoEscalated } = event.args;
      const dispute = {
        bountyId: Number(bountyId),
        reportId: Number(reportId),
        autoEscalated,
        timestamp: Date.now()
      };
      this.disputes.push(dispute);
      this.notifyListeners('dispute', dispute);
    });
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: (type: string, data: any) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(type: string, data: any) {
    this.listeners.forEach(cb => cb(type, data));
  }

  /**
   * Get reports for a specific bounty
   */
  getBountyReports(bountyId: number): ReportEvent[] {
    return Array.from(this.reports.values()).filter(r => r.bountyId === bountyId);
  }

  /**
   * Get votes for a specific report
   */
  getReportVotes(bountyId: number, reportId: number): VoteEvent[] {
    return this.votes.filter(v => v.bountyId === bountyId && v.reportId === reportId);
  }

  /**
   * Get active bounties
   */
  getActiveBounties(): BountyEvent[] {
    const now = Math.floor(Date.now() / 1000);
    return Array.from(this.bounties.values()).filter(b => b.submissionDeadline > now);
  }

  /**
   * Get disputes for a specific report
   */
  getReportDisputes(bountyId: number, reportId: number): DisputeEvent[] {
    return this.disputes.filter(d => d.bountyId === bountyId && d.reportId === reportId);
  }
}

// REST API Endpoints (to be used with Next.js API routes)
export const indexerAPI = {
  // GET /api/bounties
  async getBounties(): Promise<BountyEvent[]> {
    const response = await fetch('/api/bounties');
    return response.json();
  },

  // GET /api/bounties/:id
  async getBounty(bountyId: number): Promise<BountyEvent | null> {
    const response = await fetch(`/api/bounties/${bountyId}`);
    if (!response.ok) return null;
    return response.json();
  },

  // GET /api/bounties/:id/reports
  async getBountyReports(bountyId: number): Promise<ReportEvent[]> {
    const response = await fetch(`/api/bounties/${bountyId}/reports`);
    return response.json();
  },

  // GET /api/reports/:bountyId/:reportId
  async getReport(bountyId: number, reportId: number): Promise<ReportEvent | null> {
    const response = await fetch(`/api/reports/${bountyId}/${reportId}`);
    if (!response.ok) return null;
    return response.json();
  },

  // GET /api/addresses/:address/reputation
  async getReputation(address: string): Promise<any> {
    const response = await fetch(`/api/addresses/${address}/reputation`);
    return response.json();
  },

  // GET /api/events
  async getEvents(limit: number = 100): Promise<any[]> {
    const response = await fetch(`/api/events?limit=${limit}`);
    return response.json();
  }
};
