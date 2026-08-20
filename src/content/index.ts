import { renderMarkdown } from './markdown';
import { shadowStyles } from './styles';
import {
  ASK_PORT,
  QUICK_ACTIONS,
  type AskRequest,
  type ChatTurn,
  type StreamMessage,
} from '../shared/types';

// ---- Shadow-DOM host: our entire UI lives here, isolated from the page. ----
const host = document.createElement('div');
host.id = 'ai-companion-root';
host.style.position = 'absolute';
host.style.top = '0';
host.style.left = '0';
host.style.zIndex = '2147483647';
const root = host.attachShadow({ mode: 'open' });
const styleEl = document.createElement('style');
styleEl.textContent = shadowStyles;
root.appendChild(styleEl);
document.documentElement.appendChild(host);

// ---- State ----
let button: HTMLButtonElement | null = null;
let popover: HTMLDivElement | null = null;
let thread: HTMLDivElement | null = null;
let lastSelectionText = '';
let history: ChatTurn[] = [];
let activePort: chrome.runtime.Port | null = null;
let requestCounter = 0;

// The most recent conversation, kept so closing and reopening the box on the
// same selection restores the full transcript (scroll up to see history).
let saved: { selection: string; turns: ChatTurn[] } | null = null;

// ---- Selection detection ----
let debounce: number | undefined;
document.addEventListener('selectionchange', () => {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(maybeShowButton, 120);
});
document.addEventListener('mousedown', (e) => {
  // Clicking outside our UI dismisses everything.
  if (!e.composedPath().includes(host)) {
    hideButton();
    hidePopover();
  }
});

function maybeShowButton(): void {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    hideButton();
    return;
  }
  const text = sel.toString().trim();
  if (!text) {
    hideButton();
    return;
  }
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    hideButton();
    return;
  }
  lastSelectionText = text;
  showButton(rect);
}

function showButton(rect: DOMRect): void {
  if (!button) {
    button = document.createElement('button');
    button.className = 'ai-btn';
    button.innerHTML = '<span>✨</span><span>Ask AI</span>';
    button.addEventListener('click', () => openPopover(rect));
    root.appendChild(button);
  }
  const width = 96;
  const top = rect.bottom + window.scrollY + 8;
  const left = clamp(
    rect.left + window.scrollX,
    window.scrollX + 8,
    window.scrollX + window.innerWidth - width - 8,
  );
  button.style.top = `${top}px`;
  button.style.left = `${left}px`;
  button.style.display = 'inline-flex';
}

function hideButton(): void {
  if (button) button.style.display = 'none';
}

// ---- Popover ----
function openPopover(rect: DOMRect): void {
  hideButton();
  hidePopover();

  // Restore the prior conversation if reopening on the same selection.
  history = saved && saved.selection === lastSelectionText ? [...saved.turns] : [];

  popover = document.createElement('div');
  popover.className = 'ai-pop';

  const contextPreview =
    lastSelectionText.length > 220 ? lastSelectionText.slice(0, 220) + '…' : lastSelectionText;

  popover.innerHTML = `
    <div class="ai-head">
      <span>✨ Ask AI</span>
      <button class="close" title="Close">×</button>
    </div>
    <div class="ai-context">${escapeText(contextPreview)}</div>
    <div class="ai-quick"></div>
    <div class="ai-thread"></div>
    <form class="ai-form">
      <textarea class="ai-input" rows="1" placeholder="Ask anything about this…"></textarea>
      <button class="ai-send" type="submit" title="Ask">➤</button>
    </form>
  `;

  thread = popover.querySelector('.ai-thread') as HTMLDivElement;

  const quick = popover.querySelector('.ai-quick')!;
  for (const action of QUICK_ACTIONS) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.addEventListener('click', () => ask(action.question));
    quick.appendChild(b);
  }

  // Re-render any restored turns so the user can scroll up through history.
  for (const turn of history) {
    if (turn.role === 'user') appendUserMessage(turn.content);
    else finalizeAssistant(appendAssistantMessage(), turn.content);
  }

  popover.querySelector('.close')!.addEventListener('click', hidePopover);

  const form = popover.querySelector('.ai-form') as HTMLFormElement;
  const input = popover.querySelector('.ai-input') as HTMLTextAreaElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) {
      input.value = '';
      ask(q);
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  root.appendChild(popover);
  position(popover, rect);
  input.focus();
}

function position(el: HTMLElement, rect: DOMRect): void {
  const width = 360;
  const left = clamp(
    rect.left + window.scrollX,
    window.scrollX + 8,
    window.scrollX + window.innerWidth - width - 8,
  );
  // Prefer below the selection; flip above if there isn't room.
  const spaceBelow = window.innerHeight - rect.bottom;
  let top: number;
  if (spaceBelow < 260 && rect.top > 260) {
    top = rect.top + window.scrollY - el.offsetHeight - 8;
  } else {
    top = rect.bottom + window.scrollY + 8;
  }
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

function hidePopover(): void {
  activePort?.disconnect();
  activePort = null;
  // Persist the conversation so reopening on the same selection restores it.
  if (history.length) saved = { selection: lastSelectionText, turns: [...history] };
  popover?.remove();
  popover = null;
  thread = null;
}

// ---- Transcript helpers ----
function appendUserMessage(text: string): void {
  const el = document.createElement('div');
  el.className = 'ai-msg user';
  el.textContent = text;
  thread!.appendChild(el);
}

/** Adds an assistant bubble showing a loader; returns it for streaming into. */
function appendAssistantMessage(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'ai-msg assistant';
  el.innerHTML = '<div class="ai-loader"><span></span><span></span><span></span></div>';
  thread!.appendChild(el);
  return el;
}

function finalizeAssistant(el: HTMLElement, markdown: string): void {
  el.classList.remove('ai-cursor');
  el.innerHTML = renderMarkdown(markdown);
}

function scrollThreadToBottom(): void {
  if (thread) thread.scrollTop = thread.scrollHeight;
}

// ---- Ask → stream ----
function ask(question: string): void {
  if (!popover || !thread) return;

  appendUserMessage(question);
  const answerEl = appendAssistantMessage();
  scrollThreadToBottom();

  // Close any prior stream for this popover.
  activePort?.disconnect();
  const port = chrome.runtime.connect({ name: ASK_PORT });
  activePort = port;

  const requestId = `req-${++requestCounter}`;
  let acc = '';

  port.onMessage.addListener((msg: StreamMessage) => {
    if (msg.requestId !== requestId) return;
    if (msg.type === 'CHUNK') {
      acc += msg.delta;
      // The first token's innerHTML replaces the loader; keep a blinking caret.
      answerEl.innerHTML = renderMarkdown(acc);
      answerEl.classList.add('ai-cursor');
      scrollThreadToBottom();
    } else if (msg.type === 'DONE') {
      answerEl.classList.remove('ai-cursor');
      if (!acc) answerEl.innerHTML = '<em>No response.</em>';
      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: acc });
      saved = { selection: lastSelectionText, turns: [...history] };
      scrollThreadToBottom();
      port.disconnect();
      if (activePort === port) activePort = null;
    } else if (msg.type === 'ERROR') {
      answerEl.className = 'ai-msg error';
      answerEl.innerHTML = `${escapeText(msg.message)} `;
      const link = document.createElement('a');
      link.textContent = 'Open settings';
      link.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }));
      answerEl.appendChild(link);
      scrollThreadToBottom();
      port.disconnect();
      if (activePort === port) activePort = null;
    }
  });

  const req: AskRequest = {
    type: 'ASK',
    requestId,
    selection: lastSelectionText,
    pageTitle: document.title,
    pageUrl: location.href,
    question,
    history: [...history],
  };
  port.postMessage(req);
}

// ---- helpers ----
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function escapeText(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
