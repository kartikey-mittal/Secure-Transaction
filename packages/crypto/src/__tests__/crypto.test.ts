/**
 * Manual crypto tests — run with: node --loader tsx src/__tests__/crypto.test.ts
 */

import { randomBytes } from "node:crypto";
import { encryptPayload, decryptPayload, validateNonce, validateTag, isValidHex } from "../index.js";
import type { TxSecureRecord } from "../types.js";

const MASTER_KEY = randomBytes(32);
const SAMPLE_INPUT = {
    partyId: "party_123",
    payload: { amount: 100, currency: "AED" },
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
    if (condition) {
        console.log(`  PASS  ${name}`);
        passed++;
    } else {
        console.log(`  FAIL  ${name}`);
        failed++;
    }
}

function assertThrows(fn: () => void, name: string) {
    try {
        fn();
        console.log(`  FAIL  ${name} (did not throw)`);
        failed++;
    } catch {
        console.log(`  PASS  ${name}`);
        passed++;
    }
}

console.log("\n--- Envelope Encryption Tests ---\n");

// 1. Round-trip
const record = encryptPayload(SAMPLE_INPUT, MASTER_KEY);
const result = decryptPayload(record, MASTER_KEY);
assert(result.partyId === "party_123", "round-trip: partyId matches");
assert(JSON.stringify(result.payload) === JSON.stringify({ amount: 100, currency: "AED" }), "round-trip: payload matches");
assert(result.id === record.id, "round-trip: id matches");

// 2. Tampered ciphertext
const tampered1: TxSecureRecord = {
    ...record,
    payload_ct: record.payload_ct.slice(0, -2) + (record.payload_ct.slice(-2) === "aa" ? "bb" : "aa"),
};
assertThrows(() => decryptPayload(tampered1, MASTER_KEY), "tampered ciphertext fails");

// 3. Tampered payload tag
const tampered2: TxSecureRecord = {
    ...record,
    payload_tag: record.payload_tag.slice(0, -2) + (record.payload_tag.slice(-2) === "aa" ? "bb" : "aa"),
};
assertThrows(() => decryptPayload(tampered2, MASTER_KEY), "tampered payload tag fails");

// 4. Tampered DEK wrap tag
const tampered3: TxSecureRecord = {
    ...record,
    dek_wrap_tag: record.dek_wrap_tag.slice(0, -2) + (record.dek_wrap_tag.slice(-2) === "aa" ? "bb" : "aa"),
};
assertThrows(() => decryptPayload(tampered3, MASTER_KEY), "tampered DEK wrap tag fails");

// 5. Wrong master key
const wrongKey = randomBytes(32);
assertThrows(() => decryptPayload(record, wrongKey), "wrong master key fails");

// 6. Wrong nonce length
assertThrows(() => validateNonce("aabb", "test_nonce"), "wrong nonce length rejected");

// 7. Wrong tag length
assertThrows(() => validateTag("aabb", "test_tag"), "wrong tag length rejected");

// 8. Invalid hex detection
assert(isValidHex("xyz123") === false, "invalid hex detected");
assert(isValidHex("abcdef0123456789") === true, "valid hex accepted");

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
process.exit(failed > 0 ? 1 : 0);
