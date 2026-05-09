import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, provider);

    const bountyCount = await contract.bountyCount();
    const bounties = [];

    for (let i = 0; i < Number(bountyCount); i++) {
      try {
        const core = await contract.getBountyCore(i);
        const state = await contract.getBountyState(i);

        bounties.push({
          bountyId: i,
          owner: core[0],
          token: core[1],
          rewardAmount: core[2].toString(),
          stakeAmount: core[3].toString(),
          appealBond: core[4].toString(),
          submissionDeadline: Number(core[5]),
          reviewSLA: core[6],
          rateLimitWindow: core[7],
          stakeEscalationBps: core[8],
          maxInWindow: core[9],
          maxActiveSubmissions: state[0],
          committeeSize: state[1],
          thresholdK: state[2],
          disputeCommitSeconds: state[3],
          disputeRevealSeconds: state[4],
          active: state[5],
          escrowBalance: state[6].toString(),
        });
      } catch (e) {
        console.error(`Error fetching bounty ${i}:`, e);
      }
    }

    return NextResponse.json(bounties);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 });
  }
}
