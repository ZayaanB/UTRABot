import os
import json
import time
import queue
import threading
import serial
from dotenv import load_dotenv

from decision_gemini import init_gemini, gemini_decide
from solana_memo import solana_client, load_keypair, send_memo, canonical_hash
from db_snowflake import sf_connect, sf_init, sf_insert_batch
from pymongo import MongoClient

# ------------------ Utilities ------------------
def now_epoch():
    return time.time()

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def parse_sensor_line(line: str) -> dict | None:
    try:
        d = json.loads(line)
        if "t_ms" in d:
            return d
    except Exception:
        return None
    return None

# ------------------ Low-level control (fallback & actuation) ------------------
def pwm_from_action(action: str, sensors: dict) -> tuple[int, int]:
    """
    Convert high-level action into left/right PWM.
    This is intentionally simple; you’ll tune it on the track.
    """
    dist = sensors.get("dist_cm", 999)
    irL = sensors.get("irL", 0)
    irR = sensors.get("irR", 0)

    # Obstacle emergency
    if dist < 12 and action not in ("AVOID_OBSTACLE", "STOP"):
        action = "AVOID_OBSTACLE"

    base = 150
    turn = 120

    if action == "STOP":
        return 0, 0
    if action == "TURN_LEFT":
        return -turn, turn
    if action == "TURN_RIGHT":
        return turn, -turn
    if action == "AVOID_OBSTACLE":
        # back + turn
        return -160, -80
    if action in ("FOLLOW_LINE", "GO_TO_RED_PATH", "GO_TO_GREEN_PATH"):
        # crude proportional line-follow using difference
        err = (irR - irL)
        k = 0.15
        delta = int(clamp(k * err, -120, 120))
        left = base - delta
        right = base + delta
        return int(clamp(left, -255, 255)), int(clamp(right, -255, 255))

    # default
    return base, base

# ------------------ Course logic (high-level FSM) ------------------
class CourseFSM:
    """
    Based on your PDF description:
    - Begin: pick up box near blue circles, carry to blue circle on red or green path to unlock. :contentReference[oaicite:2]{index=2}
    - Red path = obstacle course; avoid obstacles and finish quickly. :contentReference[oaicite:3]{index=3}
    - Green path = target shooting route. :contentReference[oaicite:4]{index=4}
    """
    def __init__(self, prefer_path: str = "RED"):
        self.stage = "START"
        self.prefer_path = prefer_path  # "RED" or "GREEN"
        self.last_action = "STOP"

        # simple odometry placeholders (you can upgrade later)
        self.x = 0.0
        self.y = 0.0
        self.heading_deg = 0.0

    def update_odometry_stub(self, left_pwm: int, right_pwm: int, dt: float):
        # Placeholder: real odometry requires wheel encoders (not in kit).
        # Keep x,y stable or approximate; still useful as "state".
        v = (left_pwm + right_pwm) / 2.0
        self.x += 0.0005 * v * dt
        self.y += 0.0

    def next_context(self) -> dict:
        return {
            "stage": self.stage,
            "prefer_path": self.prefer_path,
            "goal": self.goal_text(),
        }

    def goal_text(self) -> str:
        if self.stage == "START":
            return "Pick up the box at start area."
        if self.stage == "PICKED_BOX":
            return f"Carry box to unlock {self.prefer_path} path."
        if self.stage == "ON_PATH":
            return f"Navigate {self.prefer_path} section safely and quickly."
        if self.stage == "FINISH":
            return "Return to starting position and stop."
        return "Continue."

    def transition(self, action: str, sensors: dict):
        # VERY simple transitions; tune as you add color-detection cues.
        if self.stage == "START" and action == "PICKUP_BOX":
            self.stage = "PICKED_BOX"
        elif self.stage == "PICKED_BOX" and action == "DROP_BOX":
            self.stage = "ON_PATH"
        elif self.stage == "ON_PATH":
            # You can use color markers to detect finish; placeholder:
            pass

# ------------------ Serial IO thread ------------------
def sensor_reader(port: str, baud: int, out_q: queue.Queue):
    ser = serial.Serial(port, baud, timeout=1)
    while True:
        line = ser.readline().decode("utf-8", errors="replace").strip()
        if not line:
            continue
        d = parse_sensor_line(line)
        if d:
            out_q.put((d, ser))

# ------------------ Mongo helpers (inline minimal) ------------------
def mongo_cols():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    dbname = os.getenv("MONGO_DB", "robotdb")
    client = MongoClient(uri)
    db = client[dbname]
    return db["live_state"], db["sensor_logs"], db["decisions"]

def update_live(live_col, robot_id, doc):
    doc = dict(doc)
    doc["robot_id"] = robot_id
    doc["updated_at"] = now_epoch()
    live_col.update_one({"robot_id": robot_id}, {"$set": doc}, upsert=True)

# ------------------ Main ------------------
def main():
    load_dotenv()

    robot_id = os.getenv("ROBOT_ID", "robot_01")
    mission_id = os.getenv("MISSION_ID", f"mission_{int(time.time())}")

    port = os.getenv("SERIAL_PORT")
    baud = int(os.getenv("SERIAL_BAUD", "115200"))
    if not port:
        raise RuntimeError("SERIAL_PORT not set")

    # Init services
    live_col, logs_col, decisions_col = mongo_cols()

    gem_model = init_gemini()
    sf_conn = sf_connect()
    sf_init(sf_conn)

    sol_client = solana_client()
    sol_kp = load_keypair()

    # Course FSM
    prefer = os.getenv("PREFER_PATH", "RED").upper()
    fsm = CourseFSM(prefer_path=prefer)

    # Start sensor reader thread
    q = queue.Queue()
    t = threading.Thread(target=sensor_reader, args=(port, baud, q), daemon=True)
    t.start()

    # Batch buffer for Snowflake
    sf_buffer = []
    last_sf_flush = time.time()

    last_t_ms = None
    last_epoch = time.time()

    print("Controller running. Press Ctrl+C to stop.")

    while True:
        sensors, ser = q.get()

        # --- compute dt for stub odometry ---
        t_ms = int(sensors.get("t_ms", 0))
        if last_t_ms is None:
            dt = 0.05
        else:
            dt = max(0.01, (t_ms - last_t_ms) / 1000.0)
        last_t_ms = t_ms

        # --- build robot state ---
        rgb = sensors.get("rgb", [0, 0, 0])
        bat_v = float(sensors.get("bat_v", 0.0))
        dist_cm = float(sensors.get("dist_cm", 999))

        state = {
            "stage": fsm.stage,
            "x": fsm.x,
            "y": fsm.y,
            "heading_deg": fsm.heading_deg,
            "battery_v": bat_v,
            "current_color": rgb,
        }

        # --- log raw sensor to Mongo ---
        sensors_doc = dict(sensors)
        sensors_doc["robot_id"] = robot_id
        sensors_doc["mission_id"] = mission_id
        sensors_doc["ts_epoch"] = now_epoch()
        logs_col.insert_one(sensors_doc)

        # --- Decide action (Gemini with fallback) ---
        context = fsm.next_context()

        decision = None
        decision_latency_ms = None

        # Hard safety rule: battery low => STOP (set your cutoff)
        if bat_v > 0 and bat_v < 6.8:
            decision = {"action": "STOP", "reason": "Battery low", "confidence": 1.0}
            decision_latency_ms = 0
        else:
            try:
                decision, decision_latency_ms = gemini_decide(
                    gem_model,
                    state=state,
                    sensors=sensors,
                    context=context,
                )
            except Exception as e:
                # fallback
                decision = {"action": "FOLLOW_LINE", "reason": f"fallback: {e}", "confidence": 0.3}
                decision_latency_ms = 0

        action = decision["action"]

        # --- Course transitions for discrete actions ---
        fsm.transition(action, sensors)

        # --- Convert action -> motor PWM, and send to Arduino ---
        left_pwm, right_pwm = pwm_from_action(action, sensors)
        fsm.update_odometry_stub(left_pwm, right_pwm, dt)

        ser.write((json.dumps({"cmd": "drive", "left": left_pwm, "right": right_pwm}) + "\n").encode("utf-8"))

        # If action triggers a servo “macro”, send it too
        if action in ("PICKUP_BOX", "DROP_BOX", "SHOOT", "STOP"):
            ser.write((json.dumps({"cmd": "action", "name": action}) + "\n").encode("utf-8"))

        # --- Hash sensor+action and send Solana memo ---
        h = canonical_hash(sensors, action)
        memo = f"{robot_id}|{mission_id}|t_ms={t_ms}|hash={h}|action={action}"
        try:
            txsig = send_memo(sol_client, sol_kp, memo)
        except Exception as e:
            txsig = f"ERROR:{e}"

        # --- Log decision to Mongo ---
        decision_doc = {
            "robot_id": robot_id,
            "mission_id": mission_id,
            "ts_epoch": now_epoch(),
            "t_ms": t_ms,
            "action": action,
            "confidence": float(decision.get("confidence", 0.5)),
            "reason": decision.get("reason", ""),
            "decision_latency_ms": int(decision_latency_ms or 0),
            "hash": h,
            "solana_sig": txsig,
        }
        decisions_col.insert_one(decision_doc)

        # --- Update live state in Mongo ---
        live_doc = {
            "mission_id": mission_id,
            "stage": fsm.stage,
            "x": fsm.x,
            "y": fsm.y,
            "heading_deg": fsm.heading_deg,
            "battery_v": bat_v,
            "current_color": rgb,
            "last_action": action,
            "last_hash": h,
            "last_solana_sig": txsig,
            "dist_cm": dist_cm,
        }
        update_live(live_col, robot_id, live_doc)

        # --- Buffer to Snowflake ---
        sf_buffer.append({
            "robot_id": robot_id,
            "mission_id": mission_id,
            "ts_epoch": int(now_epoch()),
            "t_ms": t_ms,
            "irL": int(sensors.get("irL", 0)),
            "irR": int(sensors.get("irR", 0)),
            "dist_cm": int(sensors.get("dist_cm", 999)),
            "bat_v": float(sensors.get("bat_v", 0.0)),
            "rgb_r": int(rgb[0]) if len(rgb) > 0 else 0,
            "rgb_g": int(rgb[1]) if len(rgb) > 1 else 0,
            "rgb_b": int(rgb[2]) if len(rgb) > 2 else 0,
            "action": action,
            "confidence": float(decision.get("confidence", 0.5)),
            "decision_latency_ms": int(decision_latency_ms or 0),
            "hash": h,
        })

        # Flush every ~5s or 200 rows
        if (time.time() - last_sf_flush) > 5 or len(sf_buffer) >= 200:
            try:
                sf_insert_batch(sf_conn, sf_buffer)
                sf_buffer = []
                last_sf_flush = time.time()
            except Exception as e:
                # keep buffer; don’t crash the run
                print("Snowflake flush error:", e)

        # Debug print
        print(f"[{fsm.stage}] action={action} pwm=({left_pwm},{right_pwm}) dist={dist_cm} bat={bat_v:.2f} hash={h[:10]}.. sol={str(txsig)[:18]}")

if __name__ == "__main__":
    main()
