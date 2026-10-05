/**
 * raised.js – Screen: Ledger (F9 – list and search of own fixes)
 */

import { COPY } from '../copy.js';
import { getState, subscribe, setState, navigate } from '../state.js';
import { getAllEntries, deleteEntry } from '../ledger.js';
import { forgeFlag } from '../flag.js';

// ── Mount ─────────────────────────────────────────────────────────────────────
export function mountLedger(container) {
  container.innerHTML = renderLedger(getState(), '');
  bindLedger(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'ledger') return;
    const searchInput = container.querySelector('#ledger-search');
    const query = searchInput?.value ?? '';
    container.innerHTML = renderLedger(state, query);
    bindLedger(container);
  });

  return unsub;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderLedger(state, query = '') {
  const entries = getAllEntries();
  const filtered = query
    ? entries.filter(e =>
        [e.fam, e.cls, ...(e.kw ?? []), e.note].some(
          f => f?.toLowerCase().includes(query.toLowerCase())
        )
      )
    : entries;

  return `
    <div class="screen" id="screen-ledger" aria-label="Ledger screen">
      <div class="top-bar">
        <span class="subheading">${COPY.ledgerTitle}</span>
        <span class="chip">${entries.length} fix${entries.length !== 1 ? 'es' : ''}</span>
      </div>

      <div class="stack" style="margin-top: var(--space-4);">
        <input
          id="ledger-search"
          type="search"
          class="trace-box"
          style="min-height: var(--target-min); font-family: var(--font-body);"
          placeholder="${COPY.ledgerSearch}"
          aria-label="${COPY.ledgerSearch}"
          value="${query}"
        />

        ${filtered.length === 0
          ? `<div class="empty-state">
              <p class="body-text">${entries.length === 0 ? COPY.ledgerEmpty : 'No results.'}</p>
            </div>`
          : `<ul class="ledger-list" aria-label="Fix entries">
              ${filtered.map(e => renderEntry(e)).join('')}
            </ul>`
        }
      </div>
    </div>`;
}

function renderEntry(entry) {
  const { svg, code } = forgeFlag(entry.fp, 56);
  const date = new Date(entry.solvedAt * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: '2-digit'
  });

  return `
    <li class="ledger-item" tabindex="0" data-id="${entry.id}"
        role="listitem" aria-label="${entry.cls || entry.fam} fix from ${date}">
      <div class="flag-tile flag-tile--sm">
        ${svg}
        <span class="flag-tile__code" style="font-size: var(--text-small)">${code}</span>
      </div>
      <div class="ledger-item__meta">
        <span class="ledger-item__family">
          ${entry.fam}
          ${entry.synthetic ? `<span class="chip chip--match" style="font-size:10px">${COPY.syntheticBadge}</span>` : ''}
          ${entry.confirmed ? `<span class="chip chip--solved" style="font-size:10px">${COPY.confirmedBadge}</span>` : ''}
        </span>
        <span class="ledger-item__summary">${entry.cls || '—'} · ${date}</span>
        ${entry.note ? `<span class="small-text" style="opacity:0.8">${entry.note.slice(0, 80)}${entry.note.length > 80 ? '…' : ''}</span>` : ''}
        ${(entry.kw ?? []).slice(0, 3).map(k => `<span class="chip" style="margin-right:2px">${k}</span>`).join('')}
      </div>
    </li>`;
}

// ── Bind ──────────────────────────────────────────────────────────────────────
function bindLedger(container) {
  const searchInput = container.querySelector('#ledger-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value;
      const list = container.querySelector('.ledger-list, .empty-state');
      if (list) {
        const state = getState();
        const entries = getAllEntries();
        const filtered = query
          ? entries.filter(e =>
              [e.fam, e.cls, ...(e.kw ?? []), e.note].some(
                f => f?.toLowerCase().includes(query.toLowerCase())
              )
            )
          : entries;

        if (filtered.length === 0) {
          list.outerHTML = `<div class="empty-state"><p class="body-text">${query ? 'No results.' : COPY.ledgerEmpty}</p></div>`;
        } else {
          const ul = container.querySelector('.ledger-list') || (() => {
            const el = document.createElement('ul');
            el.className = 'ledger-list';
            el.setAttribute('aria-label', 'Fix entries');
            list.replaceWith(el);
            return el;
          })();
          if (ul.tagName === 'UL') {
            ul.innerHTML = filtered.map(e => renderEntry(e)).join('');
          }
        }
      }
    });
  }
}
