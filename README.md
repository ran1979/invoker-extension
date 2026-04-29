# Invoker

Minimal HTTP client Chrome extension. Fire GET/POST/PUT/DELETE/HEAD requests without leaving the browser.

## Install

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked**
5. Select the `invoker-extension` folder
6. The Invoker icon appears in your toolbar — pin it for quick access

> After any code change, click the **↻** reload button on the extension card in `chrome://extensions`.

## Usage

| Action | How |
|--------|-----|
| Send request | Type URL → `Enter` or click → |
| Change method | Click the method badge → pick from dropdown |
| Add headers | **Headers** tab → `+ Add header` |
| Request body | **Body** tab (POST/PUT/DELETE) |
| Save request | Click **☆ Save** |
| Load saved | Click **Saved** → click any entry |
| Delete saved | Hover saved entry → click × |
| Copy response | Click **copy** in the response status bar |

Response body is auto pretty-printed when JSON is detected. Status dot color indicates response class: green (2xx), amber (4xx), red (5xx).

## Permissions

- `storage` — saves requests to `chrome.storage.local` (local to your browser, never leaves your machine)
- `host_permissions: <all_urls>` — allows requests to any URL without CORS restrictions
