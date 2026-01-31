import json
import os
import time
import google.generativeai as genai

ALLOWED_ACTIONS = [
    "STOP",
    "FOLLOW_LINE",
    "TURN_LEFT",
    "TURN_RIGHT",
    "AVOID_OBSTACLE",
    "PICKUP_BOX",
    "DROP_BOX",
    "SHOOT",
    "GO_TO_RED_PATH",
    "GO_TO_GREEN_PATH",
]

def init_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    return genai.GenerativeModel(model)

def gemini_decide(model, state: dict, sensors: dict, context: dict) -> tuple[dict, int]:
    """
    Returns (decision_json, latency_ms)
    decision_json schema:
      {"action": <one of ALLOWED_ACTIONS>, "reason": "...", "confidence": 0..1}
    """
    prompt = {
        "task": "You are the robot decision module. Choose ONE next action only.",
        "allowed_actions": ALLOWED_ACTIONS,
        "rules": [
            "Return ONLY valid JSON, no markdown.",
            "If obstacle is very close (dist_cm < 12), choose AVOID_OBSTACLE or STOP.",
            "If battery is dangerously low, STOP.",
            "Prefer stable progress: FOLLOW_LINE unless a turn or obstacle is needed.",
        ],
        "robot_state": state,
        "sensors": sensors,
        "course_context": context,
        "output_schema": {"action": "string", "reason": "string", "confidence": "number"},
    }

    t0 = time.time()
    resp = model.generate_content(json.dumps(prompt))
    latency_ms = int((time.time() - t0) * 1000)

    raw = (resp.text or "").strip()
    decision = json.loads(raw)

    if decision.get("action") not in ALLOWED_ACTIONS:
        raise ValueError(f"Invalid action from Gemini: {decision.get('action')}")
    decision["confidence"] = float(decision.get("confidence", 0.5))
    return decision, latency_ms
