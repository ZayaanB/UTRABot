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
  nftLink?: string;
  metadataUri?: string;
  imageUri?: string;
};

type StatusResponse = {
  id: string;
  imageUrl?: string;      // should be a URL the browser can load
  description?: string;
  wallet?: string;
  verification?: Verification;
  mint?: MintInfo;
};

export default function CertificatePage({ params }: { params: { id: string } }) {
  const { id } = params;

  const API_BASE = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
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

        const res = await fetch(`${API_BASE}/api/status/${id}`, {
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
      <div className="container">
        <div className="card">Loading certificate…</div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="container">
        <div className="stack" style={{ gap: 12 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <button className="btnSecondary">← Return to Main Menu</button>
          </Link>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Couldn’t load certificate</h2>
            <div className="muted">{err || "No data returned."}</div>
          </div>
        </div>
      </div>
    );
  }

  const v = data.verification;
  const m = data.mint;

  const imageUrl = data.imageUrl || "";
  const category = v?.category || "Uncategorized";
  const confidence = typeof v?.confidence === "number" ? v.confidence : 0;
  const summary = v?.summary || "No verification summary available.";
  const mintAddress = m?.mintAddress || "—";
  const txLink = m?.txLink || "";
  const nftLink = m?.nftLink || "";

  return (
    <div className="container">
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <button className="btnSecondary">← Return to Main Menu</button>
        </Link>

        <span className="badge">Verified Impact Certificate</span>
      </div>

      <div style={{ height: 12 }} />

      <div className="certGrid">
        {/* Left: Image */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Photo</h2>

          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Uploaded proof"
              style={{ borderRadius: 12, width: "100%" }}
            />
          ) : (
            <div className="muted">
              No imageUrl provided by backend. (Check <code>/api/status/{id}</code>)
            </div>
          )}

          {data.description && (
            <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              {data.description}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="card stack">
          <h2 style={{ marginTop: 0 }}>Verification</h2>

          {v ? (
            <div className="stack" style={{ gap: 8 }}>
              <div>
                <span className="badge">{category}</span>
              </div>

              <div className="muted">
                Confidence: {(confidence * 100).toFixed(1)}%
                {!v.valid && (
                  <span style={{ marginLeft: 8 }}>
                    • <strong>Not valid</strong>
                  </span>
                )}
              </div>

              <div>{summary}</div>
            </div>
          ) : (
            <div className="muted">No verification object found.</div>
          )}

          <hr style={{ width: "100%", opacity: 0.15 }} />

          <h2 style={{ margin: 0 }}>NFT</h2>

          {m ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="muted" style={{ wordBreak: "break-word" }}>
                Mint: {mintAddress}
              </div>

              {txLink ? (
                <a href={txLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                  View transaction →
                </a>
              ) : (
                <div className="muted">No transaction link available.</div>
              )}

              {nftLink ? (
                <a href={nftLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                  View NFT →
                </a>
              ) : (
                <div className="muted">No NFT link available.</div>
              )}

              {m.metadataUri && (
                <a href={m.metadataUri} target="_blank" rel="noreferrer" className="muted">
                  Metadata URI
                </a>
              )}
            </div>
          ) : (
            <div className="muted">Not minted yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
