import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const fromBlock = parseInt(searchParams.get('fromBlock') || '0');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    const toBlock = Math.min(fromBlock + 10000, currentBlock); // Max 10k blocks

    const events = [];

    // Fetch all event types
    const eventFilters = [
      { name: 'BountyCreated', filter: contract.filters.BountyCreated() },
      { name: 'BountyFunded', filter: contract.filters.BountyFunded() },
      { name: 'ReportCommitted', filter: contract.filters.ReportCommitted() },
      { name: 'ReportAccepted', filter: contract.filters.ReportAccepted() },
      { name: 'ReportRejected', filter: contract.filters.ReportRejected() },
      { name: 'DisputeOpened', filter: contract.filters.DisputeOpened() },
    ];

    for (const { name, filter } of eventFilters) {
      const logs = await contract.queryFilter(filter, fromBlock, toBlock);
      for (const log of logs.slice(-Math.ceil(limit / eventFilters.length))) {
        events.push({
          type: name,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: log.args ? Object.fromEntries(
            Object.entries(log.args).filter(([k]) => isNaN(Number(k)))
          ) : {},
        });
      }
    }

    // Sort by block number descending
    events.sort((a, b) => b.blockNumber - a.blockNumber);

    return NextResponse.json(events.slice(0, limit));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
