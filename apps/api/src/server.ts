/**
 * Fastify API server for Secure Transactions
 *
 * Routes:
 *   POST /tx/encrypt    — Encrypt & store a transaction
 *   GET  /tx/:id        — Retrieve encrypted record
 *   POST /tx/:id/decrypt — Decrypt a stored record
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomBytes } from "node:crypto";
import {
    encryptPayload,
    decryptPayload,
    type TxSecureRecord,
} from "@secure-tx/crypto";

// ─── Master Key ─────────────────────────────────────────────
// In production, load from a secure vault. For dev, generate or use env var.
const MASTER_KEY_HEX =
    process.env.MASTER_KEY || randomBytes(32).toString("hex");
const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, "hex");

console.log(
    `🔑 Master Key (first 8 hex): ${MASTER_KEY_HEX.slice(0, 8)}...`
);

// ─── In-Memory Storage ──────────────────────────────────────
const store = new Map<string, TxSecureRecord>();

// ─── Server Setup ───────────────────────────────────────────
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// ─── Health Check ───────────────────────────────────────────
app.get("/health", async () => ({ status: "ok" }));

// ─── POST /tx/encrypt ───────────────────────────────────────
app.post<{
    Body: { partyId: string; payload: Record<string, unknown> };
}>("/tx/encrypt", async (request, reply) => {
    const { partyId, payload } = request.body;

    if (!partyId || typeof partyId !== "string") {
        return reply.status(400).send({ error: "partyId is required (string)" });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return reply
            .status(400)
            .send({ error: "payload is required (JSON object)" });
    }

    try {
        const record = encryptPayload({ partyId, payload }, MASTER_KEY);
        store.set(record.id, record);
        return reply.status(201).send(record);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Encryption failed";
        return reply.status(500).send({ error: message });
    }
});

// ─── GET /tx/:id ────────────────────────────────────────────
app.get<{ Params: { id: string } }>("/tx/:id", async (request, reply) => {
    const { id } = request.params;
    const record = store.get(id);

    if (!record) {
        return reply.status(404).send({ error: "Record not found" });
    }

    return reply.send(record);
});

// ─── POST /tx/:id/decrypt ───────────────────────────────────
app.post<{ Params: { id: string } }>(
    "/tx/:id/decrypt",
    async (request, reply) => {
        const { id } = request.params;
        const record = store.get(id);

        if (!record) {
            return reply.status(404).send({ error: "Record not found" });
        }

        try {
            const result = decryptPayload(record, MASTER_KEY);
            return reply.send(result);
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Decryption failed";
            return reply.status(400).send({ error: message });
        }
    }
);

// ─── Start ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 API server running at http://localhost:${PORT}`);
} catch (err) {
    app.log.error(err);
    process.exit(1);
}

export default app;
