import os
import time
import snowflake.connector

DDL = """
CREATE TABLE IF NOT EXISTS ROBOT_LOGS (
  ROBOT_ID STRING,
  MISSION_ID STRING,
  TS_EPOCH NUMBER,
  T_MS NUMBER,
  IRL NUMBER,
  IRR NUMBER,
  DIST_CM NUMBER,
  BAT_V FLOAT,
  RGB_R NUMBER,
  RGB_G NUMBER,
  RGB_B NUMBER,
  ACTION STRING,
  CONFIDENCE FLOAT,
  DECISION_LATENCY_MS NUMBER,
  SENSOR_ACTION_HASH STRING
);
"""

def sf_connect():
    return snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
        database=os.getenv("SNOWFLAKE_DATABASE"),
        schema=os.getenv("SNOWFLAKE_SCHEMA"),
    )

def sf_init(conn):
    cur = conn.cursor()
    cur.execute(DDL)
    cur.close()

def sf_insert_batch(conn, rows: list[dict]):
    if not rows:
        return
    cur = conn.cursor()
    sql = """
    INSERT INTO ROBOT_LOGS (
      ROBOT_ID, MISSION_ID, TS_EPOCH, T_MS, IRL, IRR, DIST_CM, BAT_V,
      RGB_R, RGB_G, RGB_B, ACTION, CONFIDENCE, DECISION_LATENCY_MS, SENSOR_ACTION_HASH
    )
    VALUES (%(robot_id)s, %(mission_id)s, %(ts_epoch)s, %(t_ms)s, %(irL)s, %(irR)s, %(dist_cm)s, %(bat_v)s,
            %(rgb_r)s, %(rgb_g)s, %(rgb_b)s, %(action)s, %(confidence)s, %(decision_latency_ms)s, %(hash)s)
    """
    cur.executemany(sql, rows)
    cur.close()

EXAMPLE_ANALYTICS_QUERY = """
-- Proxy "IR accuracy": lower |irL-irR| means more centered on line.
SELECT
  MISSION_ID,
  ROUND(BAT_V, 2) AS BAT_BIN,
  AVG(ABS(IRL - IRR)) AS AVG_LINE_ERROR,
  COUNT(*) AS N
FROM ROBOT_LOGS
GROUP BY MISSION_ID, BAT_BIN
ORDER BY MISSION_ID, BAT_BIN;
"""
