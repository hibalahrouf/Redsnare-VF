import { USDC_ADDRESS } from './contracts';

export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  logoUrl: string;
  decimals: number;
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    address: USDC_ADDRESS as `0x${string}`,
    symbol: 'USDC',
    name: 'Mock USDC',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    decimals: 6,
  },
];

export function getTokenByAddress(address: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

export function formatTokenAmount(amount: bigint | string | number, decimals: number = 6): string {
  const val = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  return (val / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
