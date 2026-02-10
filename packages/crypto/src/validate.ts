/**
 * Validation helpers for hex strings, nonce length, tag length.
 */

/** Check if a string is valid hex */
export function isValidHex(s: string): boolean {
    return /^[0-9a-f]*$/i.test(s) && s.length % 2 === 0;
}

/** Validate that a hex string represents exactly `byteLen` bytes */
export function validateHexLength(hex: string, byteLen: number, label: string): void {
    if (!isValidHex(hex)) {
        throw new Error(`${label}: invalid hex encoding`);
    }
    const actualBytes = hex.length / 2;
    if (actualBytes !== byteLen) {
        throw new Error(`${label}: expected ${byteLen} bytes, got ${actualBytes}`);
    }
}

/** Validate nonce is exactly 12 bytes (24 hex chars) */
export function validateNonce(hex: string, label: string): void {
    validateHexLength(hex, 12, label);
}

/** Validate auth tag is exactly 16 bytes (32 hex chars) */
export function validateTag(hex: string, label: string): void {
    validateHexLength(hex, 16, label);
}

/** Validate all crypto fields on a TxSecureRecord */
export function validateRecord(record: {
    payload_nonce: string;
    payload_ct: string;
    payload_tag: string;
    dek_wrap_nonce: string;
    dek_wrapped: string;
    dek_wrap_tag: string;
}): void {
    validateNonce(record.payload_nonce, "payload_nonce");
    if (!isValidHex(record.payload_ct)) {
        throw new Error("payload_ct: invalid hex encoding");
    }
    validateTag(record.payload_tag, "payload_tag");

    validateNonce(record.dek_wrap_nonce, "dek_wrap_nonce");
    if (!isValidHex(record.dek_wrapped)) {
        throw new Error("dek_wrapped: invalid hex encoding");
    }
    validateTag(record.dek_wrap_tag, "dek_wrap_tag");
}
