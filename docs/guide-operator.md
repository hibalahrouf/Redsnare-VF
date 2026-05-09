# Operator Guide (Bounty Owner)

## Overview
As a bounty owner (operator), you create and manage bug bounty programs on the decentralized platform. This guide covers all operations from creation to resolution.

## Prerequisites
- Wallet with ETH for gas fees
- USDC (or configured reward token) for bounty funding
- Committee member addresses (N members, need K votes for decisions)

## Creating a Bounty

### Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `rewardAmount` | Max reward per valid report | 5000 USDC |
| `stakeAmount` | Required researcher stake | 50 USDC |
| `appealBond` | Bond for raising disputes | 100 USDC |
| `submissionDeadline` | Unix timestamp for cutoff | 7 days from now |
| `reviewSLA` | Seconds for committee review | 3 days (259200s) |
| `committee` | Array of N addresses | [0x1, 0x2, 0x3, 0x4, 0x5] |
| `thresholdK` | Votes needed for decision | 3 |
| `disputeCommitSeconds` | Dispute commit phase | 48 hours |
| `disputeRevealSeconds` | Dispute reveal phase | 48 hours |

### Via Frontend
1. Navigate to `/admin` (Admin Panel)
2. Connect wallet
3. Fill bounty creation form
4. Submit transaction

### Via Contract Directly
```solidity
uint256 bountyId = platform.createBounty(
    token,              // Reward token address
    rewardAmount,       // 5000 * 10**6 for USDC
    stakeAmount,          // 50 * 10**6
    appealBond,           // 100 * 10**6
    submissionDeadline,   // block.timestamp + 7 days
    reviewSLA,            // 3 days in seconds
    rateLimitWindow,      // 48 hours
    stakeEscalationBps,   // 1000 = 10%
    maxInWindow,          // 2
    maxActiveSubmissions, // 1
    committee,            // address[]
    thresholdK,           // 3
    disputeCommitSeconds, // 2 days
    disputeRevealSeconds  // 2 days
);
```

## Funding the Bounty

After creation, fund the escrow:

```solidity
// Approve tokens first
token.approve(address(platform), amount);

// Fund bounty
platform.fundBounty(bountyId, amount);
```

**Important**: Bounties must be sufficiently funded before researchers can submit reports. The contract checks `escrowBalance >= rewardAmount` on submission.

## Committee Management

### Committee Responsibilities
- Review submitted reports within SLA
- Vote Accept or Reject
- Participate in dispute resolution (commit-reveal)

### Changing Committee
Currently not supported in MVP. Create a new bounty if committee changes are needed.

## Dispute Resolution

If a researcher disputes a rejection:
1. Committee enters commit-reveal phase
2. Members commit hashed votes
3. After commit deadline, reveal votes with same salt
4. If K reveals for accept → researcher wins
5. If K reveals for reject → researcher loses

## Security Considerations

### Minimum Viable Committee
- N ≥ 3 (for decentralization)
- K > N/2 (majority required)
- Recommended: N=5, K=3

### SLA Recommendations
- `reviewSLA`: 3-7 days for normal review
- `disputeCommit/Reveal`: 48 hours each
- `submissionDeadline`: 30-90 days for program duration

### Anti-Spam Settings
- `stakeAmount`: Should hurt if lost but not exclude legitimate researchers
- `stakeEscalationBps`: 1000 (10%) recommended
- `maxActiveSubmissions`: 1-3 per researcher per bounty
- `maxInWindow`: Rate limit per window

## Monitoring

Check bounty status via:
```solidity
(core, state) = platform.getBountyCore(bountyId);
// core: owner, token, rewardAmount, stakeAmount, appealBond, submissionDeadline, reviewSLA, rateLimitWindow, stakeEscalationBps, maxInWindow
// state: maxActiveSubmissions, committeeSize, thresholdK, disputeCommitSeconds, disputeRevealSeconds, active, escrowBalance
```

## Emergency Procedures

If committee becomes unresponsive:
- Researchers can call `triggerEscalation()` after `reviewSLA` expires
- Auto-escalation forces dispute mode
- New committee vote required

## Costs

| Action | Gas Cost | Tokens |
|--------|----------|--------|
| createBounty | ~200k | None |
| fundBounty | ~50k | rewardAmount |
| committeeVote | ~30k | None |
| finalizeReport | ~80k | None (payout from escrow) |
