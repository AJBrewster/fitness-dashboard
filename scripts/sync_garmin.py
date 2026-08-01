#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["garminconnect>=0.3.2,<0.4"]
# ///
"""Pull recent Garmin data into a local SQLite store, then materialize the
current accumulated view back out to src/data/*.local.json — the same
gitignored paths lib/data.js already knows how to fall back to.

The SQLite file (scripts/garmin.local.db) is the durable, cumulative store:
every run upserts by natural key (activity id / calendar date), so history
keeps growing across runs instead of each pull overwriting the last one.
The .local.json files are just the current materialized view of it — the
running app never talks to SQLite directly.

Run manually:
    uv run scripts/sync_garmin.py

Scheduled via macOS launchd — see scripts/launchd/README.md.

Auth reuses the same ~/.garminconnect OAuth token cache already used by the
`garmin` MCP server (~/garmin_mcp) — no separate credentials, no new secret
storage. See PLAN.md's Data strategy for the re-auth command if this errors
out with an authentication failure (tokens last ~6 months).
"""

import json
import logging
import os
import sqlite3
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from garminconnect import Garmin, GarminConnectAuthenticationError

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DB_PATH = SCRIPT_DIR / "garmin.local.db"
LOG_PATH = SCRIPT_DIR / "sync.log"
DATA_DIR = REPO_ROOT / "src" / "data"
TOKEN_PATH = os.path.expanduser(os.getenv("GARMINTOKENS", "~/.garminconnect"))

ACTIVITY_WINDOW_DAYS = 14
WELLNESS_WINDOW_DAYS = 14
# vo2 max / weigh-ins change slowly; a wide trailing window is still cheap
# and keeps a missed run or two from ever losing data.
LONG_WINDOW_DAYS = 90

TYPE_LABELS = {
    "running": "Run",
    "walking": "Walk",
    "strength_training": "Strength Training",
    "virtual_ride": "Ride",
    "ultimate_disc": "Ultimate Disc",
    "treadmill_running": "Treadmill Run",
    "stand_up_paddleboarding_v2": "Paddleboarding",
}

# Privacy pass — mirrors the manual one applied to the original one-time
# snapshot (see PLAN.md's Data strategy): real place/route names never
# survive into the .local.json files. Only a small, known set of generic
# workout descriptors is kept; anything else not on this list is discarded
# in favor of just the activity type's generic label.
DESCRIPTOR_ALLOW_LIST = [
    "speed repeats", "tempo", "easy", "base", "tired", "long", "recovery",
    "intervals", "hills", "race",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler(LOG_PATH), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("sync_garmin")


def genericize_name(raw_name, type_key):
    base = TYPE_LABELS.get(type_key, (type_key or "activity").replace("_", " ").title())
    if not raw_name:
        return base
    lowered = raw_name.lower()
    for descriptor in DESCRIPTOR_ALLOW_LIST:
        if descriptor in lowered:
            return f"{base} - {descriptor.title()}"
    return base


def connect():
    client = Garmin()
    client.login(TOKEN_PATH)
    return client


def init_db(conn):
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY,
            name TEXT,
            type TEXT,
            start_time TEXT,
            distance_meters REAL,
            duration_seconds REAL,
            calories REAL,
            avg_hr_bpm REAL,
            synced_at TEXT
        );
        CREATE TABLE IF NOT EXISTS wellness_daily (
            date TEXT PRIMARY KEY,
            sleep_score REAL,
            resting_heart_rate_bpm REAL,
            avg_heart_rate_bpm REAL,
            max_heart_rate_bpm REAL,
            avg_stress_level REAL,
            max_stress_level REAL,
            body_battery_charged REAL,
            body_battery_drained REAL,
            training_readiness_score REAL,
            training_status TEXT,
            vo2_max REAL,
            synced_at TEXT
        );
        CREATE TABLE IF NOT EXISTS vo2max_trend (
            date TEXT PRIMARY KEY,
            vo2_max REAL,
            synced_at TEXT
        );
        CREATE TABLE IF NOT EXISTS weigh_ins (
            date TEXT PRIMARY KEY,
            weight_kg REAL,
            synced_at TEXT
        );
        CREATE TABLE IF NOT EXISTS sync_state (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        """
    )


def get_sync_state(conn, key):
    row = conn.execute("SELECT value FROM sync_state WHERE key = ?", (key,)).fetchone()
    return row[0] if row else None


def set_sync_state(conn, key, value):
    conn.execute(
        """INSERT INTO sync_state (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
        (key, value),
    )


def sync_activities(client, conn, now_iso):
    start_date = (date.today() - timedelta(days=ACTIVITY_WINDOW_DAYS)).isoformat()
    pulled = 0
    # Newest-first; 100 comfortably covers a 14-day window for a recreational
    # athlete without paginating.
    for a in client.get_activities(0, 100) or []:
        start_time = a.get("startTimeLocal")
        if not start_time or start_time[:10] < start_date:
            continue
        type_key = (a.get("activityType") or {}).get("typeKey")
        conn.execute(
            """INSERT INTO activities (id, name, type, start_time, distance_meters,
                   duration_seconds, calories, avg_hr_bpm, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                   name=excluded.name, type=excluded.type, start_time=excluded.start_time,
                   distance_meters=excluded.distance_meters,
                   duration_seconds=excluded.duration_seconds,
                   calories=excluded.calories, avg_hr_bpm=excluded.avg_hr_bpm,
                   synced_at=excluded.synced_at""",
            (
                a.get("activityId"),
                genericize_name(a.get("activityName"), type_key),
                type_key,
                start_time,
                a.get("distance"),
                a.get("duration"),
                a.get("calories"),
                a.get("averageHR"),
                now_iso,
            ),
        )
        pulled += 1
    log.info("activities: upserted %d (window: last %d days)", pulled, ACTIVITY_WINDOW_DAYS)


def sync_wellness(client, conn, now_iso):
    synced = 0
    for offset in range(WELLNESS_WINDOW_DAYS):
        d = (date.today() - timedelta(days=offset)).isoformat()
        try:
            sleep = client.get_sleep_data(d) or {}
            stress = client.get_stress_data(d) or {}
            rhr = client.get_rhr_day(d) or {}
            hr = client.get_heart_rates(d) or {}
            readiness_list = client.get_training_readiness(d) or []
            status = client.get_training_status(d) or {}
        except Exception:
            log.exception("wellness pull failed for %s, skipping", d)
            continue

        daily_sleep = sleep.get("dailySleepDTO") or {}
        sleep_score = ((daily_sleep.get("sleepScores") or {}).get("overall") or {}).get("value")
        readiness = readiness_list[0] if readiness_list else {}
        recent_status = status.get("mostRecentTrainingStatus") or {}
        latest_data = recent_status.get("latestTrainingStatusData") or {}
        device_data = next(iter(latest_data.values()), {})
        vo2_generic = (status.get("mostRecentVO2Max") or {}).get("generic") or {}

        hr_values = [v[1] for v in (hr.get("heartRateValues") or []) if v and v[1]]
        avg_hr = round(sum(hr_values) / len(hr_values), 1) if hr_values else None

        has_any_data = any([
            sleep_score, stress.get("avgStressLevel"), readiness.get("score"),
            device_data.get("trainingStatusFeedbackPhrase"),
        ])
        if not has_any_data:
            continue  # e.g. today, before the watch has synced anything yet

        conn.execute(
            """INSERT INTO wellness_daily (date, sleep_score, resting_heart_rate_bpm,
                   avg_heart_rate_bpm, max_heart_rate_bpm, avg_stress_level,
                   max_stress_level, body_battery_charged, body_battery_drained,
                   training_readiness_score, training_status, vo2_max, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(date) DO UPDATE SET
                   sleep_score=excluded.sleep_score,
                   resting_heart_rate_bpm=excluded.resting_heart_rate_bpm,
                   avg_heart_rate_bpm=excluded.avg_heart_rate_bpm,
                   max_heart_rate_bpm=excluded.max_heart_rate_bpm,
                   avg_stress_level=excluded.avg_stress_level,
                   max_stress_level=excluded.max_stress_level,
                   training_readiness_score=excluded.training_readiness_score,
                   training_status=excluded.training_status,
                   vo2_max=excluded.vo2_max,
                   synced_at=excluded.synced_at""",
            (
                d,
                sleep_score,
                rhr.get("restingHeartRate") or daily_sleep.get("restingHeartRate"),
                avg_hr,
                hr.get("maxHeartRate"),
                stress.get("avgStressLevel"),
                stress.get("maxStressLevel"),
                None,  # body battery charged/drained — filled in by sync_body_battery
                None,
                readiness.get("score"),
                device_data.get("trainingStatusFeedbackPhrase"),
                vo2_generic.get("vo2MaxValue"),
                now_iso,
            ),
        )
        synced += 1
    log.info("wellness: upserted %d of last %d days", synced, WELLNESS_WINDOW_DAYS)


def sync_body_battery(client, conn, now_iso):
    start = (date.today() - timedelta(days=WELLNESS_WINDOW_DAYS)).isoformat()
    end = date.today().isoformat()
    merged = 0
    for day in client.get_body_battery(start, end) or []:
        d = day.get("date")
        if not d:
            continue
        cur = conn.execute(
            "UPDATE wellness_daily SET body_battery_charged = ?, body_battery_drained = ?, "
            "synced_at = ? WHERE date = ?",
            (day.get("charged"), day.get("drained"), now_iso, d),
        )
        merged += cur.rowcount
    log.info("body battery: merged into %d existing wellness_daily rows", merged)


VO2MAX_REFRESH_RECENT_DAYS = 2  # always re-check the last couple of days for late updates
VO2MAX_LAST_CHECKED_KEY = "vo2max_last_checked_date"


def sync_vo2max_trend(client, conn, now_iso):
    """Backfill the full window once, then only re-query since the last run.

    get_training_status is expensive per call (~15-20s observed) and VO2 max
    barely moves day to day, so re-scanning the full LONG_WINDOW_DAYS window
    on every run turned a "daily sync" into a ~20-30 minute one for no
    benefit. Because the dashboard only stores a *changed* value per day
    (see the dedup below), most checked days never produce a vo2max_trend
    row at all — so "is this date already in vo2max_trend" is NOT a valid
    "have I already checked this date" test. A separate sync_state
    high-water mark (the last date actually checked) is what makes repeat
    runs fast: only the days since that mark get queried, re-checking a
    small recent tail in case a day's value updates late.
    """
    end = date.today()
    window_start = end - timedelta(days=LONG_WINDOW_DAYS)

    last_checked = get_sync_state(conn, VO2MAX_LAST_CHECKED_KEY)
    if last_checked:
        start = max(
            window_start,
            date.fromisoformat(last_checked) - timedelta(days=VO2MAX_REFRESH_RECENT_DAYS - 1),
        )
    else:
        start = window_start  # first run ever: full backfill, unavoidable one-time cost

    # Seed dedup state from the latest point already stored before `start`,
    # so the "only insert on change" logic stays correct across the boundary.
    seed = conn.execute(
        "SELECT vo2_max FROM vo2max_trend WHERE date < ? ORDER BY date DESC LIMIT 1",
        (start.isoformat(),),
    ).fetchone()
    last_vo2 = seed[0] if seed else None

    current = start
    queried = 0
    points = 0
    while current <= end:
        d = current.isoformat()
        try:
            status = client.get_training_status(d) or {}
            queried += 1
        except Exception:
            current += timedelta(days=1)
            continue
        vo2 = ((status.get("mostRecentVO2Max") or {}).get("generic") or {}).get("vo2MaxValue")
        if vo2 is not None:
            vo2_rounded = round(vo2, 1)
            if vo2_rounded != last_vo2:  # dashboard shows a sparse trend, not every day
                conn.execute(
                    """INSERT INTO vo2max_trend (date, vo2_max, synced_at) VALUES (?, ?, ?)
                       ON CONFLICT(date) DO UPDATE SET
                           vo2_max=excluded.vo2_max, synced_at=excluded.synced_at""",
                    (d, vo2_rounded, now_iso),
                )
                last_vo2 = vo2_rounded
                points += 1
        current += timedelta(days=1)

    set_sync_state(conn, VO2MAX_LAST_CHECKED_KEY, end.isoformat())
    log.info(
        "vo2max trend: queried %d day(s) from %s onward, %d new/changed points",
        queried, start.isoformat(), points,
    )


def sync_weigh_ins(client, conn, now_iso):
    start = (date.today() - timedelta(days=LONG_WINDOW_DAYS)).isoformat()
    end = date.today().isoformat()
    data = client.get_weigh_ins(start, end) or {}
    synced = 0
    for day in data.get("dailyWeightSummaries") or []:
        for w in day.get("allWeightMetrics") or []:
            grams = w.get("weight")
            d = w.get("calendarDate")
            if grams is None or not d:
                continue
            conn.execute(
                """INSERT INTO weigh_ins (date, weight_kg, synced_at) VALUES (?, ?, ?)
                   ON CONFLICT(date) DO UPDATE SET
                       weight_kg=excluded.weight_kg, synced_at=excluded.synced_at""",
                (d, round(grams / 1000, 2), now_iso),
            )
            synced += 1
    log.info("weigh-ins: upserted %d over last %d days", synced, LONG_WINDOW_DAYS)


def materialize(conn):
    def rows(query):
        cur = conn.execute(query)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    activities = [
        {
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "startTime": r["start_time"],
            "distanceMeters": r["distance_meters"],
            "durationSeconds": r["duration_seconds"],
            "calories": r["calories"],
            "avgHrBpm": r["avg_hr_bpm"],
        }
        for r in rows("SELECT * FROM activities ORDER BY start_time")
    ]
    wellness = [
        {
            "date": r["date"],
            "sleepScore": r["sleep_score"],
            "restingHeartRateBpm": r["resting_heart_rate_bpm"],
            "avgHeartRateBpm": r["avg_heart_rate_bpm"],
            "maxHeartRateBpm": r["max_heart_rate_bpm"],
            "avgStressLevel": r["avg_stress_level"],
            "maxStressLevel": r["max_stress_level"],
            "bodyBatteryCharged": r["body_battery_charged"],
            "bodyBatteryDrained": r["body_battery_drained"],
            "trainingReadinessScore": r["training_readiness_score"],
            "trainingStatus": r["training_status"],
            "vo2Max": r["vo2_max"],
        }
        for r in rows("SELECT * FROM wellness_daily ORDER BY date")
    ]
    vo2max_trend = [
        {"date": r["date"], "vo2Max": r["vo2_max"]}
        for r in rows("SELECT * FROM vo2max_trend ORDER BY date")
    ]
    weigh_ins = [
        {"date": r["date"], "weightKg": r["weight_kg"]}
        for r in rows("SELECT * FROM weigh_ins ORDER BY date")
    ]

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "activities.local.json").write_text(json.dumps(activities, indent=2) + "\n")
    (DATA_DIR / "wellness.local.json").write_text(json.dumps(wellness, indent=2) + "\n")
    (DATA_DIR / "vo2MaxTrend.local.json").write_text(json.dumps(vo2max_trend, indent=2) + "\n")
    (DATA_DIR / "weighIns.local.json").write_text(json.dumps(weigh_ins, indent=2) + "\n")
    log.info(
        "materialized %d activities, %d wellness days, %d vo2max points, %d weigh-ins",
        len(activities), len(wellness), len(vo2max_trend), len(weigh_ins),
    )


def main():
    log.info("sync starting")
    try:
        client = connect()
    except GarminConnectAuthenticationError:
        log.error(
            "Garmin auth token expired or invalid at %s — re-auth required "
            "(see PLAN.md's Data strategy for the re-auth command)",
            TOKEN_PATH,
        )
        sys.exit(1)
    except Exception:
        log.exception("failed to connect to Garmin")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    try:
        init_db(conn)
        now_iso = datetime.now().isoformat()
        sync_activities(client, conn, now_iso)
        sync_wellness(client, conn, now_iso)
        sync_body_battery(client, conn, now_iso)
        sync_vo2max_trend(client, conn, now_iso)
        sync_weigh_ins(client, conn, now_iso)
        conn.commit()
        materialize(conn)
    finally:
        conn.close()
    log.info("sync complete")


if __name__ == "__main__":
    main()
