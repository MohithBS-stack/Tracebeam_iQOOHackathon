/**
 * alert.js – Screen 4: Match alert (helper side) + Screen 5: Meet
 * F6: Helper alert with haptic, flag, reason, fix-note preview, Accept/Not now
 * F7: Meet – both phones show same flag and first name only
 */

import { COPY } from '../copy.js';
import { getState, subscribe, setState, navigate } from '../state.js';
import { forgeFlag } from '../flag.js';
import { vibrate } from '../haptics.js';
import { accept, send, MSG, getSessionId } from '../mesh-sim.js';
import { getHelperName } from '../ledger.js';

// ── Show the match alert bottom sheet ────────────────────────────────────────
/**
 * Called from the mesh listener when a match is found.
 * @param {{ entry, score, why, peerName }} matchResult
 * @param {string} peerSessionId
 */
export function showMatchAlert(matchResult, peerSessionId) {
  setState({ matchResult, peerId: peerSessionId, isHelper: true });
  vibrate('matchFound');
  navigate('match');
}

// ── Mount match screen ────────────────────────────────────────────────────────
export function mountMatch(container) {
  container.innerHTML = renderMatch(getState());
  bindMatch(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'match') return;
    container.innerHTML = renderMatch(state);
    bindMatch(container);
  });

  return unsub;
}

function renderMatch(state) {
  const mr = state.matchResult;
  if (!mr) return '';

  const sig = { fp: mr.entry.fp };
  const { svg, code } = forgeFlag(sig.fp, 96);

  return `
    <div class="screen" id="screen-match" aria-label="Match found screen">
      <div class="top-bar">
        <span class="subheading">${COPY.matchTitle}</span>
      </div>

      <div class="sheet-overlay" id="match-sheet-overlay">
        <div class="match-sheet" role="dialog" aria-modal="true"
             aria-label="${COPY.matchTitle}">
          <p class="match-sheet__header">${COPY.matchTitle}</p>

          <div class="row">
            <div class="flag-tile flag-tile--sm">${svg}
              <span class="flag-tile__code">${code}</span>
            </div>
            <div>
              <p class="match-sheet__reason">${COPY.matchWhy(mr.why)}</p>
              ${mr.exactFp ? '<span class="chip chip--solved">Exact match</span>' : ''}
              ${mr.entry.fam ? `<span class="chip">${mr.entry.fam}</span>` : ''}
            </div>
          </div>

          ${mr.entry.note ? `
          <div class="match-sheet__note-preview">
            <strong class="payload-banner__label">${COPY.notePreviewLabel}</strong>
            ${mr.entry.note.slice(0, 120)}${mr.entry.note.length > 120 ? '…' : ''}
          </div>` : ''}

          <div class="match-sheet__actions">
            <button id="btn-accept" class="btn btn--primary">${COPY.acceptBtn}</button>
            <button id="btn-decline" class="btn btn--ghost">${COPY.declineBtn}</button>
          </div>
        </div>
      </div>
    </div>`;
}

function bindMatch(container) {
  const btnAccept  = container.querySelector('#btn-accept');
  const btnDecline = container.querySelector('#btn-decline');

  if (btnDecline) {
    btnDecline.addEventListener('click', () => {
      // Declining sends nothing back
      setState({ matchResult: null, peerId: null, isHelper: false });
      navigate('listening');
    });
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      const { peerId, matchResult } = getState();
      const helperName = getHelperName() || 'Helper';
      const note = matchResult?.entry?.note ?? '';

      // Send handshake to the asker
      accept(peerId, { name: helperName, note });
      vibrate('accepted');

      navigate('meet');
    });
  }
}

// ── Screen: Meet ─────────────────────────────────────────────────────────────
export function mountMeet(container) {
  container.innerHTML = renderMeet(getState());
  bindMeet(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'meet') return;
    container.innerHTML = renderMeet(state);
    bindMeet(container);
  });

  return unsub;
}

function renderMeet(state) {
  const mr   = state.matchResult;
  const fp   = mr?.entry?.fp ?? state.signature?.fp ?? '0000000000000000';
  const { svg, code } = forgeFlag(fp, 200);
  const name = state.isHelper
    ? (state.askerName || 'Someone')
    : (state.helperName || 'Your helper');

  return `
    <div class="screen" id="screen-meet" aria-label="Meet screen">
      <div class="top-bar">
        <span class="subheading">${COPY.meetTitle}</span>
      </div>

      <div class="stack" style="margin-top: var(--space-8); align-items: center;">
        <div class="flag-tile flag-tile--md">
          ${svg}
          <span class="flag-tile__code display">${code}</span>
        </div>

        <p class="body-text" style="text-align:center">${COPY.meetInstruction}</p>
        <p class="subheading" style="text-align:center">${name}</p>
      </div>

      ${!state.isHelper ? `
      <div style="margin-top: auto; padding-top: var(--space-8);">
        <button id="btn-mark-solved" class="btn btn--primary">
          ${COPY.solvedTitle.replace('.', '')} → ${COPY.saveCard}
        </button>
      </div>` : ''}
    </div>`;
}

function bindMeet(container) {
  const btnSolved = container.querySelector('#btn-mark-solved');
  if (btnSolved) {
    btnSolved.addEventListener('click', () => {
      vibrate('solved');
      navigate('solved');
    });
  }
}
