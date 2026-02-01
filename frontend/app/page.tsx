"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "idle" | "uploading" | "verifying" | "minting" | "done" | "error";

export default function HomePage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [wallet, setWallet] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [status, setStatus] = useState<string>("");

  const canSubmit = useMemo(() => {
    return Boolean(file) && description.trim().length > 0 && step !== "uploading" && step !== "verifying" && step !== "minting";
  }, [file, description, step]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    try {
      setStep("uploading");
      setStatus("Uploading…");

      // 1) Upload
      const form = new FormData();
      form.append("image", file);
      form.append("description", description);
      if (wallet.trim()) form.append("wallet", wallet.trim());

      const uploadResp = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: form
      });

      if (!uploadResp.ok) throw new Error(await uploadResp.text());
      const { id } = await uploadResp.json();

      // 2) Verify
      setStep("verifying");
      setStatus("Verifying with Gemini…");

      const verResp = await fetch(`${API_BASE}/api/verify/${id}`, { method: "POST" });
      if (!verResp.ok) throw new Error(await verResp.text());
      const verJson = await verResp.json();

      // 3) Mint
      setStep("minting");
      setStatus("Minting NFT on Solana devnet…");

      const mintResp = await fetch(`${API_BASE}/api/mint/${id}`, { method: "POST" });
      if (!mintResp.ok) {
        const err = await mintResp.json().catch(() => ({}));
        throw new Error(err.error || "Mint rejected.");
      }

      setStep("done");
      setStatus("Done! Opening certificate…");

      router.push(`/certificate/${id}`);
    } catch (err: any) {
      setStep("error");
      setStatus(err?.message || "Something failed.");
    }
  }

  return (
    <div className="row">
      <div className="card">
        <h1>Proof-of-Impact Marketplace (MVP)</h1>
        <p>Upload a real-world sustainable/charitable action → verified by AI → minted as a Solana NFT certificate.</p>

        <hr />

        <form onSubmit={onSubmit}>
          <label>Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <label>Short description</label>
          <textarea
            placeholder="Example: Took the subway instead of driving to campus today."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label>(Optional) Recipient wallet address</label>
          <input
            placeholder="Solana address (devnet)"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <button disabled={!canSubmit} type="submit">
              Verify + Mint Certificate
            </button>

            {step !== "idle" && (
              <span className="badge">
                {step.toUpperCase()}
              </span>
            )}
          </div>

          {status && <p className="small" style={{ marginTop: 10 }}>{status}</p>}
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Demo tips</h2>
        <p className="small">
          Best results: clear action photos (bike, recycling bin, volunteer setting, donation receipt blur OK).
        </p>
        <p className="small">
          If minting fails, your backend wallet likely needs more devnet SOL for upload + mint costs.
        </p>
      </div>
    </div>
  );
}
