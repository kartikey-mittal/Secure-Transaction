"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/* ---- SVG Icons ---- */

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

const LockIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

const KeyIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const UnlockIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
);

const CopyIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export default function Home() {
    const [partyId, setPartyId] = useState("party_123");
    const [payloadText, setPayloadText] = useState(
        JSON.stringify({ amount: 100, currency: "AED" }, null, 2)
    );
    const [recordId, setRecordId] = useState("");
    const [copied, setCopied] = useState(false);

    const [result, setResult] = useState<{
        type: "success" | "error" | "info";
        label: string;
        data: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<
        { id: string; partyId: string; time: string }[]
    >([]);

    const handleCopy = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.data);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* fallback: do nothing */
        }
    };

    /* ---- Encrypt & Save ---- */
    const handleEncrypt = async () => {
        setLoading(true);
        setResult(null);
        try {
            let payload: Record<string, unknown>;
            try {
                payload = JSON.parse(payloadText);
            } catch {
                throw new Error("Invalid JSON payload");
            }

            const res = await fetch(`${API_URL}/tx/encrypt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partyId, payload }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Encryption failed");

            setRecordId(data.id);
            setHistory((prev) => [
                { id: data.id, partyId: data.partyId, time: new Date().toLocaleTimeString() },
                ...prev,
            ]);
            setResult({
                type: "info",
                label: "Encrypted Record",
                data: JSON.stringify(data, null, 2),
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setResult({ type: "error", label: "Error", data: msg });
        } finally {
            setLoading(false);
        }
    };

    /* ---- Fetch Record ---- */
    const handleFetch = async () => {
        if (!recordId.trim()) {
            setResult({ type: "error", label: "Error", data: "Enter a Record ID" });
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_URL}/tx/${recordId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fetch failed");

            setResult({
                type: "info",
                label: "Encrypted Record",
                data: JSON.stringify(data, null, 2),
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setResult({ type: "error", label: "Error", data: msg });
        } finally {
            setLoading(false);
        }
    };

    /* ---- Decrypt ---- */
    const handleDecrypt = async () => {
        if (!recordId.trim()) {
            setResult({ type: "error", label: "Error", data: "Enter a Record ID" });
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_URL}/tx/${recordId}/decrypt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Decryption failed");

            setResult({
                type: "success",
                label: "Decrypted",
                data: JSON.stringify(data, null, 2),
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setResult({ type: "error", label: "Error", data: msg });
        } finally {
            setLoading(false);
        }
    };

    const boxClass = result
        ? `record-box ${result.type === "success" ? "record-box--decrypted" : ""} ${result.type === "error" ? "record-box--error" : ""}`
        : "record-box";

    return (
        <>
            {/* ---- Top Bar ---- */}
            <nav className="topbar">
                <div className="topbar__left">
                    <span className="topbar__shield"><ShieldIcon /></span>
                    <span className="topbar__title">Secure Transactions Mini-App</span>
                </div>
                <div className="topbar__status">
                    API Connected at <strong>{API_URL}</strong>
                    <span className="topbar__dot" />
                </div>
            </nav>

            {/* ---- Main ---- */}
            <main className="main">
                <div className="grid">
                    {/* LEFT column */}
                    <div className="left-col">
                        <section className="card" id="encrypt-section">
                            <h2 className="card__title">
                                <span className="card__title-icon"><LockIcon /></span>
                                Encrypt &amp; Save
                            </h2>

                            <div className="form-group">
                                <label className="form-label" htmlFor="partyId">Party ID</label>
                                <input
                                    id="partyId"
                                    className="form-input"
                                    type="text"
                                    value={partyId}
                                    onChange={(e) => setPartyId(e.target.value)}
                                    placeholder="party_123"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="payload">JSON Payload</label>
                                <textarea
                                    id="payload"
                                    className="form-textarea"
                                    value={payloadText}
                                    onChange={(e) => setPayloadText(e.target.value)}
                                />
                            </div>

                            <button
                                id="btn-encrypt"
                                className="btn btn--primary"
                                onClick={handleEncrypt}
                                disabled={loading}
                            >
                                {loading ? <span className="spinner" /> : null}
                                Encrypt &amp; Save
                            </button>
                        </section>

                        {/* Record History */}
                        <div className="history-card">
                            <h3 className="history-card__title">
                                <ClockIcon />
                                Transaction History
                            </h3>
                            {history.length === 0 ? (
                                <p className="history-empty">No records yet. Encrypt a payload to begin.</p>
                            ) : (
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Record ID</th>
                                            <th>Party</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h) => (
                                            <tr
                                                key={h.id}
                                                className={recordId === h.id ? "active" : ""}
                                                onClick={() => setRecordId(h.id)}
                                            >
                                                <td title={h.id}>{h.id.slice(0, 12)}...</td>
                                                <td>{h.partyId}</td>
                                                <td>{h.time}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Retrieve & Decrypt */}
                    <section className="card" id="retrieve-section">
                        <h2 className="card__title">
                            <span className="card__title-icon"><KeyIcon /></span>
                            Retrieve &amp; Decrypt
                        </h2>

                        <div className="form-group">
                            <label className="form-label" htmlFor="recordId">Record ID</label>
                            <input
                                id="recordId"
                                className="form-input"
                                type="text"
                                value={recordId}
                                onChange={(e) => setRecordId(e.target.value)}
                                placeholder="Auto-filled after encrypt"
                            />
                        </div>

                        <button
                            id="btn-fetch"
                            className="btn btn--fetch"
                            onClick={handleFetch}
                            disabled={loading}
                        >
                            <span className="btn-icon"><DownloadIcon /></span>
                            Fetch Record
                        </button>

                        <button
                            id="btn-decrypt"
                            className="btn btn--decrypt"
                            onClick={handleDecrypt}
                            disabled={loading}
                        >
                            <span className="btn-icon"><UnlockIcon /></span>
                            Decrypt
                        </button>

                        {/* ---- Result box ---- */}
                        {result && (
                            <div className="record-section">
                                <div className="result-header">
                                    <span className={`result-badge result-badge--${result.type}`}>
                                        {result.label}
                                    </span>
                                </div>
                                <div className="record-box-wrap">
                                    <div className={boxClass}>
                                        <button
                                            className={`copy-btn ${copied ? "copy-btn--copied" : ""}`}
                                            onClick={handleCopy}
                                            title="Copy to clipboard"
                                        >
                                            {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                                        </button>
                                        {result.data}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
