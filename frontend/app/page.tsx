"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function LogoMark({ size = 34 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `tt-gradient-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", flex: "0 0 auto" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#059669", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <polygon
        points="100,10 180,55 180,145 100,190 20,145 20,55"
        fill={`url(#${gradId})`}
        stroke="#047857"
        strokeWidth="3"
      />
    </svg>
  );
}

function Brand({ size = 34 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <LogoMark size={size} />
      <span style={{ lineHeight: 1 }}>TrusToken</span>
    </span>
  );
}

type Step = "idle" | "uploading" | "error";

export default function Page() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [wallet, setWallet] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [status, setStatus] = useState<string>("");

  const canSubmit = useMemo(() => {
    return !!file && desc.trim().length > 0 && step !== "uploading";
  }, [file, desc, step]);

  // If you have a backend running on another port, set:
  // NEXT_PUBLIC_BACKEND_URL=http://localhost:5050
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  async function onSubmit() {
    if (!file || !desc.trim()) return;

    setStep("uploading");
    setStatus("Uploading…");

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("description", desc.trim());
      if (wallet.trim()) fd.append("wallet", wallet.trim());

      const res = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        let msg = "Upload failed.";
        try {
          const j = await res.json();
          msg = j?.error || j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      const id = data?.id || data?.requestId || data?.jobId;
      if (!id) throw new Error("No id returned from /api/upload.");

      setStatus("Submitted! Opening certificate…");
      router.push(`/certificate/${id}`);
    } catch (err: any) {
      setStep("error");
      setStatus(err?.message ?? "Something went wrong.");
    } finally {
      setStep("idle");
    }
  }

  function onReset() {
    setFile(null);
    setDesc("");
    setWallet("");
    setStatus("");
    setStep("idle");

    // also clears the file input UI in some browsers by refreshing the key
    // (optional; not required)
  }

  return (
    <main>
      <div className="header">
        <div className="brand">
          <h1 className="h1">
            <Brand size={40} />
          </h1>
          <p className="sub">
            Upload a sustainable action → verify with AI → mint a Solana devnet certificate.
          </p>
        </div>

        <span className="badge">Devnet MVP</span>
      </div>

      <div className="card">
        <div className="stack">
          <div className="grid2">
            <div className="kv">
              <div className="label">Image</div>
              <input className="input" type="file" accept="image/*" onChange={onFileChange} />
              <div className="muted">Choose a photo of your action (receipt, cleanup photo, etc.).</div>
            </div>

            <div className="kv">
              <div className="label">Optional: Wallet (for payout/credit)</div>
              <input
                className="input"
                type="text"
                placeholder="Solana address (optional)"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              />
              <div className="muted">Leave blank if your backend doesn’t use this yet.</div>
            </div>
          </div>

          <div className="kv">
            <div className="label">Description</div>
            <textarea
              className="textarea"
              placeholder="What did you do? (e.g., ‘Picked up litter in High Park for 45 minutes’)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="muted">Tip: more detail → better AI summary.</div>
          </div>

          <hr className="hr" />

          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="row">
              <button className="btn" disabled={!canSubmit} onClick={onSubmit}>
                {step === "uploading" ? "Submitting…" : "Verify + Mint"}
              </button>
              <button className="btnSecondary" onClick={onReset} disabled={step === "uploading"}>
                Reset
              </button>
            </div>

            <div className="muted" style={{ minHeight: 20 }}>
              {status || "Upload an image and description to get a verified NFT certificate."}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
