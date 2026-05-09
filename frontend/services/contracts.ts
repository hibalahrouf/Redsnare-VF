import { ethers } from 'ethers';

export const BUG_BOUNTY_PLATFORM_ABI = [
  {
    "inputs": [],
    "name": "bountyCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "escrow",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "name": "hasVoted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "name": "activeReports",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "isBanned",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "bountyId", "type": "uint256"}
    ],
    "name": "userSubmissions",
    "outputs": [{"name": "", "type": "uint64[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "reportCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "reports",
    "outputs": [
      {"name": "researcher", "type": "address"},
      {"name": "submittedAt", "type": "uint64"},
      {"name": "paid", "type": "bool"},
      {"name": "status", "type": "uint8"},
      {"name": "acceptVotes", "type": "uint8"},
      {"name": "rejectVotes", "type": "uint8"},
      {"name": "commitHash", "type": "bytes32"},
      {"name": "cidDigest", "type": "bytes32"},
      {"name": "hSteps", "type": "bytes32"},
      {"name": "hImpact", "type": "bytes32"},
      {"name": "hPoc", "type": "bytes32"},
      {"name": "stakeAmount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "getBountyCore",
    "outputs": [
      {"name": "owner", "type": "address"},
      {"name": "token", "type": "address"},
      {"name": "rewardAmount", "type": "uint256"},
      {"name": "stakeAmount", "type": "uint256"},
      {"name": "appealBond", "type": "uint256"},
      {"name": "submissionDeadline", "type": "uint64"},
      {"name": "reviewSLA", "type": "uint32"},
      {"name": "rateLimitWindow", "type": "uint32"},
      {"name": "stakeEscalationBps", "type": "uint16"},
      {"name": "maxInWindow", "type": "uint8"},
      {"name": "metadataCidDigest", "type": "bytes32"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "getBountyState",
    "outputs": [
      {"name": "maxActiveSubmissions", "type": "uint8"},
      {"name": "committeeSize", "type": "uint8"},
      {"name": "thresholdK", "type": "uint8"},
      {"name": "disputeCommitSeconds", "type": "uint32"},
      {"name": "disputeRevealSeconds", "type": "uint32"},
      {"name": "active", "type": "bool"},
      {"name": "escrowBalance", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "member", "type": "address"}
    ],
    "name": "isCommitteeMember",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "name": "getRequiredStake",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "token", "type": "address"},
      {"name": "rewardAmount", "type": "uint256"},
      {"name": "stakeAmount", "type": "uint256"},
      {"name": "appealBond", "type": "uint256"},
      {"name": "submissionDeadline", "type": "uint64"},
      {"name": "reviewSLA", "type": "uint32"},
      {"name": "rateLimitWindow", "type": "uint32"},
      {"name": "stakeEscalationBps", "type": "uint16"},
      {"name": "maxInWindow", "type": "uint8"},
      {"name": "maxActiveSubmissions", "type": "uint8"},
      {"name": "committee", "type": "address[]"},
      {"name": "thresholdK", "type": "uint8"},
      {"name": "disputeCommitSeconds", "type": "uint32"},
      {"name": "disputeRevealSeconds", "type": "uint32"},
      {"name": "metadataCid", "type": "string"},
      {"name": "initialFund", "type": "uint256"}
    ],
    "name": "createBounty",
    "outputs": [{"name": "bountyId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "fundBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "salt", "type": "bytes32"},
      {"name": "cidDigest", "type": "bytes32"},
      {"name": "hSteps", "type": "bytes32"},
      {"name": "hImpact", "type": "bytes32"},
      {"name": "hPoc", "type": "bytes32"}
    ],
    "name": "submitReport",
    "outputs": [{"name": "reportId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "accepted", "type": "bool"}
    ],
    "name": "voteReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "triggerEscalation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "commitHash", "type": "bytes32"}
    ],
    "name": "commitVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "vote", "type": "bool"},
      {"name": "salt", "type": "string"}
    ],
    "name": "revealVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "finalizeReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "getBountyCore",
    "outputs": [
      {"name": "owner", "type": "address"},
      {"name": "token", "type": "address"},
      {"name": "rewardAmount", "type": "uint256"},
      {"name": "stakeAmount", "type": "uint256"},
      {"name": "appealBond", "type": "uint256"},
      {"name": "submissionDeadline", "type": "uint64"},
      {"name": "reviewSLA", "type": "uint32"},
      {"name": "rateLimitWindow", "type": "uint32"},
      {"name": "stakeEscalationBps", "type": "uint16"},
      {"name": "maxInWindow", "type": "uint8"},
      {"name": "metadataCidDigest", "type": "bytes32"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "getBountyState",
    "outputs": [
      {"name": "maxActiveSubmissions", "type": "uint8"},
      {"name": "committeeSize", "type": "uint8"},
      {"name": "thresholdK", "type": "uint8"},
      {"name": "disputeCommitSeconds", "type": "uint32"},
      {"name": "disputeRevealSeconds", "type": "uint32"},
      {"name": "active", "type": "bool"},
      {"name": "escrowBalance", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "reportCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "reports",
    "outputs": [
      {"name": "researcher", "type": "address"},
      {"name": "submittedAt", "type": "uint64"},
      {"name": "paid", "type": "bool"},
      {"name": "status", "type": "uint8"},
      {"name": "acceptVotes", "type": "uint8"},
      {"name": "rejectVotes", "type": "uint8"},
      {"name": "commitHash", "type": "bytes32"},
      {"name": "cidDigest", "type": "bytes32"},
      {"name": "hSteps", "type": "bytes32"},
      {"name": "hImpact", "type": "bytes32"},
      {"name": "hPoc", "type": "bytes32"},
      {"name": "stakeAmount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bountyCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "name": "hasVoted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "type": "event",
    "name": "ReportCommitted",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": true, "name": "researcher", "type": "address"},
      {"indexed": false, "name": "commitHash", "type": "bytes32"},
      {"indexed": false, "name": "cidDigest", "type": "bytes32"},
      {"indexed": false, "name": "hSteps", "type": "bytes32"},
      {"indexed": false, "name": "hImpact", "type": "bytes32"},
      {"indexed": false, "name": "hPoc", "type": "bytes32"},
      {"indexed": false, "name": "stakeAmount", "type": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeOpened",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": false, "name": "autoEscalated", "type": "bool"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeFinalized",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": false, "name": "outcome", "type": "uint8"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReportAccepted",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReportRejected",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReportFinalized",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": false, "name": "result", "type": "uint8"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReportVoted",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": true, "name": "reviewer", "type": "address"},
      {"indexed": false, "name": "accepted", "type": "bool"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VoteCommitted",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": true, "name": "reviewer", "type": "address"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VoteRevealed",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": true, "name": "reviewer", "type": "address"},
      {"indexed": false, "name": "vote", "type": "bool"}
    ],
    "anonymous": false
  },
  {
    "inputs": [],
    "name": "disputeModule",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const DISPUTE_MODULE_ABI = [
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "getDisputeKey",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{"name": "key", "type": "bytes32"}],
    "name": "disputes",
    "outputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "phase", "type": "uint8"},
      {"name": "commitDeadline", "type": "uint64"},
      {"name": "revealDeadline", "type": "uint64"},
      {"name": "acceptVotes", "type": "uint8"},
      {"name": "rejectVotes", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "key", "type": "bytes32"},
      {"name": "user", "type": "address"}
    ],
    "name": "commitments",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "key", "type": "bytes32"},
      {"name": "user", "type": "address"}
    ],
    "name": "hasRevealed",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const REPUTATION_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "reputations",
    "outputs": [
      {"name": "acceptedReports", "type": "uint256"},
      {"name": "rejectedReports", "type": "uint256"},
      {"name": "disputesWon", "type": "uint256"},
      {"name": "disputesLost", "type": "uint256"},
      {"name": "repScoreCached", "type": "int64"},
      {"name": "lastUpdate", "type": "uint64"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "repScore",
    "outputs": [{"name": "", "type": "int64"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const ESCROW_ABI = [
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "balances",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PLATFORM_ADDRESS = CONTRACT_ADDRESS;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const DISPUTE_MODULE_ADDRESS = (process.env.NEXT_PUBLIC_DISPUTE_MODULE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const REPUTATION_ADDRESS = (process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const STAKE_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_STAKE_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

export async function getContract(signer: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, signer);
}

export async function submitReport(
    signer: ethers.Signer,
    bountyId: number | bigint,
    salt: string,
    cidDigest: string,
    hSteps: string,
    hImpact: string,
    hPoc: string
) {
    const contract = await getContract(signer);
    const tx = await contract.submitReport(bountyId, salt, cidDigest, hSteps, hImpact, hPoc);
    return await tx.wait();
}
