const fs = require("fs");
const path = require("path");
const bs58 = require("bs58");

const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { Metaplex, keypairIdentity, irysStorage, toMetaplexFile } = require("@metaplex-foundation/js");

function loadKeypair() {
  const b58 = process.env.SOLANA_SECRET_KEY_BASE58;
  const json = process.env.SOLANA_SECRET_KEY_JSON;

  if (b58) {
    const secret = bs58.decode(b58);
    return Keypair.fromSecretKey(secret);
  }
  if (json) {
    const arr = JSON.parse(json);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
  throw new Error("Set SOLANA_SECRET_KEY_BASE58 or SOLANA_SECRET_KEY_JSON");
}

function explorerTxUrl(sig) {
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  return `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
}

function explorerAddressUrl(address) {
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

function mimeFromExt(p) {
  const ext = (path.extname(p || "") || "").toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

/**
 * Find an absolute path to a file in frontend/public given a public path like "/nft/energy-saving-badge.png"
 */
function resolveFrontendPublicFile(publicPath) {
  if (!publicPath) return null;

  // normalize like "/nft/x.png" -> "nft/x.png"
  const rel = publicPath.replace(/^\/+/, "");

  // Optional override if you want:
  // FRONTEND_PUBLIC_DIR="/absolute/path/to/frontend/public"
  const override = process.env.FRONTEND_PUBLIC_DIR;
  const candidates = [];

  if (override) {
    candidates.push(path.join(override, rel));
  }

  // Common: running backend from repo root
  candidates.push(path.join(process.cwd(), "frontend", "public", rel));

  // If backend is started from /backend, try one level up
  candidates.push(path.join(process.cwd(), "..", "frontend", "public", rel));

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  return null;
}

async function mintImpactNft({
  // Existing (proof image from user upload)
  imageBuffer,
  mimeType,
  originalName,

  // Verification info
  summary,
  category,
  confidence,
  timestamp,
  recipientWallet,

  // NEW: badge selection
  badgeImagePath, // e.g. "/nft/waste-reduction-badge.png"
  badgeKey, // e.g. "waste_reduction"

  // Optional extra info
  description, // the user's text description of the action (optional)
}) {
  const rpc = process.env.SOLANA_RPC || clusterApiUrl("devnet");
  const connection = new Connection(rpc, "confirmed");
  const payer = loadKeypair();

  console.log("BACKEND MINTER WALLET:", payer.publicKey.toBase58());

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(
      irysStorage({
        address: process.env.IRYS_ADDRESS || "https://devnet.irys.xyz",
        providerUrl: rpc,
        timeout: 60000,
      })
    );

  // ----------------------------
  // 1) Decide what image becomes the NFT art
  // ----------------------------
  let nftImageBuffer = imageBuffer;
  let nftImageName = originalName || "impact.jpg";
  let nftImageMime = mimeType || "image/jpeg";
  let usedBadge = false;

  if (badgeImagePath) {
    const abs = resolveFrontendPublicFile(badgeImagePath);
    if (!abs) {
      throw new Error(
        `Badge image not found on disk for path "${badgeImagePath}". Check frontend/public and your working directory.`
      );
    }

    nftImageBuffer = fs.readFileSync(abs);
    nftImageName = path.basename(abs);
    nftImageMime = mimeFromExt(abs);
    usedBadge = true;
  }

  // Upload NFT image (badge or fallback to uploaded proof)
  const nftFile = toMetaplexFile(nftImageBuffer, nftImageName, { contentType: nftImageMime });

  // Best-effort auto-fund
  try {
    const driver = metaplex.storage().driver();
    if (driver && typeof driver.fund === "function") {
      await driver.fund([nftFile]);
    }
  } catch (_) {}

  const imageUri = await metaplex.storage().upload(nftFile);

  // ----------------------------
  // 2) Optionally upload proof image too (so you keep evidence)
  // ----------------------------
  let proofImageUri = null;
  if (usedBadge && imageBuffer) {
    try {
      const proofName = originalName || "proof.jpg";
      const proofMime = mimeType || "image/jpeg";
      const proofFile = toMetaplexFile(imageBuffer, proofName, { contentType: proofMime });

      // best-effort fund
      try {
        const driver = metaplex.storage().driver();
        if (driver && typeof driver.fund === "function") {
          await driver.fund([proofFile]);
        }
      } catch (_) {}

      proofImageUri = await metaplex.storage().upload(proofFile);
    } catch (e) {
      // proof is optional; don't fail mint if this upload fails
      console.warn("Proof image upload failed (continuing):", e?.message || e);
      proofImageUri = null;
    }
  }

  // ----------------------------
  // 3) Upload metadata JSON (image = badge imageUri)
  // ----------------------------
  // IMPORTANT: On-chain name is limited (32 bytes). Keep it short + ASCII.
  const shortKey = String(badgeKey || category || "impact")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 14);

  const suffix = String(Date.now()).slice(-6);
  const name = `TT-${shortKey || "impact"}-${suffix}`;

  // Optional debug:
  // console.log("NFT NAME:", name, "bytes:", Buffer.byteLength(name, "utf8"));

  const metaDescriptionParts = [];
  if (summary) metaDescriptionParts.push(summary);
  if (description && description.trim()) metaDescriptionParts.push(`User note: ${description.trim()}`);
  const metaDescription = metaDescriptionParts.join("\n\n") || "AI-verified sustainable action certificate.";

  const attributes = [
    { trait_type: "category", value: category || "Unknown" },
    ...(badgeKey ? [{ trait_type: "badge", value: String(badgeKey) }] : []),
    { trait_type: "timestamp", value: timestamp || new Date().toISOString() },
    { trait_type: "confidence", value: String(confidence) },
    { trait_type: "image_type", value: usedBadge ? "badge" : "proof" },
  ];

  const files = [{ uri: imageUri, type: nftImageMime }];

  if (proofImageUri) {
    files.push({ uri: proofImageUri, type: mimeType || "image/jpeg" });
  }

  const { uri: metadataUri } = await metaplex.nfts().uploadMetadata({
    name,
    description: metaDescription,
    image: imageUri,
    attributes,
    properties: {
      files,
      category: "image",
      // Custom fields are OK; many viewers ignore them but they can be useful
      proofImage: proofImageUri || undefined,
      badgeImagePath: badgeImagePath || undefined,
    },
  });

  // ----------------------------
  // 4) Mint NFT to recipient (or payer)
  // ----------------------------
  let tokenOwner = payer.publicKey;
  if (recipientWallet) {
    try {
      tokenOwner = new PublicKey(recipientWallet);
    } catch {
      // ignore invalid recipient, keep payer
    }
  }

  const { nft, response } = await metaplex.nfts().create({
    uri: metadataUri,
    name,
    sellerFeeBasisPoints: 0,
    symbol: "POI",
    tokenOwner,
    isMutable: false,
  });

  const signature = response && response.signature ? response.signature : null;

  return {
    mintAddress: nft.address.toBase58(),
    tokenOwner: tokenOwner.toBase58(),
    signature,
    txUrl: signature ? explorerTxUrl(signature) : null,
    nftUrl: explorerAddressUrl(nft.address.toBase58()),
    metadataUri,

    // Important URIs
    imageUri, // THIS is the NFT art (badge if usedBadge==true)
    proofImageUri, // optional proof file

    // echo metadata fields
    summary,
    category,
    badgeKey: badgeKey || null,
    badgeImagePath: badgeImagePath || null,
    confidence,
    timestamp,
  };
}

module.exports = { mintImpactNft };