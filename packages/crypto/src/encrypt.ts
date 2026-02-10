
import { randomBytes, createCipheriv } from "node:crypto";
import type { TxSecureRecord, EncryptInput } from "./types.js";

// ─── Helper: Generate a unique ID ─────────────────────────
function generateId(): string {
    return randomBytes(16).toString("hex");
}

// ─── Helper: Generate a random key or nonce ───────────────
function generateRandomBytes(size: number): Buffer {
    return randomBytes(size);
}

// ─── Helper: Encrypt data using AES-256-GCM ───────────────
// Returns { ciphertext, nonce, tag } — all as Buffers
function aes256gcmEncrypt(
    key: Buffer,
    plaintext: Buffer
): { ciphertext: Buffer; nonce: Buffer; tag: Buffer } {
    // Nonce = a random 12-byte value (required for GCM mode)
    const nonce = generateRandomBytes(12);

    // Create the cipher with the key and nonce
    const cipher = createCipheriv("aes-256-gcm", key, nonce);

    // Encrypt the plaintext and
    const encrypted = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
    ]);

    // Get the authentication tag (used to verify data wasn't tampered)
    const tag = cipher.getAuthTag();

    return { ciphertext: encrypted, nonce, tag };
}

// ─── Main: Encrypt a payload ──────────────────────────────
export function encryptPayload(
    input: EncryptInput,
    masterKey: Buffer
): TxSecureRecord {
    // Validate master key is 32 bytes (256 bits)
    if (masterKey.length !== 32) {
        throw new Error("Master key must be exactly 32 bytes");
    }

    // Step 1: Generate a random DEK (Data Encryption Key) — 32 bytes
    const dek = generateRandomBytes(32);

    // Step 2: Convert the JSON payload to a Buffer (string of bytes)
    const payloadAsBytes = Buffer.from(JSON.stringify(input.payload), "utf-8");

    // Step 3: Encrypt the payload using the DEK
    const encryptedPayload = aes256gcmEncrypt(dek, payloadAsBytes);

    // Step 4: Wrap (encrypt) the DEK using the Master Key
    const wrappedDek = aes256gcmEncrypt(masterKey, dek);

    // Step 5: Build the record — convert all binary values to hex strings
    const record: TxSecureRecord = {
        id: generateId(),
        partyId: input.partyId,
        createdAt: new Date().toISOString(),

        // Encrypted payload data
        payload_nonce: encryptedPayload.nonce.toString("hex"),
        payload_ct: encryptedPayload.ciphertext.toString("hex"),
        payload_tag: encryptedPayload.tag.toString("hex"),

        // Wrapped DEK data
        dek_wrap_nonce: wrappedDek.nonce.toString("hex"),
        dek_wrapped: wrappedDek.ciphertext.toString("hex"),
        dek_wrap_tag: wrappedDek.tag.toString("hex"),

        // Metadata
        alg: "AES-256-GCM",
        mk_version: 1,
    };

    return record;
}
