import { describeError, joinUrl, readSSE, type Adapter, type StreamInput } from './types';

// Works with any OpenAI Chat Completions-compatible endpoint:
// OpenAI, OpenRouter, Groq, Together, Mistral, DeepSeek, xAI, Perplexity,
// Google Gemini (compat endpoint), Ollama / LM Studio (local), and custom.
export const openaiCompatAdapter: Adapter = {
  async stream({ baseUrl, apiKey, model, system, messages, headers, onDelta, signal }: StreamInput) {
    const response = await fetch(joinUrl(baseUrl, 'chat/completions'), {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        // A key is optional (local servers ignore it); only send if present.
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        ...headers,
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

    if (!response.ok) throw new Error(await describeError('Provider', response));

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
