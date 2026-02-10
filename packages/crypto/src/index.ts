/**
 * @secure-tx/crypto — shared encryption logic
 *
 * Implements Envelope Encryption using AES-256-GCM.
 */

export { encryptPayload } from "./encrypt.js";
export { decryptPayload } from "./decrypt.js";
export { validateRecord, validateNonce, validateTag, isValidHex } from "./validate.js";
export type { TxSecureRecord, EncryptInput, DecryptResult } from "./types.js";
