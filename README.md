# 🏂 BiathlonBot (UTRA Hacks)

A Winter-Olympics-inspired robot for the UTRA Hacks course: **follow the track, pick up & drop boxes to unlock sections, run the obstacle course (red) and/or reach the target (green) and shoot the ball**, while streaming telemetry + AI decisions to a modern data/AI stack.

This repo includes:
- **Arduino firmware** (robot): sensors → JSON telemetry; serial commands → motors/servos
- **Python “edge brain”** (laptop): reads telemetry, decides actions with **Gemini**, logs to **MongoDB Atlas**, batches analytics to **Snowflake**, and anchors each decision on **Solana** with a Memo hash.

---

## 🏆 Sponsor Award Alignment (Winning all 4)

### ✅ Best Use of Gemini API (Google Cloud)
- Gemini selects **high-level actions** from a strict allowlist (e.g., `FOLLOW_LINE`, `TURN_LEFT`, `PICKUP_BOX`, `SHOOT`) for safe, judge-friendly autonomy.
- Rule-based safety overrides still apply (battery low → STOP, obstacle too close → AVOID/STOP).

### ✅ Best Use of MongoDB Atlas
MongoDB stores:
- `live_state` → real-time current robot state (for dashboards/debug)
- `sensor_logs` → raw sensor telemetry over time
- `decisions` → action, confidence, reason, latency, and Solana tx signature

### ✅ Best Use of Snowflake API
Snowflake stores long-term analytics in `ROBOT_LOGS` (sensor + action + battery + latency + hash) enabling post-run analysis like:
- line-follow accuracy vs battery voltage
- obstacle frequency vs decision latency
- action distribution across stages

### ✅ Best Use of Solana
Every decision is “receipt-ed” to **Solana Devnet** using the Memo program:
- Compute `sha256(canonical(sensor_json + action))`
- Send memo: `robot_id|mission_id|t_ms|hash|action`
- Store tx signature back into MongoDB for easy audit

---

## 🧠 Course Mapping (What the Robot Does)

The course requires:
- **Pick up a box/battery at the start**
- **Drop it in a blue circle on the red or green path** to unlock that section
- **Red path:** obstacle course (speed + avoiding obstructions)
- **Green path:** ramp → target rings → reach center → shoot ball
- Return to start to finish

We cover this with:
- **Perception:** IR line sensors, ultrasonic distance, color sensor RGB, battery voltage
- **Reasoning:** FSM + Gemini action selection with rule-based fallback
- **Actuation:** 2 DC motors + claw servo + launcher servo

---
