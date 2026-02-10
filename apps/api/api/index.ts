/**
 * Vercel Serverless Function — Secure Transactions API
 *
 * All crypto logic is inlined here so Vercel doesn't need
 * to resolve workspace packages.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

// ─── Types ───────────────────────────────────────────────

interface TxSecureRecord {
    id: string;
    partyId: string;
    createdAt: string;
    payload_nonce: string;
    payload_ct: string;
    payload_tag: string;
    dek_wrap_nonce: string;
    dek_wrapped: string;
    dek_wrap_tag: string;
    alg: "AES-256-GCM";
    mk_version: 1;
}

// ─── Crypto Helpers ──────────────────────────────────────

function aesEncrypt(key: Buffer, plaintext: Buffer) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ct, nonce, tag };
}

function aesDecrypt(key: Buffer, nonce: Buffer, ct: Buffer, tag: Buffer) {
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
}

function encryptPayload(partyId: string, payload: object, masterKey: Buffer): TxSecureRecord {
    const dek = randomBytes(32);
    const payloadBuf = Buffer.from(JSON.stringify(payload), "utf-8");
    const enc = aesEncrypt(dek, payloadBuf);
    const wrap = aesEncrypt(masterKey, dek);

    return {
        id: randomBytes(16).toString("hex"),
        partyId,
        createdAt: new Date().toISOString(),
        payload_nonce: enc.nonce.toString("hex"),
        payload_ct: enc.ct.toString("hex"),
        payload_tag: enc.tag.toString("hex"),
        dek_wrap_nonce: wrap.nonce.toString("hex"),
        dek_wrapped: wrap.ct.toString("hex"),
        dek_wrap_tag: wrap.tag.toString("hex"),
        alg: "AES-256-GCM",
        mk_version: 1,
    };
}

function decryptPayload(record: TxSecureRecord, masterKey: Buffer) {
    const dek = aesDecrypt(
        masterKey,
        Buffer.from(record.dek_wrap_nonce, "hex"),
        Buffer.from(record.dek_wrapped, "hex"),
        Buffer.from(record.dek_wrap_tag, "hex")
    );
    const plain = aesDecrypt(
        dek,
        Buffer.from(record.payload_nonce, "hex"),
        Buffer.from(record.payload_ct, "hex"),
        Buffer.from(record.payload_tag, "hex")
    );
    return JSON.parse(plain.toString("utf-8"));
}

// ─── Master Key & Storage ────────────────────────────────

const MK_HEX = process.env.MASTER_KEY || randomBytes(32).toString("hex");
const MASTER_KEY = Buffer.from(MK_HEX, "hex");
const store = new Map<string, TxSecureRecord>();

// ─── HTTP Helpers ────────────────────────────────────────

function send(res: ServerResponse, status: number, data: unknown) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(JSON.stringify(data));
}

function body(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let d = "";
        req.on("data", (c: Buffer) => (d += c.toString()));
        req.on("end", () => resolve(d));
        req.on("error", reject);
    });
}

// ─── Handler ─────────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    const url = req.url || "/";
    const method = req.method || "GET";

    if (method === "OPTIONS") return send(res, 200, {});

    // Health check
    if (url.match(/\/?(api\/)?health$/) && method === "GET") {
        return send(res, 200, { status: "ok" });
    }

    // POST /tx/encrypt
    if (url.match(/\/?(api\/)?tx\/encrypt$/) && method === "POST") {
        try {
            const raw = await body(req);
            const { partyId, payload } = JSON.parse(raw);
            if (!partyId || typeof partyId !== "string")
                return send(res, 400, { error: "partyId is required" });
            if (!payload || typeof payload !== "object" || Array.isArray(payload))
                return send(res, 400, { error: "payload must be a JSON object" });

            const record = encryptPayload(partyId, payload, MASTER_KEY);
            store.set(record.id, record);
            return send(res, 201, record);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Encryption failed";
            return send(res, 500, { error: msg });
        }
    }

    // POST /tx/:id/decrypt (check before GET /tx/:id)
    const decryptMatch = url.match(/\/?(api\/)?tx\/([^/]+)\/decrypt$/);
    if (decryptMatch && method === "POST") {
        const id = decryptMatch[2];
        const record = store.get(id);
        if (!record) return send(res, 404, { error: "Record not found" });
        try {
            const result = decryptPayload(record, MASTER_KEY);
            return send(res, 200, { id: record.id, partyId: record.partyId, payload: result });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Decryption failed";
            return send(res, 400, { error: msg });
        }
    }

    // GET /tx/:id
    const getMatch = url.match(/\/?(api\/)?tx\/([^/]+)$/);
    if (getMatch && method === "GET") {
        const id = getMatch[2];
        const record = store.get(id);
        if (!record) return send(res, 404, { error: "Record not found" });
        return send(res, 200, record);
    }

    return send(res, 404, { error: "Not found" });
}
