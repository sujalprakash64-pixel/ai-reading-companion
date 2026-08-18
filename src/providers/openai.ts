import { readSSE, type StreamInput, type StreamProvider } from './types';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const openaiProvider: StreamProvider = {
  async stream({ apiKey, model, system, messages, onDelta, signal }: StreamInput) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
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
      const delta = event.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') onDelta(delta);
    });
  },
};

async function describeError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const msg = body?.error?.message ?? JSON.stringify(body);
    return `OpenAI API error (${response.status}): ${msg}`;
  } catch {
    return `OpenAI API error (${response.status}).`;
  }
}
