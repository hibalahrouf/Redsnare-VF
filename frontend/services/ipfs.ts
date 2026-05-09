// IPFS Service with Client-Side AES-256-GCM Encryption
// Uploads encrypted reports to IPFS via Pinata

import { ethers } from 'ethers';

export interface VulnerabilityReport {
  steps: string;
  impact: string;
  poc: string;
  metadata?: {
    severity?: 'critical' | 'high' | 'medium' | 'low';
    cvss?: number;
    tags?: string[];
  };
}

export interface EncryptedReport {
  ciphertext: string;
  iv: string;
  authTag: string;
  cid: string;
  keyHex: string;
}

export interface BountyMetadata {
  tags: string[];
  description?: string;
  externalLink?: string;
}

export interface SubmissionData {
  salt: string;
  cidDigest: string;
  hSteps: string;
  hImpact: string;
  hPoc: string;
}

const PINATA_JWT = (process.env.NEXT_PUBLIC_PINATA_JWT || '').trim();

// Browser-safe Base64 helpers
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function calculateQualityScore(report: VulnerabilityReport): number {
  let score = 0;
  const stepsLength = report.steps.trim().length;
  if (stepsLength > 50) score += 35;
  const impactLength = report.impact.trim().length;
  if (impactLength > 50) score += 35;
  const pocLength = report.poc.trim().length;
  if (pocLength > 50) score += 30;
  return Math.min(score, 100);
}

export function generateEncryptionKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function encryptReport(
  report: VulnerabilityReport,
  key: Uint8Array,
  chainId: number,
  bountyId: number
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array; authTag: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const reportData = encoder.encode(JSON.stringify(report));

  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );

  const aad = encoder.encode(`${chainId}:${bountyId}`);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey, reportData
  );

  const ctArray = new Uint8Array(ciphertext);
  const authTag = ctArray.slice(-16);
  const actualCiphertext = ctArray.slice(0, -16);

  return { ciphertext: actualCiphertext.buffer, iv, authTag };
}

export async function uploadToIPFS(
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  authTag: Uint8Array
): Promise<string> {
  // FAST-PATH FOR DEMO/LOCAL (Only if no JWT is provided)
  if (!PINATA_JWT) {
    return "QmDemo" + Math.random().toString(36).substring(7);
  }

  const combined = new Uint8Array(iv.length + encryptedData.byteLength + authTag.length);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);
  combined.set(authTag, iv.length + encryptedData.byteLength);

  const blob = new Blob([combined], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, 'encrypted-report.bin');

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!response.ok) throw new Error(`IPFS upload failed`);
  const result = await response.json();
  return result.IpfsHash;
}

/**
 * Fetch and parse data from IPFS using multiple gateways for robustness
 */
export async function fetchFromIPFS(cid: string): Promise<Uint8Array> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ];

  let lastError: any = null;

  for (const url of gateways) {
    try {
      console.log(`Attempting to fetch from IPFS gateway: ${url}`);
      const res = await fetch(url, {
        method: 'GET',
        // Some gateways require specific headers or mode for CORS
        mode: 'cors', 
        cache: 'no-cache'
      });
      
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new Uint8Array(buffer);
      }
      console.warn(`Gateway ${url} returned status: ${res.status}`);
    } catch (e) {
      console.warn(`Failed to fetch from gateway ${url}:`, e);
      lastError = e;
    }
  }

  throw new Error(`IPFS fetch failed after trying multiple gateways. Last error: ${lastError?.message || 'Unknown'}`);
}

export async function prepareSubmission(
  report: VulnerabilityReport,
  bountyId: number,
  chainId: number
): Promise<{ encrypted: EncryptedReport; submission: SubmissionData; qualityScore: number }> {
  const qualityScore = calculateQualityScore(report);
  
  const key = generateEncryptionKey();
  const { ciphertext, iv, authTag } = await encryptReport(report, key, chainId, bountyId);
  const cid = await uploadToIPFS(ciphertext, iv, authTag);

  const salt = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const hSteps = ethers.keccak256(ethers.toUtf8Bytes(report.steps));
  const hImpact = ethers.keccak256(ethers.toUtf8Bytes(report.impact));
  const hPoc = ethers.keccak256(ethers.toUtf8Bytes(report.poc));
  const cidDigest = ethers.keccak256(ethers.toUtf8Bytes(cid));

  return {
    encrypted: {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      authTag: arrayBufferToBase64(authTag),
      cid,
      keyHex: keyToHex(key)
    },
    submission: { salt, cidDigest, hSteps, hImpact, hPoc },
    qualityScore
  };
}

export async function uploadBountyMetadata(metadata: BountyMetadata): Promise<string> {
  if (!PINATA_JWT) {
    return "QmBountyDemo" + Math.random().toString(36).substring(7);
  }
  const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'metadata.json');
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    body: formData,
  });
  const result = await response.json();
  return result.IpfsHash;
}

export async function fetchBountyMetadata(cid: string): Promise<BountyMetadata | null> {
  try {
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function decryptReport(
  encryptedData: Uint8Array,
  key: Uint8Array,
  chainId: number,
  bountyId: number
): Promise<VulnerabilityReport> {
  const iv = encryptedData.slice(0, 12);
  const authTag = encryptedData.slice(-16);
  const ciphertext = encryptedData.slice(12, -16);
  const fullCiphertext = new Uint8Array(ciphertext.length + authTag.length);
  fullCiphertext.set(ciphertext, 0);
  fullCiphertext.set(authTag, ciphertext.length);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const encoder = new TextEncoder();
  const aad = encoder.encode(`${chainId}:${bountyId}`);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey, fullCiphertext
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function keyToHex(key: Uint8Array): string {
  return '0x' + Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToKey(hex: string): Uint8Array {
  const clean = hex.replace('0x', '');
  return new Uint8Array(clean.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}
