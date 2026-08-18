import type { ChatTurn } from '../shared/types';

export interface StreamInput {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  /** Called for each token/text delta as it streams in. */
  onDelta: (text: string) => void;
  /** Aborts the in-flight request. */
  signal?: AbortSignal;
}

export interface StreamProvider {
  stream(input: StreamInput): Promise<void>;
}

/**
 * Parse a ReadableStream of Server-Sent Events into individual `data:` payloads,
 * invoking `onEvent` with the raw string after `data: `. Shared by both providers.
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
