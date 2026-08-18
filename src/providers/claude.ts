import { readSSE, type StreamInput, type StreamProvider } from './types';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export const claudeProvider: StreamProvider = {
  async stream({ apiKey, model, system, messages, onDelta, signal }: StreamInput) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        // Required to call the API directly from an extension origin.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      throw new Error(await describeError(response));
    }

    await readSSE(response, (data) => {
      if (data === '[DONE]') return;
      let event: any;
      try {
        event = JSON.parse(data);
      } catch {
        return;
      }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        onDelta(event.delta.text ?? '');
      } else if (event.type === 'error') {
        throw new Error(event.error?.message ?? 'Claude streaming error.');
      }
    });
  },
};

async function describeError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const msg = body?.error?.message ?? JSON.stringify(body);
    return `Claude API error (${response.status}): ${msg}`;
  } catch {
    return `Claude API error (${response.status}).`;
  }
}
