// frontend/app/page.tsx
"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function LogoMark({ size = 34 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `tt-gradient-${uid}`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="84" fill={`url(#${gradId})`} opacity="0.18" />
      <path
        d="M65 110c10-26 27-46 51-58 10-5 18-7 27-7 3 0 5 0 7 1-7 3-15 7-23 12-21 13-36 33-45 58-6 16-8 30-8 40-5-9-9-22-9-46z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M80 128c16-12 36-18 60-18 9 0 18 1 26 3-7 4-15 7-24 9-26 6-49 18-66 38-11 12-18 24-22 33-1-10 2-28 26-65z"
        fill={`url(#${gradId})`}
        opacity="0.9"
      />
    </svg>
  );
}

function Brand({ size = 40 }: { size?: number }) {
  return (
    <div className="brandRow">
      <LogoMark size={size} />
      <div>
        <div className="brandName">TrusToken</div>
        <div className="brandTag">Proof of Impact · AI Verified · Solana Devnet</div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [wallet, setWallet] = useState("");

  const [step, setStep] = useState<"idle" | "uploading" | "error">("idle");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => !!file && !!desc.trim() && step !== "uploading", [file, desc, step]);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const apiUrl = (path: string) => `${API_BASE}${path}`;

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

      const res = await fetch(apiUrl("/api/upload"), { method: "POST", body: fd });

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

      setStatus("Verifying with AI…");
      const vRes = await fetch(apiUrl(`/api/verify/${id}`), { method: "POST" });
      if (!vRes.ok) {
        const j = await vRes.json().catch(() => ({}));
        throw new Error(j?.error || j?.message || "Verification failed.");
      }

      setStatus("Minting certificate (if eligible)…");
      const mRes = await fetch(apiUrl(`/api/mint/${id}`), { method: "POST" });
      if (!mRes.ok) {
        const j = await mRes.json().catch(() => ({}));
        setStatus(j?.error || j?.message || "Not minted (verification did not meet threshold).");
      } else {
        setStatus("Minted! Opening certificate…");
      }

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
  }

  return (
    <main>
      <div className="header">
        <div className="brand">
          <h1 className="h1">
            <Brand size={40} />
          </h1>
          <p className="sub">Upload a sustainable action → verify with AI → mint a Solana devnet certificate.</p>
        </div>

        <span className="badge">Devnet MVP</span>
      </div>

      {/* Wrapper adds space between About + Entry form */}
      <div style={{ display: "grid", gap: 18 }}>
        {/* About Us section */}
        <section className="card" id="about">
          <div className="stack">
            <div className="kv">
              <div className="label">About Us</div>
              <h2 style={{ margin: "6px 0 8px", fontSize: 22, lineHeight: 1.2 }}>
                Our mission: make real-world impact verifiable.
              </h2>
              <p className="muted" style={{ marginTop: 0 }}>
                TrusToken turns everyday sustainable actions into credible, shareable proof. Upload what you did, let AI
                verify the claim, then mint a Solana devnet certificate you can show, track, and celebrate.
              </p>
            </div>

            <hr className="hr" />

            <div className="kv">

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700 }}>♻️ Recycling & Proper Sorting</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Recycling, e-waste drop-off, correct bin sorting.
                  </div>
                </div>

                <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700 }}>🚲 Low-Carbon Transport</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Biking, walking, public transit, carpooling.
                  </div>
                </div>

                <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700 }}>💡 Energy & Water Saving</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    LEDs, thermostat changes, shorter showers, unplugging devices.
                  </div>
                </div>

                <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700 }}>🗑️ Waste Reduction</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Reusables, refills, repair/reuse, minimal packaging choices.
                  </div>
                </div>

                <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700 }}>🌱 Composting & Food Impact</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Composting, reducing food waste, plant-forward meals.
                  </div>
                </div>

                <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700 }}>🧹 Community & Ecosystem Care</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Community cleanups, tree planting, habitat-friendly actions.
                  </div>
                </div>
              </div>

              <div className="muted" style={{ marginTop: 12 }}>
                Tip: Clear photos + specific descriptions help the verifier classify your contribution more accurately.
              </div>
            </div>
          </div>
        </section>

        {/* Entry form */}
        <div className="card">
          <div className="stack">
            <div className="grid2">
              <div className="kv">
                <div className="label">Image</div>
                <input className="input" type="file" accept="image/*" onChange={onFileChange} />
                <div className="muted">Choose a photo of your action (recycling, transit, biking, etc.).</div>
              </div>

              <div className="kv">
                <div className="label">Wallet (optional)</div>
                <input
                  className="input"
                  placeholder="Solana address (optional)"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                />
                <div className="muted">If provided, the NFT will be minted to this address.</div>
              </div>
            </div>

            <div className="kv">
              <div className="label">Description</div>
              <textarea
                className="textarea"
                placeholder="Describe the sustainable action shown in the photo…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
              />
              <div className="muted">Tip: More detail → better AI summary.</div>
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
      </div>
    </main>
  );
}
