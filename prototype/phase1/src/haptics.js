/**
 * haptics.js – Haptic vocabulary (Phase 1)
 * Patterns from TECHNICAL.md §9.
 * Guards with navigator.vibrate support and a settings toggle.
 */

// ── Pattern table ─────────────────────────────────────────────────────────────
export const HAPTIC_PATTERNS = {
  /** Flag raised on the asker's phone */
  flagRaised:  [0, 250],
  /** Match found on the helper's phone – triple short buzz then long */
  matchFound:  [0, 60, 80, 60, 80, 60, 120, 260],
  /** Both sides accepted the connection */
  accepted:    [0, 120, 60, 120],
  /** Solved confirmation */
  solved:      [0, 40, 40, 40, 40, 200],
};

// ── Settings key ──────────────────────────────────────────────────────────────
const HAPTIC_ENABLED_KEY = 'tb:haptics:enabled';

function isEnabled() {
  const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
  return stored === null ? true : stored === 'true';
}

export function setHapticsEnabled(enabled) {
  localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
}

export function getHapticsEnabled() {
  return isEnabled();
}

// ── Trigger ───────────────────────────────────────────────────────────────────
/**
 * Fire a named haptic pattern.
 * Always paired with a visual change and label by the calling UI code.
 * @param {keyof typeof HAPTIC_PATTERNS} eventName
 */
export function vibrate(eventName) {
  if (!isEnabled()) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const pattern = HAPTIC_PATTERNS[eventName];
  if (!pattern) return;
  navigator.vibrate(pattern);
}
