import type { AdapterId } from './types';

/**
 * A provider preset is a named, ready-to-use configuration. Adding a new provider
 * that speaks an existing protocol is just a new entry here — no new code.
 */
export interface ProviderPreset {
  id: string;
  label: string;
  adapter: AdapterId;
  /** Base URL. For openai-compat this is the root that has /chat/completions. */
  baseUrl: string;
  defaultModel: string;
  /** Suggested models shown as autocomplete in settings. */
  models?: string[];
  /** Static extra headers (e.g. OpenRouter attribution). */
  headers?: Record<string, string>;
  /** Whether an API key is required (false for local servers like Ollama). */
  apiKeyRequired: boolean;
  /** Where the user gets a key, shown as a hint in settings. */
  keyUrl?: string;
  /** True for user-defined providers (base URL is editable in settings). */
  custom?: boolean;
}

export const BUILTIN_PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    adapter: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    apiKeyRequired: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    adapter: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'],
    apiKeyRequired: true,
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    adapter: 'openai-compat',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o',
    models: [
      'openai/gpt-4o',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
    ],
    headers: { 'X-Title': 'AI Reading Companion' },
    apiKeyRequired: true,
    keyUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'groq',
    label: 'Groq',
    adapter: 'openai-compat',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    apiKeyRequired: true,
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'together',
    label: 'Together AI',
    adapter: 'openai-compat',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'deepseek-ai/DeepSeek-V3'],
    apiKeyRequired: true,
    keyUrl: 'https://api.together.xyz/settings/api-keys',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    adapter: 'openai-compat',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'],
    apiKeyRequired: true,
    keyUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    adapter: 'openai-compat',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    apiKeyRequired: true,
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    adapter: 'openai-compat',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    models: ['grok-2-latest', 'grok-2-vision-latest'],
    apiKeyRequired: true,
    keyUrl: 'https://console.x.ai/',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    adapter: 'openai-compat',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'sonar',
    models: ['sonar', 'sonar-pro', 'sonar-reasoning'],
    apiKeyRequired: true,
    keyUrl: 'https://www.perplexity.ai/settings/api',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    adapter: 'openai-compat',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    apiKeyRequired: true,
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    adapter: 'openai-compat',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'mistral', 'phi4'],
    apiKeyRequired: false,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    adapter: 'openai-compat',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    apiKeyRequired: false,
  },
];

/** Adapter choices shown when the user adds a custom provider. */
export const ADAPTER_OPTIONS: { id: AdapterId; label: string }[] = [
  { id: 'openai-compat', label: 'OpenAI-compatible (/chat/completions)' },
  { id: 'anthropic', label: 'Anthropic-compatible (/v1/messages)' },
];
