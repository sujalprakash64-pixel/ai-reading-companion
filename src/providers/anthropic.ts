import { describeError, joinUrl, readSSE, type Adapter, type StreamInput } from './types';

const API_VERSION = '2023-06-01';

// Anthropic Messages API (Claude). Also works for any Anthropic-compatible
// gateway if its base URL is set.
export const anthropicAdapter: Adapter = {
  async stream({ baseUrl, apiKey, model, system, messages, headers, onDelta, signal }: StreamInput) {
    const response = await fetch(joinUrl(baseUrl, 'v1/messages'), {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        // Required to call the API directly from an extension origin.
        'anthropic-dangerous-direct-browser-access': 'true',
        ...headers,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) throw new Error(await describeError('Claude', response));

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
