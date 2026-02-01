"use client";

import { useEffect, useState } from "react";

type Cert = {
  id: string;
  createdAt: string;
  description: string;
  wallet: string | null;
  imageUrl: string;
  verification: null | {
    valid: boolean;
    category: string;
    confidence: number;
    summary: string;
  };
  mint: null | {
    mintAddress: string;
    tokenOwner: string;
    signature: string | null;
    txUrl: string | null;
    nftUrl: string;
    metadataUri: string;
    imageUri: string;
    summary: string;
    category: string;
    confidence: number;
    timestamp: string;
  };
};

export default function CertificatePage({ params }: { params: { id: string } }) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const [cert, setCert] = useState<Cert | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/cert/${params.id}`);
        if (!resp.ok) throw new Error(await resp.text());
        const json = await resp.json();
        // Make image URL absolute
        json.imageUrl = `${API_BASE}${json.imageUrl}`;
        setCert(json);
      } catch (e: any) {
        setErr(e?.message || "Failed to load certificate.");
      }
    })();
  }, [API_BASE, params.id]);

  if (err) {
    return (
      <div className="card">
        <h1>Certificate not found</h1>
        <p className="small">{err}</p>
        <p className="small">
          This backend is in-memory only. If you restarted the server, the certificate is gone.
        </p>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="card">
        <h1>Loading…</h1>
        <p className="small">Fetching certificate data from backend…</p>
      </div>
    );
  }

  const v = cert.verification;
  const m = cert.mint;

  return (
    <div className="card cert">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Certificate of Verified Impact</h1>
          <p className="small">ID: {cert.id}</p>
          <p className="small">Created: {new Date(cert.createdAt).toLocaleString()}</p>
        </div>
        {v && (
          <div className="badge">
            {v.valid ? "VERIFIED" : "NOT VERIFIED"} · {Math.round(v.confidence * 100)}%
          </div>
        )}
      </div>

      <img src={cert.imageUrl} alt="Uploaded proof" />

      <div>
        <label>User description</label>
        <div className="small" style={{ color: "var(--text)" }}>{cert.description}</div>
      </div>

      <hr />

      <div>
        <label>AI verification summary</label>
        {v ? (
          <>
            <p style={{ color: "var(--text)" }}>{v.summary}</p>
            <p className="small">
              Category: <b style={{ color: "var(--text)" }}>{v.category}</b> · Confidence:{" "}
              <b style={{ color: "var(--text)" }}>{v.confidence.toFixed(3)}</b>
            </p>
          </>
        ) : (
          <p className="small">No verification data.</p>
        )}
      </div>

      <hr />

      <div>
        <label>Solana NFT mint</label>
        {m ? (
          <>
            <p className="small">
              Mint address: <b style={{ color: "var(--text)" }}>{m.mintAddress}</b>
              <br />
              Owner: <b style={{ color: "var(--text)" }}>{m.tokenOwner}</b>
              <br />
              Timestamp: <b style={{ color: "var(--text)" }}>{new Date(m.timestamp).toLocaleString()}</b>
            </p>

            <p className="small">
              {m.txUrl ? (
                <>
                  Transaction: <a href={m.txUrl} target="_blank">View on Solana Explorer</a>
                  <br />
                </>
              ) : null}
              NFT: <a href={m.nftUrl} target="_blank">View mint address</a>
              <br />
              Metadata: <a href={m.metadataUri} target="_blank">Open metadata JSON</a>
            </p>
          </>
        ) : (
          <p className="small">
            Not minted (either verification failed or confidence was below threshold).
          </p>
        )}
      </div>
    </div>
  );
}
