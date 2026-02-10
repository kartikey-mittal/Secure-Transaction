/**
 * Vercel Serverless Entry Point for the Fastify API
 *
 * Vercel runs serverless functions (not long-running servers),
 * so we export the Fastify app as a handler that Vercel can call.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomBytes } from "node:crypto";
import {
    encryptPayload,
    decryptPayload,
    type TxSecureRecord,
} from "@secure-tx/crypto";

// ─── Master Key ─────────────────────────────────────────
const MASTER_KEY_HEX =
    process.env.MASTER_KEY || randomBytes(32).toString("hex");
const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, "hex");

// ─── In-Memory Storage ──────────────────────────────────
const store = new Map<string, TxSecureRecord>();

// ─── Build the Fastify app ──────────────────────────────
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Health
app.get("/api/health", async () => ({ status: "ok" }));

// POST /api/tx/encrypt
app.post<{
    Body: { partyId: string; payload: Record<string, unknown> };
}>("/api/tx/encrypt", async (request, reply) => {
    const { partyId, payload } = request.body;

    if (!partyId || typeof partyId !== "string") {
        return reply.status(400).send({ error: "partyId is required (string)" });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return reply.status(400).send({ error: "payload is required (JSON object)" });
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

// GET /api/tx/:id
app.get<{ Params: { id: string } }>("/api/tx/:id", async (request, reply) => {
    const { id } = request.params;
    const record = store.get(id);

    if (!record) {
        return reply.status(404).send({ error: "Record not found" });
    }

    return reply.send(record);
});

// POST /api/tx/:id/decrypt
app.post<{ Params: { id: string } }>(
    "/api/tx/:id/decrypt",
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
            const message = err instanceof Error ? err.message : "Decryption failed";
            return reply.status(400).send({ error: message });
        }
    }
);

export default async function handler(req: any, res: any) {
    await app.ready();
    app.server.emit("request", req, res);
}
