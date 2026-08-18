import { getProvider } from '../providers';
import { loadSettings } from '../shared/settings';
import { buildSystemPrompt } from './prompt';
import {
  ASK_PORT,
  type AskRequest,
  type ChatTurn,
  type StreamMessage,
} from '../shared/types';

// One streaming port per in-flight ask. The content script opens the port,
// posts a single AskRequest, and we stream CHUNK/DONE/ERROR back over it.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== ASK_PORT) return;

  const controller = new AbortController();
  port.onDisconnect.addListener(() => controller.abort());

  port.onMessage.addListener((msg: AskRequest) => {
    if (msg?.type !== 'ASK') return;
    void handleAsk(msg, port, controller.signal);
  });
});

async function handleAsk(
  req: AskRequest,
  port: chrome.runtime.Port,
  signal: AbortSignal,
): Promise<void> {
  const send = (m: StreamMessage) => {
    try {
      port.postMessage(m);
    } catch {
      // Port already closed (popover dismissed) — nothing to do.
    }
  };

  try {
    const settings = await loadSettings();
    if (!settings.apiKey) {
      send({
        type: 'ERROR',
        requestId: req.requestId,
        message: 'No API key set. Open the extension settings to add one.',
      });
      return;
    }

    const system = buildSystemPrompt(req);
    const messages: ChatTurn[] = [
      ...req.history,
      { role: 'user', content: req.question },
    ];

    const provider = getProvider(settings.provider);
    await provider.stream({
      apiKey: settings.apiKey,
      model: settings.model,
      system,
      messages,
      signal,
      onDelta: (delta) => send({ type: 'CHUNK', requestId: req.requestId, delta }),
    });

    send({ type: 'DONE', requestId: req.requestId });
  } catch (err) {
    if (signal.aborted) return;
    send({
      type: 'ERROR',
      requestId: req.requestId,
      message: err instanceof Error ? err.message : 'Unexpected error.',
    });
  }
}

// Clicking the toolbar icon opens the settings page.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// The "Open settings" link inside an error message routes through here.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'OPEN_OPTIONS') chrome.runtime.openOptionsPage();
});
