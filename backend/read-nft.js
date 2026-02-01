import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

const CLUSTER = process.env.CLUSTER || "devnet";
const RPC =
  CLUSTER === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";

const connection = new Connection(RPC, "confirmed");
const metaplex = Metaplex.make(connection);

async function run() {
  const mint = new PublicKey("3HcXVB1dVHMfb76AXKz76t53qrgoUueMf1NhnxH6rkRk");

  const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

  console.log("Name:", nft.name);
  console.log("Metadata URI:", nft.uri);

  const res = await fetch(nft.uri);
  const json = await res.json();

  console.log("Image URL:", json.image);
}

run().catch(console.error);