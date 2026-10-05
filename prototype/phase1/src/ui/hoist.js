/**
 * hoist.js – Screen 2 (Raise) + Screen 3 (Flag Raised) + Hoist animation
 * F1: Capture, F2: Redact/Preview, F3: Flag display, hoist animation
 */

import { COPY } from '../copy.js';
import { getState, subscribe, setState, navigate } from '../state.js';
import { buildSignature, redact, isolate } from '../signature.js';
import { forgeFlag } from '../flag.js';
import { vibrate } from '../haptics.js';
import { advertise } from '../mesh-sim.js';

// ── Mount Raise screen ────────────────────────────────────────────────────────
export function mountRaise(container) {
  container.innerHTML = renderRaise(getState());
  bindRaise(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'raise') return;
    container.innerHTML = renderRaise(state);
    bindRaise(container);
  });

  return unsub;
}

function renderRaise(state) {
  const preview = state.rawTrace
    ? buildRedactionPreview(state.rawTrace)
    : '';

  const sig = state.signature;
  const kw  = sig?.kw ?? [];

  return `
    <div class="screen" id="screen-raise" aria-label="Raise a flag screen">
      <div class="top-bar">
        <button class="btn btn--ghost" id="btn-back-raise" aria-label="Back"
          style="width:auto; min-height:var(--target-min); padding: var(--space-2) var(--space-4);">
          ← Back
        </button>
        <span class="subheading">${COPY.raiseTitle}</span>
        <span style="width:80px"></span>
      </div>

      <div class="stack" style="margin-top: var(--space-4);">
        <label class="subheading" for="trace-input">${COPY.pasteLabel}</label>
        <textarea
          id="trace-input"
          class="trace-box"
          rows="8"
          placeholder="${COPY.pastePlaceholder}"
          aria-required="true"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        >${state.rawTrace}</textarea>

        ${preview ? `
        <div class="payload-banner">
          <span class="payload-banner__label">${COPY.payloadLabel}</span>
          <div class="mono" style="margin-top: var(--space-2);" aria-live="polite">${preview}</div>
          ${kw.length ? `<p style="margin-top: var(--space-2);">
            <strong>${COPY.keywordsLabel}</strong>
            ${kw.map(k => `<span class="chip" style="margin-right:var(--space-1)">${k}</span>`).join('')}
          </p>` : ''}
        </div>` : ''}

        ${state.error ? `<div class="payload-banner" role="alert">
          <span class="payload-banner__label">Error</span>
          ${state.error}
        </div>` : ''}

        <button id="btn-raise" class="btn btn--primary"
          ${state.loading ? 'disabled' : ''}
          aria-busy="${state.loading}">
          ${state.loading ? 'Processing…' : COPY.raiseBtn}
        </button>

        <p class="small-text" style="text-align:center">${COPY.captureTip}</p>
      </div>
    </div>`;
}

function buildRedactionPreview(raw) {
  const sliced  = isolate(raw);
  if (!sliced) return '';
  const clean   = redact(sliced);
  // Highlight [REDACTED] as solid black bars
  return clean
    .replace(/[<>&]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[c]))
    .replace(/\[REDACTED\]/g, '<span class="redaction" aria-label="redacted">&nbsp;&nbsp;&nbsp;&nbsp;</span>')
    .replace(/\[DRIVE\]/g,    '<span class="redaction" aria-label="redacted">&nbsp;</span>');
}

function bindRaise(container) {
  const textarea = container.querySelector('#trace-input');
  const btnRaise = container.querySelector('#btn-raise');
  const btnBack  = container.querySelector('#btn-back-raise');

  if (btnBack) {
    btnBack.addEventListener('click', () => navigate('listening'));
  }

  // Live preview as user types
  if (textarea) {
    textarea.addEventListener('input', () => {
      setState({ rawTrace: textarea.value, error: '' });
    });

    // Clipboard paste hook
    textarea.addEventListener('paste', () => {
      // Let the browser handle the paste, then update state
      setTimeout(() => setState({ rawTrace: textarea.value }), 0);
    });
  }

  if (btnRaise) {
    btnRaise.addEventListener('click', handleRaise);
    // Press animation
    btnRaise.addEventListener('pointerdown', () => btnRaise.dataset.pressed = '');
    btnRaise.addEventListener('pointerup',   () => delete btnRaise.dataset.pressed);
  }
}

async function handleRaise() {
  const { rawTrace } = getState();
  if (!rawTrace.trim()) {
    setState({ error: COPY.noInput });
    return;
  }

  setState({ loading: true, error: '' });
  try {
    const sig = await buildSignature(rawTrace);
    if (!sig) {
      setState({ loading: false, error: COPY.signatureFail });
      return;
    }
    setState({ signature: sig, loading: false });
    // Start hoist animation then transition to raised
    showHoist(sig);
  } catch (err) {
    setState({ loading: false, error: String(err) });
  }
}

// ── Hoist animation ───────────────────────────────────────────────────────────
function showHoist(sig) {
  const overlay = document.getElementById('hoist-overlay');
  if (!overlay) return;

  const { svg, code } = forgeFlag(sig.fp, 200);
  overlay.removeAttribute('hidden');
  overlay.innerHTML = `
    <div class="hoist-container" role="status" aria-label="Flag ${code} raised">
      <div class="hoist-flag flag-tile flag-tile--md">
        ${svg}
        <span class="flag-tile__code display">${code}</span>
      </div>
    </div>`;

  vibrate('flagRaised');

  // After animation (600 ms) + small hold (300 ms), navigate
  setTimeout(() => {
    overlay.setAttribute('hidden', '');
    advertise(sig);
    navigate('raised');
  }, 950);
}

// ── Screen 3: Flag raised ─────────────────────────────────────────────────────
export function mountRaised(container) {
  container.innerHTML = renderRaised(getState());
  bindRaised(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'raised') return;
    container.innerHTML = renderRaised(state);
    bindRaised(container);
  });

  return unsub;
}

function renderRaised(state) {
  const sig = state.signature;
  if (!sig) return '';
  const { svg, code } = forgeFlag(sig.fp, 200);

  return `
    <div class="screen" id="screen-raised" aria-label="Flag raised screen">
      <div class="top-bar">
        <span class="subheading">${COPY.raisedTitle}</span>
      </div>

      <div class="stack" style="margin-top: var(--space-8); align-items: center;">
        <div class="flag-tile flag-tile--md">
          ${svg}
          <span class="flag-tile__code display">${code}</span>
        </div>

        <p class="body-text" style="text-align:center" role="status" aria-live="polite">
          ${COPY.waiting}
        </p>

        <div class="row" style="justify-content: center; flex-wrap: wrap; gap: var(--space-2);">
          ${sig.kw.slice(0, 5).map(k => `<span class="chip">${k}</span>`).join('')}
        </div>

        ${state.error ? `<div class="payload-banner" role="alert">
          <span class="payload-banner__label">Notice</span>
          ${state.error}
        </div>` : ''}
      </div>

      <div style="margin-top: auto; padding-top: var(--space-8);">
        <button id="btn-cancel-raised" class="btn btn--ghost">${COPY.cancelBtn}</button>
      </div>
    </div>`;
}

function bindRaised(container) {
  const btnCancel = container.querySelector('#btn-cancel-raised');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => navigate('listening'));
  }
}
