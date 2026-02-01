"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Verification = {
  valid: boolean;
  category: string;
  confidence: number; // 0..1
  summary: string;
};

type MintInfo = {
  mintAddress?: string;
  signature?: string;
  txLink?: string;
  mintLink?: string;
  nftLink?: string;
  metadataUri?: string;
};

type StatusResponse = {
  id: string;
  createdAt: string;
  description: string;
  wallet?: string;
  imageUrl?: string; // typically: /api/cert/:id/image
  verification?: Verification | null;
  mint?: MintInfo | null;
};

export default function CertificatePage({ params }: { params: { id: string } }) {
  const { id } = params;

  const API_BASE = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:4000"
    );
  }, []);

  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API_BASE}/api/cert/${id}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load certificate.");

        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load certificate.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, id]);

  if (loading) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="muted">Loading certificate…</div>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ marginTop: 0 }}>Couldn’t load certificate</h2>
            <Link href="/" className="link">
              ← Back
            </Link>
          </div>
          <div className="muted">{err || "No data returned."}</div>
        </div>
      </div>
    );
  }

  const v = data.verification;
  const m = data.mint;

  const imageUrlRaw = data.imageUrl || "";
  const imageUrl = imageUrlRaw
    ? imageUrlRaw.startsWith("http")
      ? imageUrlRaw
      : `${API_BASE}${imageUrlRaw}`
    : "";

  const category = v?.category || "Uncategorized";
  const confidence = typeof v?.confidence === "number" ? v.confidence : 0;
  const summary = v?.summary || "No verification summary available.";

  const confidencePct = Math.round(confidence * 100);

  const txLink = m?.txLink || "";
  const nftLink = m?.nftLink || "";
  const mintLink = m?.mintLink || "";

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Certificate</h1>
        <Link href="/" className="link">
          ← New upload
        </Link>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="grid2">
          <div>
            <div className="label">Evidence</div>

            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Uploaded evidence"
                style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}
              />
            ) : (
              <div className="muted">
                No imageUrl provided by backend. (Check <code>/api/cert/:id</code>)
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <div className="label">Claim</div>
              <div>{data.description}</div>
              {data.wallet ? <div className="muted">Mint target: {data.wallet}</div> : null}
            </div>
          </div>

          <div>
            <div className="label">AI Verification</div>

            {v ? (
              <div className="stack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{v.valid ? "✅ Valid" : "❌ Not valid"}</div>
                    <div className="muted">{category}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{confidencePct}%</div>
                    <div className="muted">confidence</div>
                  </div>
                </div>

                <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                  {summary}
                </div>
              </div>
            ) : (
              <div className="muted">Not verified yet.</div>
            )}

            <hr className="hr" style={{ margin: "18px 0" }} />

            <div className="label">Solana Mint</div>

            {m ? (
              <div className="stack">
                {m.mintAddress ? <div>Mint: <b>{m.mintAddress}</b></div> : null}
                {m.signature ? <div className="muted">Signature: {m.signature}</div> : null}

                {txLink ? (
                  <a href={txLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    View transaction →
                  </a>
                ) : (
                  <div className="muted">No transaction link available.</div>
                )}

                {mintLink ? (
                  <a href={mintLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    View mint →
                  </a>
                ) : (
                  <div className="muted">No mint link available.</div>
                )}

                {nftLink ? (
                  <a href={nftLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    View NFT →
                  </a>
                ) : (
                  <div className="muted">No NFT link available.</div>
                )}

                {m.metadataUri ? (
                  <a href={m.metadataUri} target="_blank" rel="noreferrer" className="muted">
                    Metadata URI
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="muted">Not minted yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
