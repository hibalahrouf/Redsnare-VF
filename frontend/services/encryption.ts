/**
 * Generate a new random AES-GCM key to encrypt the report.
 */
export async function generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypt data using the provided key, with optional Additional Authenticated Data (AAD)
 */
export async function encryptData(key: CryptoKey, data: string, chainId?: number, bountyId?: number): Promise<{ ciphertext: string, iv: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    // Additional Authenticated Data
    let additionalData: Uint8Array | undefined;
    if (chainId !== undefined && bountyId !== undefined) {
        additionalData = new TextEncoder().encode(`${chainId}:${bountyId}`);
    }

    const params: AesGcmParams = { name: "AES-GCM", iv: iv as BufferSource };
    if (additionalData) params.additionalData = additionalData as BufferSource;

    const encryptedContent = await window.crypto.subtle.encrypt(
        params,
        key,
        encodedData
    );

    const encryptedBytes = new Uint8Array(encryptedContent);
    const ciphertextBase64 = Buffer.from(encryptedBytes).toString("base64");
    const ivBase64 = Buffer.from(iv).toString("base64");

    return { ciphertext: ciphertextBase64, iv: ivBase64 };
}

/**
 * Decrypt data using the provided key and IV, with optional AAD.
 */
export async function decryptData(key: CryptoKey, ciphertextBase64: string, ivBase64: string, chainId?: number, bountyId?: number): Promise<string> {
    const ciphertext = Buffer.from(ciphertextBase64, "base64");
    const iv = Buffer.from(ivBase64, "base64");

    let additionalData: Uint8Array | undefined;
    if (chainId !== undefined && bountyId !== undefined) {
        additionalData = new TextEncoder().encode(`${chainId}:${bountyId}`);
    }

    const decParams: AesGcmParams = { name: "AES-GCM", iv: new Uint8Array(iv) as BufferSource };
    if (additionalData) decParams.additionalData = additionalData as BufferSource;

    const decryptedContent = await window.crypto.subtle.decrypt(
        decParams,
        key,
        new Uint8Array(ciphertext)
    );

    return new TextDecoder().decode(decryptedContent);
}

export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return Buffer.from(new Uint8Array(exported)).toString("base64");
}
