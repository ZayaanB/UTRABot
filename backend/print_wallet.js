require("dotenv").config();
const { Keypair } = require("@solana/web3.js");

function loadKeypairFromEnv() {
  const json = process.env.SOLANA_SECRET_KEY_JSON;
  if (!json) throw new Error("SOLANA_SECRET_KEY_JSON is missing");

  const secret = Uint8Array.from(JSON.parse(json));
  return Keypair.fromSecretKey(secret);
}

const kp = loadKeypairFromEnv();
console.log("PAYER ADDRESS FROM .env:", kp.publicKey.toBase58());