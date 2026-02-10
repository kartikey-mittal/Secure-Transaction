import { randomBytes } from "node:crypto";
import { encryptPayload, decryptPayload } from "../index.js";

const MASTER_KEY = randomBytes(32);

const input = {
    partyId: "party_123",
    payload: { amount: 100, currency: "AED" },
};

console.log("\n Encrypting...");
const record = encryptPayload(input, MASTER_KEY);
console.log("Encrypted OK");

console.log("\n Decrypting...");
const result = decryptPayload(record, MASTER_KEY);
console.log("Decrypted OK:", result);

// 1️ Round-trip check
if (result.partyId !== "party_123") {
    throw new Error("Round-trip failed");
}

// 2️ Tamper check
console.log("\n Tampering ciphertext...");
try {
    record.payload_ct = record.payload_ct.slice(0, -2) + "aa";
    decryptPayload(record, MASTER_KEY);
    throw new Error("Tampering NOT detected");
} catch {
    console.log("Tampering detected OK");
}

// Wrong key check
console.log("\n Using wrong master key...");
try {
    decryptPayload(record, randomBytes(32));
    throw new Error("Wrong key NOT detected");
} catch {
    console.log("Wrong key detected OK");
}

console.log("\n Manual crypto tests passed\n");
