#!/bin/bash

# Bug Bounty Platform Launcher
# This script starts the local blockchain, deploys contracts, and launches the frontend

set -e

echo "🚀 Bug Bounty Platform Launcher"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start local blockchain in background
echo -e "${YELLOW}Step 1: Starting local Anvil node...${NC}"
cd contracts
anvil --fork-url https://arb-sepolia.g.alchemy.com/v2/demo --block-time 2 &
ANVIL_PID=$!
sleep 3
echo -e "${GREEN}✓ Local node running (PID: $ANVIL_PID)${NC}"

# Step 2: Deploy contracts
echo -e "${YELLOW}Step 2: Deploying contracts...${NC}"

# Use default Anvil private key
export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
export TREASURY_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Deploy
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key $PRIVATE_KEY

# Get deployed addresses (mock - in reality would parse from broadcast output)
PLATFORM_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
USDC_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

echo -e "${GREEN}✓ Contracts deployed${NC}"
echo "  Platform: $PLATFORM_ADDRESS"
echo "  MockUSDC: $USDC_ADDRESS"

# Step 3: Setup frontend env
echo -e "${YELLOW}Step 3: Configuring frontend...${NC}"
cd ../frontend

if [ ! -f ".env.local" ]; then
    echo "Creating new .env.local with default values..."
    cat > .env.local << EOF
NEXT_PUBLIC_CONTRACT_ADDRESS=$PLATFORM_ADDRESS
NEXT_PUBLIC_USDC_ADDRESS=$USDC_ADDRESS
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
EOF
else
    echo ".env.local already exists, skipping overwrite to preserve your JWT."
fi

echo -e "${GREEN}✓ Frontend configured${NC}"

# Step 4: Install frontend deps if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Step 5: Launch frontend
echo -e "${YELLOW}Step 4: Starting frontend...${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🌐 Open http://localhost:3000${NC}"
echo -e "${GREEN}================================${NC}"

npm run dev

# Cleanup on exit
trap "kill $ANVIL_PID 2>/dev/null; exit" INT TERM EXIT
