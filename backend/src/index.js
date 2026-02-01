require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const { verifyWithGemini } = require("./lib/gemini");
const { mintImpactNft } = require("./lib/solana");
const { store, get, update, cleanupNow } = require("./lib/store");

// category -> badge picker
const { pickBadgeFromCategory } = require("./lib/categoryBadge");
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

// Multer memory upload (no disk, no DB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB (comment said 6MB before)
});

// --- 1) Upload route: stores file+desc in-memory, returns id
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    const description = (req.body.description || "").trim();
    const wallet = (req.body.wallet || "").trim();

    if (!req.file) return res.status(400).json({ error: "Missing image file." });
    if (!description) return res.status(400).json({ error: "Missing description." });

    const id = uuidv4();

    store(id, {
      id,
      createdAt: new Date().toISOString(),
      description,
      wallet: wallet || null,
      image: {
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname || "upload.jpg",
      },
      verification: null,
      mint: null,

      // store these once we know category
      badgeKey: null,
      badgeImage: null,
    });

    return res.json({ id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Upload failed." });
  }
});

// --- 2) Verify route: sends stored image+desc to Gemini, saves result + badge
app.post("/api/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = get(id);
    if (!item) return res.status(404).json({ error: "Not found." });

    const result = await verifyWithGemini({
      imageBuffer: item.image.buffer,
      mimeType: item.image.mimeType,
      description: item.description,
    });

    // choose badge based on category
    const category = result?.category || "";
    const picked = pickBadgeFromCategory(category);

    // Save verification + badge fields
    update(id, {
      verification: result,
      badgeKey: picked.key,
      badgeImage: picked.publicPath,
    });

    return res.json({
      id,
      verification: result,
      badgeKey: picked.key,
      badgeImage: picked.publicPath,
    });
  } catch (e) {
    console.error("VERIFY ERROR:", e);
    return res.status(500).json({
      error: e?.message || "Verification failed.",
      // temporary debug:
      stack: e?.stack,
    });
  }
});

// --- 3) Mint route: checks verification + threshold, mints NFT, saves mint data
app.post("/api/mint/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Load item from in-memory store
    const item = get(id);
    if (!item) {
      return res.status(404).json({ error: "Not found." });
    }

    // 2) Must be verified first
    if (!item.verification) {
      return res.status(400).json({ error: "Not verified yet." });
    }

    // 3) Check eligibility
    const threshold = Number(process.env.CONFIDENCE_THRESHOLD || "0.75");
    const { valid, confidence } = item.verification;

    if (!valid || Number(confidence) < threshold) {
      return res.status(400).json({
        error: "Not eligible to mint.",
        eligible: false,
        threshold,
        verification: item.verification,
      });
    }

    // ensure badge exists (in case verify response didn't store it for some reason)
    let badgeKey = item.badgeKey;
    let badgeImage = item.badgeImage;

    if (!badgeKey || !badgeImage) {
      const picked = pickBadgeFromCategory(item.verification.category || "");
      badgeKey = picked.key;
      badgeImage = picked.publicPath;
      update(id, { badgeKey, badgeImage });
    }

    // 4) Mint NFT
    const timestamp = new Date().toISOString();

    const mintResult = await mintImpactNft({
      // Use the selected badge art as the NFT image, NOT the uploaded photo.
      badgeImagePath: badgeImage, // e.g. "/nft/waste-reduction-badge.png"
      badgeKey,

      // Keep the uploaded image and details as proof/context (if your mint code uses it)
      imageBuffer: item.image.buffer,
      mimeType: item.image.mimeType,
      originalName: item.image.originalName,

      summary: item.verification.summary,
      category: item.verification.category,
      confidence: item.verification.confidence,
      timestamp,
      recipientWallet: item.wallet, // optional
      description: item.description, // helpful for metadata too (optional)
    });

    // 5) Save mint result in-memory
    update(id, { mint: mintResult });

    // 6) Return to frontend
    return res.json({
      id,
      eligible: true,
      mint: mintResult,
      badgeKey,
      badgeImage,
    });
  } catch (e) {
    console.error("MINT ERROR:", e);

    // Give a more helpful message for common Solana/Irys issues
    const msg = e?.message || "Mint failed.";

    return res.status(500).json({
      error: msg,
      // debug only (remove later if you want)
      stack: e?.stack,
    });
  }
});

// --- 4) Certificate route: fetch everything for frontend display
app.get("/api/cert/:id", async (req, res) => {
  const item = get(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found." });

  // Don’t send raw buffer; expose an image endpoint instead
  return res.json({
    id: item.id,
    createdAt: item.createdAt,
    description: item.description,
    wallet: item.wallet,
    verification: item.verification,
    mint: item.mint,

    // NEW: badge fields for UI
    badgeKey: item.badgeKey,
    badgeImage: item.badgeImage,

    imageUrl: `/api/cert/${item.id}/image`,
  });
});

// --- 5) Certificate image route: serves uploaded image
app.get("/api/cert/:id/image", async (req, res) => {
  const item = get(req.params.id);
  if (!item) return res.status(404).end();
  res.setHeader("Content-Type", item.image.mimeType);
  return res.send(item.image.buffer);
});

// Manual cleanup trigger (handy in demo)
app.post("/api/admin/cleanup", (req, res) => {
  cleanupNow();
  res.json({ ok: true });
});

const port = Number(process.env.PORT || "4000");

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  // Multer-specific errors (e.g., file too large)
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Try a smaller image." });
  }

  return res.status(500).json({ error: err?.message || "Server error" });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});