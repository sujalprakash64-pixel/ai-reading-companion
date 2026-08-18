# ✨ AI Reading Companion

A browser extension (Manifest V3) that lets you **select text on any webpage**, click a
floating **Ask AI** button, and ask questions in an inline popover — grounded in the
selected passage plus the page's title and URL. Answers stream in without leaving the page.

## Features (v1)
- Floating **Ask AI** button on text selection, positioned below the selection.
- Compact popover with quick actions: **Explain · Summarize · What does this mean? · Challenge this** — plus a free-text box.
- Selected text + page title + URL sent as grounding context.
- **Streamed** markdown answers, with follow-up questions per selection.
- **Configurable provider** — Claude or OpenAI — with your own API key stored locally.

## How it works
See [`docs/workflow.md`](docs/workflow.md) for the full write-up and
[`docs/architecture.html`](docs/architecture.html) for a visual diagram.

- **Content script** detects the selection and renders the UI inside a **Shadow DOM**
  (isolated from the page — the page's own DOM/JS is never modified).
- **Background service worker** builds the grounded prompt and streams tokens from the
  chosen provider over a `runtime.connect` port.
- **Providers** (`src/providers/`) share one `StreamProvider` interface, so switching
  Claude ↔ OpenAI is just a settings change.

## Develop
```bash
npm install
npm run build        # → dist/
# or: npm run dev    # watch build
```
Then load it in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder
4. Click the extension icon → **Settings** → pick a provider, paste your API key.

## Project layout
```
docs/            workflow.md + architecture.html
public/          manifest.json (copied to dist root)
src/
  content/       selection detection + Shadow-DOM UI + streaming display
  background/    service worker, prompt builder
  providers/     claude.ts, openai.ts, index.ts (StreamProvider)
  settings/      options page (provider + model + API key)
  shared/        types (message contract) + settings storage
```
