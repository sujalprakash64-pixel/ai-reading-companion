# AI Reading Companion — v1 Workflow & Architecture

> A browser extension that lets a user select text on **any** webpage, get a floating
> "✨ Ask AI" button, and ask questions in an inline popover — grounded in the selected
> text plus the page's title and URL — without leaving the page.

---

## 1. Goals & Non-Goals (v1)

### In scope
- Floating **"✨ Ask AI"** button appears on text selection, positioned just below the selection.
- Compact **popover** with quick actions and a free-text input.
- Quick actions: **Explain**, **Summarize**, **What does this mean?**, **Challenge this**.
- Context sent to the AI: **selected text + page title + page URL**.
- **Loading indicator** (animated dots) shown from submit until the first token arrives.
- **Streamed** answer rendered as markdown inside the popover.
- **Follow-up** questions in the same popover, rendered as a **scrollable transcript** —
  earlier turns stay visible above; scroll up to review the whole conversation.
- **Conversation persistence**: closing and reopening the box on the **same selection**
  restores the full transcript.
- **Settings page**: choose provider (Claude / OpenAI), model, and enter an API key.
- API key stored locally in `chrome.storage.local`. **No backend.**

### Out of scope (deferred to v2+)
- Keyboard shortcut trigger, Translate, Rewrite, Fact-check, Compare.
- Page-level context (whole-page reading), PDF/web-app selection quirks.
- Saved history / persistent conversations across sessions.
- Team sharing / hosted key proxy.

---

## 2. How the extension is structured (MV3)

Three cooperating parts, communicating over `chrome.runtime` messaging:

| Part | Runs where | Responsibility |
|------|-----------|----------------|
| **Content script** | Injected into every page | Detect selection, position the button, render the Shadow-DOM UI, relay questions, display streamed answers. |
| **Background service worker** | Extension worker context | Hold the API key, build the grounded prompt, call the chosen provider with streaming, relay tokens back. |
| **Settings (options) page** | Extension page | Let the user pick provider/model and save their API key. |

```
webpage ──(select text)──▶ content script ──message──▶ background worker ──HTTPS stream──▶ AI provider
   ▲                             ▲                                                              │
   └──────── inline popover ◀────┴───────────── token stream ◀───────────────────────────────┘
```

---

## 3. How it changes the webpage (important design point)

The extension is **non-destructive**. It does **not** edit the page's own DOM content or its
JavaScript. Instead it:

1. Appends a **single host element** (`<div id="ai-companion-root">`) to `document.body`.
2. Attaches a **Shadow DOM** (`attachShadow({ mode: 'open' })`) to that host.
3. Renders the button and popover **inside the shadow root**.

Why Shadow DOM:
- The page's CSS cannot leak in and break our UI; our CSS cannot leak out and break the page.
- We never mutate the article/content nodes the user is reading — we only read the selection
  via `window.getSelection()`.

The only thing we read from the page is:
- `window.getSelection().toString()` → the selected text
- `range.getBoundingClientRect()` → where to place the button
- `document.title` and `location.href` → grounding context

So from the page's perspective, nothing about its own scripts, state, or layout is modified.

---

## 4. Selection → button positioning

```
on 'mouseup' / 'selectionchange' (debounced):
  sel = window.getSelection()
  if sel.isCollapsed or sel.toString().trim() === "":
      hide button; return
  range = sel.getRangeAt(0)
  rect  = range.getBoundingClientRect()

  # place button just BELOW the selection, clamped to the viewport
  top  = rect.bottom + window.scrollY + 8
  left = clamp(rect.left + window.scrollX, 8, window.innerWidth - buttonWidth - 8)
  show button at (top, left)
```

Clicking the button opens the popover anchored near the same rect (flipping above the
selection if there isn't room below).

---

## 5. Message contract (content ⇄ background)

Defined in `src/shared/types.ts`.

**Request — content → background**
```ts
type AskRequest = {
  type: 'ASK';
  requestId: string;      // correlate stream chunks to this request
  selection: string;      // the highlighted text
  pageTitle: string;      // document.title
  pageUrl: string;        // location.href
  question: string;       // quick-action prompt OR user's custom question
  history: ChatTurn[];    // prior turns for this selection (follow-ups)
};
```

**Streamed responses — background → content**
```ts
type StreamChunk =
  | { type: 'CHUNK';  requestId: string; delta: string }
  | { type: 'DONE';   requestId: string }
  | { type: 'ERROR';  requestId: string; message: string };
```

Because MV3 service workers can't hold a long-lived `sendResponse`, streaming uses a
**`chrome.runtime.connect` port** per request: the content script opens a port, the worker
posts `CHUNK`/`DONE`/`ERROR` messages over it.

---

## 6. How the AI is used

### Prompt construction (in the background worker)
```
SYSTEM:
  You are a concise reading companion embedded in the user's browser.
  The user is viewing the page titled "{pageTitle}" ({pageUrl}) and has
  selected this passage:
  """
  {selection}
  """
  Answer the user's question about this passage. Be direct and grounded in
  the passage; use the page context only to disambiguate. If the passage is
  insufficient, say what's missing.

MESSAGES:
  ...prior history turns (for follow-ups)...
  USER: {question}
```

Quick actions map to preset `question` strings:
- **Explain** → "Explain this in simple terms."
- **Summarize** → "Summarize this in 2-3 sentences."
- **What does this mean?** → "What does this mean? Define any jargon."
- **Challenge this** → "Critically challenge the argument or claim in this passage."

### Provider system (config-driven)
Almost every provider speaks one of **two wire protocols**, so `src/providers/` is built
around **adapters** (protocol) + **presets** (named config), not one file per provider.

**Adapters** — the only code that knows a protocol:
```ts
type AdapterId = 'openai-compat' | 'anthropic';

interface Adapter {
  stream(input: {
    baseUrl: string; apiKey: string; model: string;
    system: string; messages: ChatTurn[];
    headers?: Record<string, string>;
    onDelta: (text: string) => void; signal?: AbortSignal;
  }): Promise<void>;
}
```
- `openaiCompat.ts` → POSTs `{baseUrl}/chat/completions` with `Authorization: Bearer`,
  parses SSE `choices[].delta.content`. Serves OpenAI, OpenRouter, Groq, Together,
  Mistral, DeepSeek, xAI, Perplexity, Gemini (compat endpoint), Ollama/LM Studio, and
  any custom OpenAI-compatible endpoint.
- `anthropic.ts` → POSTs `{baseUrl}/v1/messages`, parses SSE `content_block_delta`.

**Presets** (`presets.ts`) — a provider is just data:
```ts
interface ProviderPreset {
  id; label; adapter: AdapterId;
  baseUrl; defaultModel; models?;
  headers?;                 // e.g. OpenRouter attribution
  apiKeyRequired: boolean;  // false for local Ollama / LM Studio
  keyUrl?;                  // where to get a key (hint in settings)
}
```
Adding a provider that reuses a protocol = **one preset entry, no new code**.

**Custom providers** — the user can add their own in Settings (label + adapter + base URL
+ default model). These are stored in settings and treated exactly like built-in presets.

**Resolution** (`index.ts`) — `resolveActive(settings)` looks up the active preset (built-in
or custom), merges the per-provider config (its own `apiKey`, `model`, optional `baseUrl`
override), and returns `{ adapter, baseUrl, apiKey, model, headers }`. The background worker
calls `adapter.stream(...)` and forwards each `onDelta` as a `CHUNK`. Switching provider —
or adding a new one — is purely a settings change.

**Storage schema** (`shared/types.ts`):
```ts
Settings = {
  activeProviderId: string;
  configs: Record<providerId, { apiKey; model; baseUrl? }>;  // per-provider keys
  customProviders: CustomProvider[];
}
```
Each provider keeps its **own** key and model, so switching never loses credentials.

---

## 7. End-to-end sequence

1. User selects text → content script computes rect → shows **✨ Ask AI** button.
2. User clicks button → popover opens, showing the selection as a context chip + quick
   actions + input.
3. User picks a quick action or types a question and submits.
4. The question is appended to the transcript as a user bubble, and an assistant bubble
   with an **animated loader** is shown immediately.
5. Content script opens a `runtime.connect` port and posts an `AskRequest`.
6. Background worker loads settings, resolves the active provider (adapter + base URL +
   key + model), and builds the prompt.
7. The adapter streams tokens; worker forwards each as a `CHUNK` over the port.
8. On the first `CHUNK` the loader is replaced by the streaming answer, which renders as
   markdown live with a blinking caret.
9. On `DONE`, the turn is appended to the transcript and to the conversation history
   (used for follow-ups and restored on reopen). Follow-ups append below; scroll up for
   earlier turns.
10. Errors (missing key, HTTP error) come back as `ERROR` and render inline as an error
    bubble with a link to Settings.

---

## 8. Security & privacy notes

- API key lives only in `chrome.storage.local` on the user's machine; it never leaves the
  browser except in the direct HTTPS call to the chosen provider.
- Only the **selected** text (not the whole page) is sent, plus title + URL.
- Shadow DOM isolation prevents interference with, and by, the host page.
- `host_permissions` are broad (`<all_urls>`) because the button must work anywhere; the
  content script only reads selection + title/URL and injects its own UI.

---

## 9. Build & load

```bash
npm install
npm run build          # Vite → dist/
# Chrome → chrome://extensions → Developer mode → Load unpacked → select dist/
```

Dev: `npm run dev` for a watch build, then reload the unpacked extension.

---

## 10. v2+ backlog

- Keyboard shortcut to trigger without mouse.
- Translate / Rewrite / Fact-check / Compare quick actions.
- Optional whole-page context.
- PDF and canvas/web-app selection handling.
- Persisted conversation history (per URL + passage).
- Optional hosted proxy so users don't need their own key.
