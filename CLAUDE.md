# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Chrome extension (Manifest V3) — minimal HTTP client popup. No build step, no dependencies, vanilla JS/HTML/CSS.

## Loading the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this directory
4. Click the extension icon in the toolbar

After any code change: click the **↻ reload** icon on `chrome://extensions`.

## Architecture

Single-popup extension, no background service worker. All logic lives in three files:

- **`popup.js`** — all state and behavior. One top-level `state` object; DOM refs at module scope; pure functions that mutate `state` then call targeted render functions. No framework.
- **`popup.css`** — OKLCH color tokens in `:root`, Geist (UI) + Martian Mono (code) from Google Fonts. Monochrome dark theme; only color = HTTP status (2xx/4xx/5xx) via `.s2xx` / `.s4xx` / `.s5xx` classes on `.status-dot`.
- **`popup.html`** — static structure; JS renders dynamic parts (header rows, response, saved list) by writing `innerHTML` into container elements.

`chrome.storage.local` key: `invokerSaved` — array of `{ id, method, url, headers, body, savedAt }`, most recent first.

## Key constraints

- Popup dimensions: 400 × 540 px, `overflow: hidden` on `#app`. Response section uses `flex: 1` to fill remaining height; panels inside `.res-panels` are `position: absolute` to enable scroll without reflowing the layout.
- Requests are fetched directly from the popup context (no background worker). Cross-origin requests work because `host_permissions: ["<all_urls>"]` is declared in `manifest.json`.
- `escHtml()` must wrap every user-supplied string placed into `innerHTML`. Do not skip this.
- MV3 CSP for extension pages allows loading Google Fonts without any `content_security_policy` override — do not add one unless it becomes necessary.
