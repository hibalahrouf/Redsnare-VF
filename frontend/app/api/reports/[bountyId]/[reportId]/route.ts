import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

export async function GET(
  request: NextRequest,
  { params }: { params: { bountyId: string; reportId: string } }
) {
  try {
    const bountyId = parseInt(params.bountyId);
    const reportId = parseInt(params.reportId);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, provider);

    const report = await contract.reports(bountyId, reportId);

    return NextResponse.json({
      reportId,
      bountyId,
      researcher: report[0],
      submittedAt: Number(report[1]),
      paid: report[2],
      status: Number(report[3]),
      acceptVotes: report[4],
      rejectVotes: report[5],
      commitHash: report[6],
      cidDigest: report[7],
      hSteps: report[8],
      hImpact: report[9],
      hPoc: report[10],
      stakeAmount: report[11].toString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
