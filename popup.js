'use strict';

/* ─── State ──────────────────────────────────────────────────── */

const state = {
  method: 'GET',
  url: '',
  headers: [{ id: uid(), key: '', value: '' }],
  body: '',
  loading: false,
  response: null,   // { status, statusText, duration, size, body, headers: [[k,v]] }
  activeReqTab: 'req-headers',
  activeResTab: 'res-body',
  drawerOpen: false,
  saved: [],        // [{ id, method, url, headers, body, savedAt }]
  theme: 'dark',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ─── DOM refs ───────────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const methodBtn      = $('method-btn');
const methodLabel    = $('method-label');
const methodDropdown = $('method-dropdown');
const urlInput       = $('url-input');
const sendBtn        = $('send-btn');
const sendIcon       = $('send-icon');
const loadingIcon    = $('loading-icon');

const reqTabStrip    = $('req-tab-strip');
const reqHeadersList = $('req-headers-list');
const addHeaderBtn   = $('add-header-btn');
const bodyInput      = $('body-input');

const saveBtn        = $('save-btn');
const toggleSavedBtn = $('toggle-saved-btn');
const themeBtn       = $('theme-btn');
const iconSun        = $('icon-sun');
const iconMoon       = $('icon-moon');
const savedDrawer    = $('saved-drawer');
const savedList      = $('saved-list');

const statusEmpty    = $('status-empty');
const statusInfo     = $('status-info');
const statusDot      = $('status-dot');
const statusCode     = $('status-code');
const statusMeta     = $('status-meta');
const copyBtn        = $('copy-btn');
const resTabStrip    = $('res-tab-strip');
const resBodyEl      = $('res-body');
const resBodyText    = $('res-body-text');
const resHeadersList = $('res-headers-list');

/* ─── Method dropdown ────────────────────────────────────────── */

methodBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = !methodDropdown.classList.contains('hidden');
  methodDropdown.classList.toggle('hidden', open);
  methodBtn.setAttribute('aria-expanded', String(!open));
});

methodDropdown.addEventListener('click', e => {
  const li = e.target.closest('[data-method]');
  if (!li) return;
  setMethod(li.dataset.method);
  methodDropdown.classList.add('hidden');
  methodBtn.setAttribute('aria-expanded', 'false');
});

document.addEventListener('click', () => {
  methodDropdown.classList.add('hidden');
  methodBtn.setAttribute('aria-expanded', 'false');
});

function setMethod(m) {
  state.method = m;
  methodLabel.textContent = m;
  methodBtn.dataset.method = m;
  methodDropdown.querySelectorAll('li').forEach(li => {
    li.setAttribute('aria-selected', li.dataset.method === m ? 'true' : 'false');
  });
  // Hide body tab for methods that don't send a body
  const bodyTab = reqTabStrip.querySelector('[data-panel="req-body"]');
  if (m === 'GET' || m === 'HEAD') {
    bodyTab.style.opacity = '0.4';
  } else {
    bodyTab.style.opacity = '';
  }
}

/* ─── URL input ──────────────────────────────────────────────── */

urlInput.addEventListener('input', () => {
  state.url = urlInput.value.trim();
});

urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendRequest();
  }
});

/* ─── Request tabs ───────────────────────────────────────────── */

reqTabStrip.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  activateReqTab(tab.dataset.panel);
});

function activateReqTab(panelId) {
  state.activeReqTab = panelId;
  reqTabStrip.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.panel === panelId);
  });
  $('req-headers').classList.toggle('hidden', panelId !== 'req-headers');
  $('req-body').classList.toggle('hidden', panelId !== 'req-body');
}

/* ─── Headers editor ─────────────────────────────────────────── */

addHeaderBtn.addEventListener('click', () => {
  state.headers.push({ id: uid(), key: '', value: '' });
  renderReqHeaders();
  // Focus the new key input
  const rows = reqHeadersList.querySelectorAll('.header-row');
  const lastRow = rows[rows.length - 1];
  if (lastRow) lastRow.querySelector('input').focus();
});

function renderReqHeaders() {
  reqHeadersList.innerHTML = '';
  state.headers.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" placeholder="Key" value="${escHtml(h.key)}" data-idx="${i}" data-field="key" spellcheck="false" autocomplete="off">
      <input type="text" placeholder="Value" value="${escHtml(h.value)}" data-idx="${i}" data-field="value" spellcheck="false" autocomplete="off">
      <button class="del-btn" data-idx="${i}" title="Remove">×</button>
    `;
    reqHeadersList.appendChild(row);
  });
}

reqHeadersList.addEventListener('input', e => {
  const input = e.target.closest('input[data-idx]');
  if (!input) return;
  const idx = parseInt(input.dataset.idx, 10);
  const field = input.dataset.field;
  state.headers[idx][field] = input.value;
});

reqHeadersList.addEventListener('click', e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  state.headers.splice(idx, 1);
  if (state.headers.length === 0) {
    state.headers.push({ id: uid(), key: '', value: '' });
  }
  renderReqHeaders();
});

bodyInput.addEventListener('input', () => {
  state.body = bodyInput.value;
});

/* ─── Send ───────────────────────────────────────────────────── */

sendBtn.addEventListener('click', sendRequest);

async function sendRequest() {
  if (state.loading) return;
  const url = urlInput.value.trim();
  if (!url) { urlInput.focus(); return; }

  state.loading = true;
  setLoadingUI(true);

  const headers = {};
  state.headers.forEach(({ key, value }) => {
    const k = key.trim();
    const v = value.trim();
    if (k) headers[k] = v;
  });

  const init = { method: state.method, headers };

  if (state.method !== 'GET' && state.method !== 'HEAD' && state.body.trim()) {
    init.body = state.body.trim();
  }

  const t0 = Date.now();

  try {
    const res = await fetch(url, init);
    const duration = Date.now() - t0;
    const rawBody = await res.text();
    const size = new TextEncoder().encode(rawBody).length;

    const resHeaders = [];
    res.headers.forEach((v, k) => resHeaders.push([k, v]));

    let displayBody = rawBody;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json') || isJsonLike(rawBody)) {
      try { displayBody = JSON.stringify(JSON.parse(rawBody), null, 2); } catch (_) {}
    }

    state.response = {
      status: res.status,
      statusText: res.statusText,
      duration,
      size,
      body: displayBody,
      rawBody,
      headers: resHeaders,
    };

    renderResponse();
  } catch (err) {
    const duration = Date.now() - t0;
    state.response = {
      status: 0,
      statusText: 'Network Error',
      duration,
      size: 0,
      body: err.message,
      rawBody: err.message,
      headers: [],
      error: true,
    };
    renderResponse();
  } finally {
    state.loading = false;
    setLoadingUI(false);
  }
}

function setLoadingUI(loading) {
  sendBtn.classList.toggle('loading', loading);
  sendIcon.classList.toggle('hidden', loading);
  loadingIcon.classList.toggle('hidden', !loading);
  sendBtn.disabled = loading;
}

function isJsonLike(str) {
  const s = str.trim();
  return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'));
}

/* ─── Response render ────────────────────────────────────────── */

function renderResponse() {
  const r = state.response;
  if (!r) return;

  // Status strip
  statusEmpty.classList.add('hidden');
  statusInfo.classList.remove('hidden');
  copyBtn.classList.remove('hidden');
  resTabStrip.classList.remove('hidden');

  const cls = r.error ? 'serr'
    : r.status >= 500 ? 's5xx'
    : r.status >= 400 ? 's4xx'
    : r.status >= 300 ? 's3xx'
    : 's2xx';

  statusDot.className = `status-dot ${cls}`;
  statusCode.textContent = r.error ? 'ERR' : `${r.status} ${r.statusText}`;
  statusMeta.textContent = r.error ? `${r.duration}ms`
    : `· ${r.duration}ms · ${formatBytes(r.size)}`;

  // Body
  resBodyText.textContent = r.body;

  // Response headers
  resHeadersList.innerHTML = '';
  r.headers.forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" value="${escHtml(k)}" readonly tabindex="-1">
      <input type="text" value="${escHtml(v)}" readonly tabindex="-1">
    `;
    resHeadersList.appendChild(row);
  });

  // Activate body tab
  activateResTab('res-body');
}

/* ─── Response tabs ──────────────────────────────────────────── */

resTabStrip.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  activateResTab(tab.dataset.panel);
});

function activateResTab(panelId) {
  state.activeResTab = panelId;
  resTabStrip.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.panel === panelId);
  });
  $('res-body').classList.toggle('hidden', panelId !== 'res-body');
  $('res-headers').classList.toggle('hidden', panelId !== 'res-headers');
}

/* ─── Copy button ────────────────────────────────────────────── */

copyBtn.addEventListener('click', () => {
  if (!state.response) return;
  navigator.clipboard.writeText(state.response.rawBody).then(() => {
    copyBtn.textContent = 'copied';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'copy';
      copyBtn.classList.remove('copied');
    }, 1500);
  });
});

/* ─── Save / Saved drawer ────────────────────────────────────── */

saveBtn.addEventListener('click', saveRequest);

function saveRequest() {
  const url = urlInput.value.trim();
  if (!url) return;

  const entry = {
    id: uid(),
    method: state.method,
    url,
    headers: state.headers.map(h => ({ ...h })),
    body: state.body,
    savedAt: Date.now(),
  };

  // Replace existing entry with same method+url, or prepend
  const existing = state.saved.findIndex(s => s.method === entry.method && s.url === entry.url);
  if (existing !== -1) {
    state.saved.splice(existing, 1);
  }
  state.saved.unshift(entry);

  persistSaved();
  renderSavedList();

  // Brief visual feedback on button
  saveBtn.style.color = 'var(--status-2xx)';
  setTimeout(() => { saveBtn.style.color = ''; }, 800);
}

toggleSavedBtn.addEventListener('click', () => {
  state.drawerOpen = !state.drawerOpen;
  savedDrawer.classList.toggle('hidden', !state.drawerOpen);
  toggleSavedBtn.classList.toggle('active', state.drawerOpen);
});

function renderSavedList() {
  if (state.saved.length === 0) {
    savedList.innerHTML = '<p class="empty-state">No saved requests</p>';
    return;
  }
  savedList.innerHTML = '';
  state.saved.forEach(s => {
    const item = document.createElement('div');
    item.className = 'saved-item';
    item.dataset.id = s.id;
    const display = s.url.replace(/^https?:\/\//, '');
    item.innerHTML = `
      <span class="saved-method" data-method="${escHtml(s.method)}">${escHtml(s.method)}</span>
      <span class="saved-url" title="${escHtml(s.url)}">${escHtml(display)}</span>
      <button class="del-saved" data-id="${escHtml(s.id)}" title="Remove">×</button>
    `;
    savedList.appendChild(item);
  });
}

savedList.addEventListener('click', e => {
  const delBtn = e.target.closest('.del-saved');
  if (delBtn) {
    e.stopPropagation();
    const id = delBtn.dataset.id;
    state.saved = state.saved.filter(s => s.id !== id);
    persistSaved();
    renderSavedList();
    return;
  }

  const item = e.target.closest('.saved-item');
  if (!item) return;
  const id = item.dataset.id;
  const entry = state.saved.find(s => s.id === id);
  if (!entry) return;
  restoreRequest(entry);
});

function restoreRequest(entry) {
  setMethod(entry.method);
  urlInput.value = entry.url;
  state.url = entry.url;
  state.headers = entry.headers.length > 0
    ? entry.headers.map(h => ({ ...h, id: uid() }))
    : [{ id: uid(), key: '', value: '' }];
  state.body = entry.body || '';
  bodyInput.value = state.body;
  renderReqHeaders();

  // Close drawer
  state.drawerOpen = false;
  savedDrawer.classList.add('hidden');
  toggleSavedBtn.classList.remove('active');
}

/* ─── Theme ──────────────────────────────────────────────────── */

themeBtn.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  chrome.storage.local.set({ invokerTheme: state.theme });
});

function applyTheme() {
  document.body.classList.toggle('light', state.theme === 'light');
  iconSun.classList.toggle('hidden', state.theme === 'light');
  iconMoon.classList.toggle('hidden', state.theme === 'dark');
}

/* ─── Storage ────────────────────────────────────────────────── */

function persistSaved() {
  chrome.storage.local.set({ invokerSaved: state.saved });
}

function loadSaved() {
  chrome.storage.local.get(['invokerSaved', 'invokerTheme'], result => {
    if (result.invokerSaved && Array.isArray(result.invokerSaved)) {
      state.saved = result.invokerSaved;
      renderSavedList();
    }
    if (result.invokerTheme) {
      state.theme = result.invokerTheme;
      applyTheme();
    }
  });
}

/* ─── Helpers ────────────────────────────────────────────────── */

function formatBytes(n) {
  if (n < 1024) return `${n}b`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}kb`;
  return `${(n / (1024 * 1024)).toFixed(1)}mb`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Init ───────────────────────────────────────────────────── */

function init() {
  setMethod('GET');
  renderReqHeaders();
  loadSaved();
  urlInput.focus();
}

init();
