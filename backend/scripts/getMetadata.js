require("dotenv").config();
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { Metaplex } = require("@metaplex-foundation/js");

(async () => {
  const mint = new PublicKey("8nYyv75KfgqjT9pp2skXvgUdEtSr6vgBaEeApG4FUAg6");

  const rpc = process.env.SOLANA_RPC || clusterApiUrl("devnet");
  const connection = new Connection(rpc, "confirmed");
  const metaplex = Metaplex.make(connection);

  const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

  console.log("Name:", nft.name);
  console.log("Metadata URI:", nft.uri);

  const meta = await (await fetch(nft.uri)).json();
  console.log("Image URL:", meta.image);
})();