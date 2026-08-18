// Shared contract between the content script, background worker, and providers.

export type ProviderId = 'claude' | 'openai';

export interface Settings {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

/** A single turn in the per-selection mini-conversation. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** content -> background, sent once when a question is asked (over a port). */
export interface AskRequest {
  type: 'ASK';
  requestId: string;
  selection: string;
  pageTitle: string;
  pageUrl: string;
  question: string;
  history: ChatTurn[];
}

/** background -> content, streamed over the same port. */
export type StreamMessage =
  | { type: 'CHUNK'; requestId: string; delta: string }
  | { type: 'DONE'; requestId: string }
  | { type: 'ERROR'; requestId: string; message: string };

/** Name of the port opened per ask request. */
export const ASK_PORT = 'ai-companion-ask';

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  claude: 'claude-sonnet-5',
  openai: 'gpt-4o',
};

export const DEFAULT_SETTINGS: Settings = {
  provider: 'claude',
  model: DEFAULT_MODELS.claude,
  apiKey: '',
};

/** Quick actions shown in the popover; each maps to a preset question. */
export const QUICK_ACTIONS: { label: string; question: string }[] = [
  { label: 'Explain', question: 'Explain this in simple terms.' },
  { label: 'Summarize', question: 'Summarize this in 2-3 sentences.' },
  { label: 'What does this mean?', question: 'What does this mean? Define any jargon.' },
  { label: 'Challenge this', question: 'Critically challenge the argument or claim in this passage.' },
];
