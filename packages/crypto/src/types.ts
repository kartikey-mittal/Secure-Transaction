/**
 * Secure Transaction Record — stores all encrypted data and metadata.
 *
 * Binary values are stored as hex strings.
 */
export interface TxSecureRecord {
    id: string;
    partyId: string;
    createdAt: string;

    /** Nonce used to encrypt the payload (12 bytes → 24 hex chars) */
    payload_nonce: string;
    /** AES-256-GCM ciphertext of the JSON payload (hex) */
    payload_ct: string;
    /** Auth tag from payload encryption (16 bytes → 32 hex chars) */
    payload_tag: string;

    /** Nonce used to wrap the DEK (12 bytes → 24 hex chars) */
    dek_wrap_nonce: string;
    /** Wrapped (encrypted) DEK (hex) */
    dek_wrapped: string;
    /** Auth tag from DEK wrapping (16 bytes → 32 hex chars) */
    dek_wrap_tag: string;

    /** Algorithm identifier */
    alg: "AES-256-GCM";
    /** Master key version */
    mk_version: 1;
}

/** Input for the encrypt function */
export interface EncryptInput {
    partyId: string;
    payload: Record<string, unknown>;
}

/** Result of a successful decryption */
export interface DecryptResult {
    id: string;
    partyId: string;
    payload: Record<string, unknown>;
}
