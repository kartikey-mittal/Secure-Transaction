/**
 * Vercel Serverless Function — plain Node.js handler (no Fastify)
 *
 * Vercel serverless functions receive standard (req, res) objects.
 * We parse the URL and route manually to keep it simple.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { encryptPayload, decryptPayload } from "@secure-tx/crypto";
import type { TxSecureRecord } from "@secure-tx/crypto";

// ─── Master Key ──────────────────────────────────────────
const MASTER_KEY_HEX = process.env.MASTER_KEY || randomBytes(32).toString("hex");
const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, "hex");

// ─── In-Memory Storage ──────────────────────────────────
const store = new Map<string, TxSecureRecord>();

// ─── Helpers ─────────────────────────────────────────────

function sendJSON(res: ServerResponse, status: number, data: unknown) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk: Buffer) => (body += chunk.toString()));
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

// ─── Main Handler ────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    const url = req.url || "/";
    const method = req.method || "GET";

    // Handle CORS preflight
    if (method === "OPTIONS") {
        return sendJSON(res, 200, {});
    }

    // GET /health or /api/health
    if (url.match(/\/?health$/) && method === "GET") {
        return sendJSON(res, 200, { status: "ok" });
    }

    // POST /tx/encrypt or /api/tx/encrypt
    if (url.match(/\/?tx\/encrypt$/) && method === "POST") {
        try {
            const raw = await parseBody(req);
            const { partyId, payload } = JSON.parse(raw);

            if (!partyId || typeof partyId !== "string") {
                return sendJSON(res, 400, { error: "partyId is required (string)" });
            }
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                return sendJSON(res, 400, { error: "payload is required (JSON object)" });
            }

            const record = encryptPayload({ partyId, payload }, MASTER_KEY);
            store.set(record.id, record);
            return sendJSON(res, 201, record);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Encryption failed";
            return sendJSON(res, 500, { error: msg });
        }
    }

    // Match /tx/:id/decrypt or /api/tx/:id/decrypt
    const decryptMatch = url.match(/\/?tx\/([^/]+)\/decrypt$/);
    if (decryptMatch && method === "POST") {
        const id = decryptMatch[1];
        const record = store.get(id);
        if (!record) return sendJSON(res, 404, { error: "Record not found" });

        try {
            const result = decryptPayload(record, MASTER_KEY);
            return sendJSON(res, 200, result);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Decryption failed";
            return sendJSON(res, 400, { error: msg });
        }
    }

    // Match /tx/:id or /api/tx/:id
    const getMatch = url.match(/\/?tx\/([^/]+)$/);
    if (getMatch && method === "GET") {
        const id = getMatch[1];
        const record = store.get(id);
        if (!record) return sendJSON(res, 404, { error: "Record not found" });
        return sendJSON(res, 200, record);
    }

    // Fallback
    return sendJSON(res, 404, { error: "Not found" });
}
