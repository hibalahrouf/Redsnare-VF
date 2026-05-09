# Committee Member Guide

## Role Overview
As a committee member, you evaluate vulnerability reports and vote on their validity. The platform uses a K-sur-N voting system where K votes from N members are required for a decision.

## Committee Responsibilities

1. **Initial Review**: Vote Accept or Reject on submitted reports
2. **Dispute Resolution**: Participate in commit-reveal voting when disputes arise
3. **Timeliness**: Act within SLA deadlines to avoid auto-escalation

## Getting Started

### Access
1. Navigate to `/committee`
2. Connect wallet with committee member address
3. View pending reports requiring your vote

### Workflow

## Phase 1: Initial Review

### Reviewing Reports
1. Access encrypted report via IPFS CID (shared securely)
2. Decrypt using researcher-provided key
3. Evaluate: validity, severity, PoC quality
4. Submit vote:
   - **Accept**: Researcher gets reward + stake back
   - **Reject**: Stake slashed, researcher may appeal

### Voting
```solidity
// Via UI or contract
platform.voteReport(bountyId, reportId, true);   // Accept
platform.voteReport(bountyId, reportId, false);  // Reject
```

### When Threshold Reaches K
- If K accepts: Report auto-accepted, reward released
- If K rejects: Report rejected, researcher can appeal

## Phase 2: Dispute Resolution

When a researcher appeals or auto-escalation occurs:

### Commit Phase (Blind Vote)
1. View report details
2. Decide your vote
3. Generate secret salt (save it!)
4. Create commit hash:
   ```solidity
   commitHash = keccak256(abi.encodePacked(vote, salt))
   // Example: keccak256(abi.encodePacked(true, "mysecret123"))
   ```
5. Submit commit:
   ```solidity
   platform.commitVote(bountyId, reportId, commitHash);
   ```

**Important**: Keep your salt secure! You need it for reveal.

### Reveal Phase
After commit deadline passes:
1. Retrieve your saved salt
2. Submit reveal:
   ```solidity
   platform.revealVote(bountyId, reportId, vote, salt);
   // Example: revealVote(0, 5, true, "mysecret123")
   ```

### Penalty for Non-Reveal
If you commit but don't reveal:
- Reputation penalty (-2 points)
- Vote not counted
- May affect final outcome

## Evaluation Criteria

### Accept Criteria
- Valid vulnerability exists
- PoC demonstrates exploit
- Within scope of bounty program
- Not previously reported

### Reject Criteria
- False positive / invalid
- Out of scope
- Insufficient proof
- Duplicate of known issue

### Severity Assessment
| Severity | Typical Reward |
|----------|---------------|
| Critical | 100% of max |
| High | 75% of max |
| Medium | 50% of max |
| Low | 25% of max |

## Best Practices

### Security
- Store decryption keys securely
- Never share committee private keys
- Verify report authenticity

### Confidentiality
- Don't disclose report contents publicly
- Follow responsible disclosure
- Coordinate with researcher on disclosure timeline

### Efficiency
- Review promptly within SLA
- Keep salts organized for reveal
- Monitor heartbeat notifications

## Reputation System

Your actions affect your reputation score:
- Consistent, timely voting → positive reputation
- Missing reveals → penalties
- Collusion detection → severe penalties

## Troubleshooting

### Can't Access Report
1. Verify you received decryption key from researcher
2. Check IPFS CID is valid
3. Ensure bountyId matches (AAD in encryption)

### Vote Not Counting
1. Verify you're a registered committee member
2. Check report is in correct phase
3. Ensure you haven't already voted

### Missed Reveal Deadline
- Vote won't count
- Reputation penalty applied
- Cannot recover - be more careful next time

## Communication

### With Researchers
- Professional and respectful tone
- Provide constructive feedback on rejections
- Coordinate on disclosure timelines

### With Other Committee Members
- Don't coordinate votes (prevents collusion)
- Commit-reveal prevents vote influence
- Focus on objective criteria
