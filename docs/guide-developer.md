# Developer Guide

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Wagmi/    │────▶│   EVM       │
│   Frontend  │     │   Viem      │     │   Contracts │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                    │
       ▼                                    ▼
┌─────────────┐                      ┌─────────────┐
│   IPFS      │                      │   Modules   │
│   (Pinata)  │                      │   - Escrow  │
└─────────────┘                      │   - Stake   │
                                     │   - Reputation
                                     │   - Dispute │
                                     └─────────────┘
```

## Smart Contract Architecture

### BugBountyPlatform.sol
Main entry point that coordinates all modules:

```solidity
contract BugBountyPlatform is IBugBounty, ReentrancyGuard, ERC2771Context {
    Escrow public escrow;           // Fund management
    StakeManager public stakeManager; // Stake handling
    Reputation public reputation;   // Reputation scoring
    DisputeModule public disputeModule; // Dispute resolution
}
```

### Module Interactions

```
Researcher ──▶ submitReport() ──▶ BugBountyPlatform
                                    │
                                    ├──▶ StakeManager.lockStake()
                                    ├──▶ reputation.repScore()
                                    └──▶ emit ReportCommitted

Committee ──▶ voteReport() ──▶ BugBountyPlatform
                                  │
                                  ├──▶ threshold check
                                  └──▶ Escrow.release() (if accepted)
```

## Local Development

### 1. Clone & Install
```bash
git clone <repo>
cd bugbounty-admin-portal

# Contracts
cd contracts
forge install

# Frontend
cd ../frontend
npm install
```

### 2. Start Local Node
```bash
# In contracts directory
anvil --fork-url https://arb-sepolia.g.alchemy.com/v2/oIgcA01JEWaxxSOMF8XQ7

# Or use Hardhat
npx hardhat node
```

### 3. Deploy Contracts
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Copy deployed address to frontend .env.local
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0x..." > ../frontend/.env.local
echo "NEXT_PUBLIC_PINATA_JWT=your_jwt" >> ../frontend/.env.local
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

## Testing

### Contract Tests
```bash
cd contracts
forge test -vvv

# Run specific test
forge test --match-test test_SubmitReportNormal -vvv

# Gas report
forge test --gas-report
```

### Fuzz Testing
```bash
forge test --fuzz-runs 10000
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Contract Integration

### Adding New Features

1. **Update Interface** (`IBugBounty.sol`):
```solidity
interface IBugBounty {
    // Add new events/errors
    event NewFeature(uint256 indexed bountyId);
    error FeatureNotAvailable();
}
```

2. **Implement in Main Contract**:
```solidity
function newFeature(uint256 bountyId) external {
    // Implementation
    emit NewFeature(bountyId);
}
```

3. **Update Frontend ABI** (`contracts.ts`):
```typescript
export const BUG_BOUNTY_PLATFORM_ABI = [
  // ... existing functions
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "newFeature",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
```

## Indexer API

The platform includes a lightweight indexer for efficient querying.

### Event Indexing
```typescript
import { BountyIndexer } from '@/services/indexer';

const indexer = new BountyIndexer(provider);
await indexer.startIndexing(0); // From block 0

// Subscribe to real-time updates
indexer.subscribe((type, data) => {
  console.log(`New ${type}:`, data);
});

// Query indexed data
const reports = indexer.getBountyReports(bountyId);
```

### REST Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/bounties` | List all bounties |
| `GET /api/bounties/:id/reports` | Reports for bounty |
| `GET /api/reports/:bountyId/:reportId` | Single report |
| `GET /api/addresses/:address/reputation` | Reputation score |
| `GET /api/events` | Recent events |

## Security Considerations

### Checklist for New Features
- [ ] ReentrancyGuard on external calls
- [ ] CEI pattern (Checks-Effects-Interactions)
- [ ] Access control (onlyPlatform, onlyCommittee)
- [ ] Input validation (non-zero, bounds)
- [ ] Event emission for indexing
- [ ] Error handling with custom errors

### Common Vulnerabilities

**Reentrancy**:
```solidity
// BAD
externalCall();
state = updated; // Reentrant call sees old state

// GOOD
state = updated; // Update first
externalCall();  // Then interact
```

**Integer Overflow** (Solidity 0.8+ handles this, but be careful with casts):
```solidity
uint8 a = 255;
uint8 b = a + 1; // Reverts in 0.8+
```

**Access Control**:
```solidity
// Always check permissions
if (msg.sender != owner) revert Unauthorized();
```

## Deployment

### Production Checklist
- [ ] Contracts audited
- [ ] Testnet deployment verified
- [ ] Frontend env vars configured
- [ ] IPFS pinning service setup
- [ ] Monitoring configured
- [ ] Emergency pause procedures documented

### Contract Verification
```bash
forge verify-contract \
  --chain-id 421614 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(address,address)" TREASURY FORWARDER) \
  DEPLOYED_ADDRESS \
  BugBountyPlatform
```

## Debugging

### Common Issues

**"Contract not found"**:
- Check `NEXT_PUBLIC_CONTRACT_ADDRESS`
- Verify chain ID matches

**"Gas estimation failed"**:
- Check input parameters
- Verify token approvals
- Ensure sufficient escrow balance

**"Transaction reverted"**:
- Read revert reason with `cast receipt TX_HASH`
- Check require statements in code

### Useful Commands
```bash
# Decode revert reason
cast receipt 0x... --field revertReason

# Trace transaction
cast run --rpc-url http://localhost:8545 0x...

# Check contract state
cast call CONTRACT_ADDRESS "bountyCount()" --rpc-url http://localhost:8545
```

## Contributing

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Add tests for new functionality
4. Run full test suite
5. Submit PR with description

### Code Style
- Solidity: Use `forge fmt`
- TypeScript: Use `eslint` + `prettier`
- Follow existing patterns in codebase
