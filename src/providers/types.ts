import type { ChatTurn } from '../shared/types';

/** The two wire protocols we support. Every provider maps to one of these. */
export type AdapterId = 'openai-compat' | 'anthropic';

/** Everything an adapter needs to make one streaming call. */
export interface StreamInput {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  /** Extra static headers from the preset (e.g. OpenRouter attribution). */
  headers?: Record<string, string>;
  /** Called for each token/text delta as it streams in. */
  onDelta: (text: string) => void;
  /** Aborts the in-flight request. */
  signal?: AbortSignal;
}

/** An adapter knows how to talk one wire protocol against any base URL. */
export interface Adapter {
  stream(input: StreamInput): Promise<void>;
}

/** Join a base URL and a path without doubling slashes. */
export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/**
 * Parse a ReadableStream of Server-Sent Events into individual `data:` payloads,
 * invoking `onEvent` with the raw string after `data: `. Shared by both adapters.
 */
export async function readSSE(
  response: Response,
  onEvent: (data: string) => void,
): Promise<void> {
  if (!response.body) throw new Error('No response body to stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    // SSE events are separated by a blank line.
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of rawEvent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          onEvent(trimmed.slice(5).trim());
        }
      }
    }
  }
}

export async function describeError(name: string, response: Response): Promise<string> {
  try {
    const body = await response.json();
    const msg = body?.error?.message ?? body?.error ?? JSON.stringify(body);
    return `${name} error (${response.status}): ${msg}`;
  } catch {
    return `${name} error (${response.status}).`;
  }
}
