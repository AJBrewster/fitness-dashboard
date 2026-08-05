#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Import a Golf Pad CSV export into src/data/golfRounds.local.json.

Golf Pad has no public API. There is no developer portal, no documented
integration path, and no community-maintained client of the sort
`garminconnect` provides for Garmin. The web dashboard is a login-gated SPA
whose internal endpoints could be reverse-engineered, but that path was
rejected deliberately: undocumented, unversioned, breaks without notice, and
would need scraped session cookies. See PLAN.md's Data strategy.

The supported route is the CSV export: in the Golf Pad phone app, Settings ->
Data Export, which emails a download link valid for three days. Run this
script against the downloaded file.

    uv run scripts/import_golfpad.py ~/Downloads/golfpad_export.csv --dry-run
    uv run scripts/import_golfpad.py ~/Downloads/golfpad_export.csv

WHY NO SQLITE, unlike scripts/sync_garmin.py: that script pulls incremental
trailing windows from an API, so it needs a cumulative store or history falls
off the back. This export is a full dump of every round, every time — there
is nothing to accumulate, so the JSON file is the store and this script is a
merge, not a sync.

WHAT THIS IMPORT CANNOT GIVE YOU: the free Golf Pad tier exports "rounds
only" — one row per round. Per-hole rows (and shot rows carrying Golf Pad's
own Strokes Gained) are in the "comprehensive" export, which needs Premium.
So imported rounds land in the summary-only shape and the app's per-hole
panels stand down for them; see src/lib/golf.js and PanelUnavailable.jsx.

PRIVACY: the player-name column is dropped on read — it isn't needed and
nothing should carry it. Course names are kept as-is, which is a deliberate
documented exception to PLAN.md's genericization rule (the file is
gitignored, so real names never leave this machine).
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
OUT_PATH = REPO_ROOT / "src" / "data" / "golfRounds.local.json"

# Golf Pad does not publish its export schema and the headers have varied
# between app versions, so each field accepts a few plausible spellings.
# Headers are normalised (lowercased, punctuation stripped, whitespace
# collapsed) before matching. A missing REQUIRED field aborts the run and
# prints every header actually seen, so a wrong guess is obvious in one run
# rather than producing a silently wrong dataset.
FIELD_ALIASES = {
    "date": ["date", "date played", "start date", "round date"],
    "course": ["course", "course name"],
    "tees": ["tee", "tees", "tee name", "tee played"],
    "holes_played": ["holes", "holes played", "completed holes"],
    "score": ["score", "gross score", "gross", "total score", "strokes"],
    "par": ["par", "course par", "total par"],
    # Golf Pad's real export has no `par` column at all — only how far over
    # par the round went. `over_par` is the fallback used to derive `par`
    # (see parse_rounds) when a direct par column isn't present.
    "over_par": ["gross score over par", "score to par", "to par", "over par"],
    "putts": ["putts", "total putts"],
    "gir": ["gir", "girs", "greens in regulation"],
    "fairways_hit": ["fairways", "fairways hit", "fir"],
    "fairway_attempts": ["fairway attempts", "fairways possible", "possible fairways"],
    "penalties": ["penalties", "penalty strokes"],
    "sand_shots": ["sand shots", "sand", "bunker shots"],
    "course_rating": ["rating", "course rating"],
    "slope": ["slope", "slope rating"],
}

REQUIRED = ["date", "course", "score"]


def normalize_header(header):
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", (header or "").strip().lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def build_column_map(fieldnames):
    """Map our field names onto the actual CSV columns."""
    seen = {normalize_header(name): name for name in fieldnames or []}
    mapping = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in seen:
                mapping[field] = seen[alias]
                break

    missing = [f for f in REQUIRED if f not in mapping]
    if missing:
        sys.exit(
            f"Could not find required column(s): {', '.join(missing)}.\n"
            f"Headers in this file: {', '.join(fieldnames or ['<none>'])}\n"
            "Add the real spelling to FIELD_ALIASES near the top of this script."
        )
    return mapping


def as_int(raw):
    """Golf Pad leaves blanks for stats that weren't tracked in a round."""
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def as_float(raw):
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def as_date(raw):
    """Normalise to YYYY-MM-DD, the key the app and this merge both use."""
    text = (raw or "").strip()
    if not text:
        return None
    # Take the date half if the column carries a timestamp.
    text = text.split("T")[0].split(" ")[0]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text
    for pattern, order in (
        (r"(\d{1,2})/(\d{1,2})/(\d{4})", "mdy"),
        (r"(\d{4})/(\d{1,2})/(\d{1,2})", "ymd"),
    ):
        match = re.fullmatch(pattern, text)
        if match:
            a, b, c = match.groups()
            y, m, d = (c, a, b) if order == "mdy" else (a, b, c)
            return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    return None


def parse_rounds(csv_path):
    with open(csv_path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        columns = build_column_map(reader.fieldnames)

        def value(row, field):
            column = columns.get(field)
            return row.get(column) if column else None

        rounds, skipped = [], 0
        for row in reader:
            date = as_date(value(row, "date"))
            score = as_int(value(row, "score"))
            course = (value(row, "course") or "").strip()
            # A row with no date, course, or score isn't a round — Golf Pad's
            # export has been seen carrying blank trailing rows.
            if not date or not course or score is None:
                skipped += 1
                continue

            holes_played = as_int(value(row, "holes_played")) or 18

            par = as_int(value(row, "par"))
            if par is None:
                # The real export carries no `par` column, only how far over
                # par the round went — derive it rather than leaving every
                # imported round's `par` (and therefore `toPar`) null.
                over_par = as_int(value(row, "over_par"))
                if over_par is not None:
                    par = score - over_par

            # Deliberately NOT guessed when absent. An earlier version of
            # this script defaulted to 14 (18 holes) / 7 (9 holes) on the
            # "four par-3s per 18" convention — wrong for anything that
            # isn't a standard course. A "Kingswood Park - Executive 9"
            # round in a real export is almost entirely par 3s, so that
            # default would have under-counted fairway opportunities by
            # roughly 3x and made FIR% look far worse than it is. Golf Pad's
            # round-level export never includes attempts at all, so
            # fairway_attempts (and therefore firPct) is null for every
            # imported round — an honest "unknown", not a fabricated number.
            fairway_attempts = as_int(value(row, "fairway_attempts"))

            rounds.append(
                {
                    "date": date,
                    "course": course,
                    "tees": (value(row, "tees") or "").strip() or None,
                    "source": "golfpad",
                    "summary": {
                        "holesPlayed": holes_played,
                        "score": score,
                        "par": par,
                        "putts": as_int(value(row, "putts")),
                        "girCount": as_int(value(row, "gir")),
                        "fairwaysHit": as_int(value(row, "fairways_hit")),
                        "fairwayAttempts": fairway_attempts,
                        "penalties": as_int(value(row, "penalties")),
                        "sandShots": as_int(value(row, "sand_shots")),
                        "courseRating": as_float(value(row, "course_rating")),
                        "slope": as_int(value(row, "slope")),
                    },
                }
            )
    return rounds, skipped


def load_existing():
    if not OUT_PATH.exists():
        return []
    try:
        return json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        sys.exit(f"{OUT_PATH} is not valid JSON ({error}). Fix or delete it, then re-run.")


def merge(existing, imported):
    """Merge imported rounds over the existing file, keyed on (date, course).

    THE IMPORTANT RULE: a round that already carries hand-entered `holes`
    keeps them. The import only refreshes its `summary`. An import must never
    downgrade a hole-by-hole round to summary-only — that would silently throw
    away typing that cannot be recovered from any export on the free tier.
    """
    by_key = {(r["date"], r["course"]): r for r in existing}
    actions = []

    for incoming in imported:
        key = (incoming["date"], incoming["course"])
        current = by_key.get(key)
        if current is None:
            by_key[key] = incoming
            actions.append(("added", key))
        elif current.get("holes"):
            current["summary"] = incoming["summary"]
            current.setdefault("source", "manual+golfpad")
            actions.append(("kept holes, refreshed totals", key))
        else:
            by_key[key] = incoming
            actions.append(("updated totals", key))

    merged = sorted(by_key.values(), key=lambda r: r["date"])
    return merged, actions


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("csv_path", type=Path, help="Golf Pad CSV export")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the parsed rounds and the merge plan, write nothing",
    )
    args = parser.parse_args()

    if not args.csv_path.exists():
        sys.exit(f"No such file: {args.csv_path}")

    imported, skipped = parse_rounds(args.csv_path)
    if not imported:
        sys.exit("No rounds parsed — check that this is the 'rounds' CSV from the export.")

    merged, actions = merge(load_existing(), imported)

    print(f"Parsed {len(imported)} round(s) from {args.csv_path.name}" + (f", skipped {skipped} unusable row(s)" if skipped else ""))
    for action, (date, course) in actions:
        print(f"  {date}  {course}  — {action}")
    print(f"{len(merged)} round(s) total after merge")

    if args.dry_run:
        print("\n--dry-run: nothing written. Sample of the first parsed round:")
        print(json.dumps(imported[0], indent=2))
        return

    OUT_PATH.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(REPO_ROOT)}")
    print("Preview it with: VITE_USE_LOCAL_DATA=true npm run dev")


if __name__ == "__main__":
    main()
