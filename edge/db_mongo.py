import time
from pymongo import MongoClient, ASCENDING

def mongo_connect():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    dbname = os.getenv("MONGO_DB", "robotdb")
    client = MongoClient(uri)
    db = client[dbname]
    # Collections
    live = db["live_state"]
    logs = db["sensor_logs"]
    decisions = db["decisions"]

    logs.create_index([("robot_id", ASCENDING), ("t_ms", ASCENDING)])
    decisions.create_index([("robot_id", ASCENDING), ("t_ms", ASCENDING)])
    return db, live, logs, decisions

def update_live_state(live_col, robot_id: str, state: dict):
    doc = dict(state)
    doc["robot_id"] = robot_id
    doc["updated_at"] = time.time()
    live_col.update_one({"robot_id": robot_id}, {"$set": doc}, upsert=True)

def insert_sensor_log(logs_col, robot_id: str, mission_id: str, sensors: dict):
    doc = dict(sensors)
    doc["robot_id"] = robot_id
    doc["mission_id"] = mission_id
    logs_col.insert_one(doc)

def insert_decision(decisions_col, robot_id: str, mission_id: str, decision: dict):
    doc = dict(decision)
    doc["robot_id"] = robot_id
    doc["mission_id"] = mission_id
    decisions_col.insert_one(doc)
