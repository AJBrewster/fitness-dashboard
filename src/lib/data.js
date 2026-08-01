import activities from '../data/activities.json';
import wellness from '../data/wellness.json';
import vo2MaxTrend from '../data/vo2MaxTrend.json';
import weighIns from '../data/weighIns.json';

// Real data synced by scripts/sync_garmin.py lands in these gitignored
// *.local.json files (see PLAN.md's Data strategy). import.meta.glob only
// resolves whichever files actually exist on disk at build time, so this
// falls back to the committed synthetic fixtures with no error on a fresh
// clone/CI where no .local.json files exist.
//
// Gated behind VITE_USE_LOCAL_DATA (default off), NOT mere file presence:
// scripts/sync_garmin.py runs on a launchd schedule, so .local.json files
// can appear on disk in the background without the dev ever running the
// sync themselves that session. Presence-based switching meant `npm test`/
// `npm run test:e2e` silently rendered real Garmin data instead of the
// fixture the moment a scheduled sync landed, breaking the hardcoded-value
// assertions in e2e/smoke.spec.js for reasons unrelated to any code change.
// Run `VITE_USE_LOCAL_DATA=true npm run dev` to preview real data locally.
const local = import.meta.glob('../data/*.local.json', { eager: true });
const useLocalData = import.meta.env.VITE_USE_LOCAL_DATA === 'true';

function pick(fileName, fallback) {
  if (!useLocalData) return fallback;
  const mod = local[`../data/${fileName}`];
  return mod ? mod.default : fallback;
}

export function getActivities() {
  return pick('activities.local.json', activities);
}

export function getWellness() {
  return pick('wellness.local.json', wellness);
}

export function getVo2MaxTrend() {
  return pick('vo2MaxTrend.local.json', vo2MaxTrend);
}

export function getWeighIns() {
  return pick('weighIns.local.json', weighIns);
}
