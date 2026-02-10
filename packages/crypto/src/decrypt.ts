/**
 * Decrypt an encrypted record back to the original JSON payload
 *
 * This reverses the Envelope Encryption process:
 *   1. Validate all the hex fields (nonces, tags, ciphertext)
 *   2. Unwrap (decrypt) the DEK using the Master Key
 *   3. Use the DEK to decrypt the actual payload
 *   4. Parse the decrypted bytes back into JSON
 */

import { createDecipheriv } from "node:crypto";
import type { TxSecureRecord, DecryptResult } from "./types.js";
import { validateRecord } from "./validate.js";

// ─── Helper: Convert a hex string to a Buffer ─────────────
function hexToBuffer(hex: string): Buffer {
    return Buffer.from(hex, "hex");
}

// ─── Helper: Decrypt data using AES-256-GCM ───────────────
// Takes the key, nonce, ciphertext, and tag — returns the plaintext
function aes256gcmDecrypt(
    key: Buffer,
    nonce: Buffer,
    ciphertext: Buffer,
    tag: Buffer
): Buffer {
    // Create the decipher with the key and nonce
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);

    // Set the authentication tag (so it can verify data wasn't tampered)
    decipher.setAuthTag(tag);

    // Decrypt and return the plaintext
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(), // This will throw if the tag doesn't match!
    ]);

    return decrypted;
}

// ─── Main: Decrypt a record ──────────────────────────────
export function decryptPayload(
    record: TxSecureRecord,
    masterKey: Buffer
): DecryptResult {
    // Validate master key is 32 bytes
    if (masterKey.length !== 32) {
        throw new Error("Master key must be exactly 32 bytes");
    }

    // Step 1: Validate all hex fields, nonce lengths (12 bytes), tag lengths (16 bytes)
    validateRecord(record);

    // Step 2: Unwrap (decrypt) the DEK using the Master Key
    let dek: Buffer;
    try {
        dek = aes256gcmDecrypt(
            masterKey,
            hexToBuffer(record.dek_wrap_nonce),
            hexToBuffer(record.dek_wrapped),
            hexToBuffer(record.dek_wrap_tag)
        );
    } catch {
        throw new Error("DEK unwrap failed: wrong master key or corrupted data");
    }

    // Step 3: Decrypt the payload using the DEK
    let payloadBytes: Buffer;
    try {
        payloadBytes = aes256gcmDecrypt(
            dek,
            hexToBuffer(record.payload_nonce),
            hexToBuffer(record.payload_ct),
            hexToBuffer(record.payload_tag)
        );
    } catch {
        throw new Error("Payload decryption failed: data may have been tampered with");
    }

    // Step 4: Convert decrypted bytes back to a JSON object
    const payload = JSON.parse(payloadBytes.toString("utf-8"));

    return {
        id: record.id,
        partyId: record.partyId,
        payload,
    };
}
