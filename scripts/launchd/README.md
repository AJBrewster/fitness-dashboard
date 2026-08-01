# Scheduled sync (macOS launchd)

Runs `scripts/sync_garmin.py` once daily at 7am so the local SQLite store and
`src/data/*.local.json` stay current without a manual trigger. See
`PLAN.md`'s Data strategy for the full rationale (why launchd over cron, why
SQLite, why this stays local-only).

## Install

```bash
cp scripts/launchd/com.alexbrewster.fitness-dashboard-sync.plist \
   ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.alexbrewster.fitness-dashboard-sync.plist
```

## Check status

```bash
launchctl list | grep fitness-dashboard-sync   # last exit code, once it's run at least once
tail -f scripts/sync.log                        # the script's own run log
```

## Run it manually (doesn't require the agent to be loaded)

```bash
uv run scripts/sync_garmin.py
```

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.alexbrewster.fitness-dashboard-sync.plist
rm ~/Library/LaunchAgents/com.alexbrewster.fitness-dashboard-sync.plist
```

## If it stops working

Garmin OAuth tokens at `~/.garminconnect` expire roughly every 6 months (same
cache the `garmin` MCP server uses — see `PLAN.md`'s MCP setup notes for the
re-auth command). `scripts/sync.log` will show a clear authentication error
rather than a stack trace when this happens.
