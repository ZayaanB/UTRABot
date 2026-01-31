import json
import os
import hashlib
from solana.rpc.api import Client
from solana.transaction import Transaction
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction

MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

def canonical_hash(sensor_data: dict, action: str) -> str:
    payload = {
        "sensor": sensor_data,
        "action": action,
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()

def solana_client():
    rpc = os.getenv("SOLANA_RPC", "https://api.devnet.solana.com")
    return Client(rpc)

def load_keypair() -> Keypair:
    kp_json = os.getenv("SOLANA_KEYPAIR_JSON")
    if not kp_json:
        raise RuntimeError("Missing SOLANA_KEYPAIR_JSON (Solana CLI id.json as JSON array)")
    secret = json.loads(kp_json)
    return Keypair.from_bytes(bytes(secret))

def send_memo(sig_client: Client, keypair: Keypair, memo_text: str) -> str:
    memo_pid = Pubkey.from_string(MEMO_PROGRAM_ID)
    ix = Instruction(program_id=memo_pid, data=memo_text.encode("utf-8"), accounts=[])
    tx = Transaction().add(ix)
    resp = sig_client.send_transaction(tx, keypair)
    if isinstance(resp, dict):
        return resp.get("result", str(resp))
    return str(resp)
