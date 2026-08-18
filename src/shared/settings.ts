import { DEFAULT_SETTINGS, type Settings } from './types';

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  return normalize(stored[KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

/** Merge with defaults and migrate the old flat {provider,model,apiKey} shape. */
function normalize(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw as Partial<Settings> | undefined) };

  // Migration: v0.1 stored a single provider/model/apiKey at the top level.
  const legacy = raw as { provider?: string; model?: string; apiKey?: string } | undefined;
  if (legacy?.apiKey && !(raw as Settings)?.configs) {
    const id = legacy.provider === 'openai' ? 'openai' : 'anthropic';
    s.activeProviderId = id;
    s.configs = { [id]: { apiKey: legacy.apiKey, model: legacy.model ?? '' } };
  }

  s.configs = s.configs ?? {};
  s.customProviders = s.customProviders ?? [];
  return s;
}
