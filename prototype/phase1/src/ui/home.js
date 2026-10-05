/**
 * home.js – Screen 1: Listening (Phase 1)
 * Shows nearby count and the Raise a flag / Ledger bottom bar.
 */

import { COPY } from '../copy.js';
import { getState, subscribe, navigate } from '../state.js';
import { forgeFlag } from '../flag.js';

// ── Mount ─────────────────────────────────────────────────────────────────────
export function mountHome(container) {
  container.innerHTML = renderHome(getState());
  bindHome(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'listening') return;
    container.innerHTML = renderHome(state);
    bindHome(container);
  });

  return unsub;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderHome(state) {
  const count = state.nearbyCount;
  return `
    <div class="screen" id="screen-listening" aria-label="Listening screen">
      <div class="top-bar">
        <span class="top-bar__wordmark display">${COPY.appName}</span>
        <span class="chip">${COPY.listeningHint}</span>
      </div>

      <div class="stack" style="margin-top: var(--space-8);">
        <div class="presence-card" role="status" aria-live="polite">
          <span class="presence-card__count display" id="nearby-count">${count}</span>
          <span class="subheading">${COPY.nearbyCount(count)}</span>
          ${count === 0 ? `<p class="small-text" style="opacity:0.7">${COPY.noNearby}</p>` : ''}
        </div>

        ${state.error ? `<div class="payload-banner" role="alert">
          <span class="payload-banner__label">Error</span>
          ${state.error}
        </div>` : ''}

        <p class="body-text" style="text-align:center; padding: 0 var(--space-4);">
          ${COPY.appTagline}
        </p>
      </div>

      ${renderRecentFlags(state)}
    </div>`;
}

function renderRecentFlags(state) {
  if (!state.signature) return '';
  const { svg, code } = forgeFlag(state.signature.fp, 64);
  return `
    <div class="stack" style="margin-top: var(--space-6);">
      <p class="small-text" style="font-weight:700">Last raised flag</p>
      <div class="flag-tile flag-tile--sm row">
        ${svg}
        <div>
          <span class="flag-tile__code">${code}</span><br>
          <span class="small-text">${state.signature.fam} · ${state.signature.cls || '—'}</span>
        </div>
      </div>
    </div>`;
}

// ── Bind ──────────────────────────────────────────────────────────────────────
function bindHome(container) {
  // Nothing interactive on this screen; actions are in the bottom bar
}
