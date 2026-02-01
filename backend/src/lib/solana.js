const bs58 = require("bs58");
const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const {
  Metaplex,
  keypairIdentity,
  irysStorage,
  toMetaplexFile
} = require("@metaplex-foundation/js");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

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

async function mintImpactNft({
  imageBuffer,
  mimeType,
  originalName,
  summary,
  category,
  confidence,
  timestamp,
  recipientWallet
}) {
  const rpc = process.env.SOLANA_RPC || clusterApiUrl("devnet");
  const connection = new Connection(rpc, "confirmed");
  const payer = loadKeypair();

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(
      irysStorage({
        address: process.env.IRYS_ADDRESS || "https://devnet.irys.xyz",
        providerUrl: rpc,
        timeout: 60000
      })
    );

  // Upload image to Irys/Arweave
  const file = toMetaplexFile(imageBuffer, originalName || "impact.jpg", {
    contentType: mimeType || "image/jpeg"
  });

  // Optional: try to auto-fund storage (best-effort; harmless if unsupported)
  try {
    const driver = metaplex.storage().driver();
    if (driver && typeof driver.fund === "function") {
      await driver.fund([file]);
    }
  } catch (_) {
    // ignore funding attempts; user can airdrop more SOL if needed
  }

  const imageUri = await metaplex.storage().upload(file);

  // Upload metadata JSON
  const name = `Proof of Impact #${Date.now()}`;
  const { uri: metadataUri } = await metaplex.nfts().uploadMetadata({
    name,
    description: summary,
    image: imageUri,
    attributes: [
      { trait_type: "category", value: category },
      { trait_type: "timestamp", value: timestamp },
      { trait_type: "confidence", value: String(confidence) }
    ],
    properties: {
      files: [{ uri: imageUri, type: mimeType || "image/jpeg" }],
      category: "image"
    }
  });

  // Mint NFT
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
    isMutable: false
  });

  const signature = response && response.signature ? response.signature : null;

  return {
    mintAddress: nft.address.toBase58(),
    tokenOwner: tokenOwner.toBase58(),
    signature,
    txUrl: signature ? explorerTxUrl(signature) : null,
    nftUrl: explorerAddressUrl(nft.address.toBase58()),
    metadataUri,
    imageUri,
    summary,
    category,
    confidence,
    timestamp
  };
}

module.exports = { mintImpactNft };
