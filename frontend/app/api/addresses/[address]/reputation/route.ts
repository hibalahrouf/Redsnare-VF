import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, provider);

    // Access reputation module through the platform contract
    const reputationAddress = await contract.reputation();
    const reputationABI = [
      'function reputations(address) view returns (uint256 acceptedReports, uint256 rejectedReports, uint256 disputesWon, uint256 disputesLost, int64 repScoreCached, uint64 lastUpdate)',
      'function repScore(address) view returns (int64)'
    ];

    const reputationContract = new ethers.Contract(reputationAddress, reputationABI, provider);
    const rep = await reputationContract.reputations(address);
    const score = await reputationContract.repScore(address);

    return NextResponse.json({
      address,
      acceptedReports: rep[0].toString(),
      rejectedReports: rep[1].toString(),
      disputesWon: rep[2].toString(),
      disputesLost: rep[3].toString(),
      repScoreCached: rep[4].toString(),
      lastUpdate: Number(rep[5]),
      currentScore: score.toString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 });
  }
}
