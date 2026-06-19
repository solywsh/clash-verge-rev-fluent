import { check, type Update } from "@tauri-apps/plugin-updater";

// Automatic update checks (e.g. when the Settings landing card mounts) should
// not hit the update server every time. Gate them behind a cooldown window;
// within the window we reuse the last in-memory result. A manual check
// (force = true) always bypasses the cooldown.
const TS_KEY = "last-update-check-ts";
const COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours

// The Update object carries non-serializable methods (downloadAndInstall), so
// keep it in memory rather than persisting it — only the timestamp persists.
let cached: Update | null | undefined;

export async function checkUpdateThrottled(
  force = false,
): Promise<Update | null> {
  const last = Number(localStorage.getItem(TS_KEY) || 0);
  const fresh = Date.now() - last < COOLDOWN;

  if (!force && cached !== undefined && fresh) {
    return cached ?? null;
  }

  const info = await check();
  cached = info;
  localStorage.setItem(TS_KEY, String(Date.now()));
  return info;
}
