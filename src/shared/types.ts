// Shared contract between the content script, background worker, and providers.

import type { AdapterId } from '../providers/types';

/** A single turn in the per-selection mini-conversation. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Per-provider saved config: its own key + model (+ optional base URL override). */
export interface ProviderConfig {
  apiKey: string;
  model: string;
  /** Overrides the preset base URL (used by local/custom providers). */
  baseUrl?: string;
}

/** A user-defined provider. Shaped like a preset but stored in settings. */
export interface CustomProvider {
  id: string;
  label: string;
  adapter: AdapterId;
  baseUrl: string;
  defaultModel: string;
  apiKeyRequired: boolean;
}

export interface Settings {
  /** id of the currently selected provider (built-in preset or custom). */
  activeProviderId: string;
  /** Per-provider config keyed by provider id. */
  configs: Record<string, ProviderConfig>;
  /** Providers the user added themselves. */
  customProviders: CustomProvider[];
}

export const DEFAULT_SETTINGS: Settings = {
  activeProviderId: 'anthropic',
  configs: {},
  customProviders: [],
};

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

/** Quick actions shown in the popover; each maps to a preset question. */
export const QUICK_ACTIONS: { label: string; question: string }[] = [
  { label: 'Explain', question: 'Explain this in simple terms.' },
  { label: 'Summarize', question: 'Summarize this in 2-3 sentences.' },
  { label: 'What does this mean?', question: 'What does this mean? Define any jargon.' },
  { label: 'Challenge this', question: 'Critically challenge the argument or claim in this passage.' },
];
