# Researcher Guide

## Overview
This guide explains how to submit vulnerability reports, manage stakes, and navigate the dispute process on the decentralized bug bounty platform.

## Prerequisites
- Web3 wallet (MetaMask, Rainbow, etc.)
- ETH for gas fees
- Sufficient stake tokens (usually USDC)

## Submission Workflow

### 1. Select Bounty
Browse active bounties at `/`. Check:
- **Reward amount**: Maximum payout for valid reports
- **Stake requirement**: Amount to lock as collateral
- **SLA**: How long committee has to review
- **Deadline**: When submissions close

### 2. Prepare Report
Quality requirements (enforced client-side):
- **Steps**: Detailed reproduction steps (min 50 chars)
- **Impact**: Severity assessment (min 50 chars)
- **PoC**: Working proof of concept (min 50 chars)

Quality score must be ≥30/100 to submit.

### 3. Encryption
Reports are encrypted client-side using **AES-256-GCM**:
- Key generated in your browser
- AAD includes `chainId:bountyId` (prevents replay)
- Encrypted blob uploaded to IPFS

**Important**: Save your decryption key! You'll need to share it with the committee for review.

### 4. Submit On-Chain
```
submitReport(
  bountyId,
  salt,        // Random for commit hash
  cidDigest,   // keccak256(IPFS_CID)
  hSteps,      // keccak256(steps_text)
  hImpact,     // keccak256(impact_text)
  hPoc         // keccak256(poc_text)
)
```

## Understanding Stakes

### Dynamic Stake Calculation
Your required stake depends on reputation:
```
stake = baseStake × multiplier

multiplier = 0.5 to 5.0 based on:
  - Accepted reports: -0.1 per accept
  - Rejected reports: +0.1 per reject
  - Dispute wins: -0.05 per win
  - Dispute losses: +0.15 per loss
```

### Stake Outcomes
| Outcome | Stake |
|---------|-------|
| Report Accepted | Refunded 100% |
| Report Rejected | Slashed (to treasury) |
| Dispute Won | Refunded + appeal bond |
| Dispute Lost | Slashed + appeal bond lost |

## Reputation System

### Scoring
```
rep = 3×(accepted) + 2×(disputeWon) - 2×(rejected) - 3×(disputeLost)
```

### Temporal Decay
Reputation decays over time (90-day half-life):
```
rep_effective = rep × 0.5^(days_since_last_update / 90)
```

### Benefits of Good Reputation
- Lower stake requirements
- Higher rate limits
- Priority consideration

## Dispute Process

### When to Dispute
Dispute if you believe your rejected report is valid:
- False rejection
- Out-of-scope miscategorization
- Invalid duplicate marking

### Raising a Dispute
```solidity
platform.raiseDispute(bountyId, reportId);
// Requires appealBond (refunded if you win)
```

### What Happens Next
1. **Commit Phase** (48h): Committee commits blind votes
2. **Reveal Phase** (48h): Committee reveals actual votes
3. **Resolution**: If K reveals for accept → you win

### Auto-Escalation
If committee doesn't review within SLA:
```solidity
// Anyone can call this (permissionless)
platform.triggerEscalation(bountyId, reportId);
```

## Security Best Practices

### Key Management
1. **Generate**: Key created during submission
2. **Store**: Save in password manager
3. **Share**: Send to committee via secure channel when asked
4. **Rotate**: New key for each submission

### Communication
- Don't share report details publicly before disclosure
- Coordinate with bounty owner on disclosure timeline
- Use encrypted channels for sensitive details

### Verification
Before submitting:
- [ ] Report is within scope
- [ ] PoC is tested and working
- [ ] Impact is accurately assessed
- [ ] You have sufficient stake tokens
- [ ] You saved the decryption key

## Rate Limiting

### Limits
- `maxActiveSubmissions`: Concurrent pending reports per bounty
- `maxInWindow`: Submissions per time window
- `rateLimitWindow`: Duration of rate limit window

Example: 2 submissions per 48 hours

### Bypassing Limits
Increase reputation by submitting quality reports that get accepted.

## Common Issues

### "Report quality too low"
- Add more detail to steps/impact/PoC
- Include code snippets or screenshots
- Provide clear impact assessment

### "Insufficient escrow"
- Bounty not fully funded yet
- Wait for owner to add funds
- Or select different bounty

### "Rate limit exceeded"
- Wait for rate limit window to reset
- Or submit to different bounty
- Improve reputation for higher limits

### Can't decrypt report?
- Only committee can decrypt (with your key)
- Keys are for sharing with committee
- Store keys securely until resolution

## Rewards

### Timeline
- Accepted reports: Reward released immediately
- Finalization: Automatic after threshold votes
- Disputes: After reveal phase completes

### Claiming
Rewards auto-sent to your wallet on finalization. No manual claim needed.

## Support

For technical issues:
1. Check contract events for status
2. Verify transaction on block explorer
3. Contact bounty owner via official channels
