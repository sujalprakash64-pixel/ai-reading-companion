import { loadSettings, saveSettings } from '../shared/settings';
import { DEFAULT_MODELS, type ProviderId, type Settings } from '../shared/types';

const providerEl = document.getElementById('provider') as HTMLSelectElement;
const modelEl = document.getElementById('model') as HTMLInputElement;
const modelHintEl = document.getElementById('model-hint') as HTMLDivElement;
const apiKeyEl = document.getElementById('apiKey') as HTMLInputElement;
const saveEl = document.getElementById('save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

const HINTS: Record<ProviderId, string> = {
  claude: 'e.g. claude-sonnet-5, claude-opus-4-8',
  openai: 'e.g. gpt-4o, gpt-4o-mini',
};

function updateHint(): void {
  modelHintEl.textContent = HINTS[providerEl.value as ProviderId];
}

// When the provider changes and the model field still holds the old default,
// swap in the new provider's default model.
providerEl.addEventListener('change', () => {
  const prev = Object.values(DEFAULT_MODELS);
  if (!modelEl.value.trim() || prev.includes(modelEl.value.trim())) {
    modelEl.value = DEFAULT_MODELS[providerEl.value as ProviderId];
  }
  updateHint();
});

saveEl.addEventListener('click', async () => {
  const settings: Settings = {
    provider: providerEl.value as ProviderId,
    model: modelEl.value.trim() || DEFAULT_MODELS[providerEl.value as ProviderId],
    apiKey: apiKeyEl.value.trim(),
  };
  await saveSettings(settings);
  statusEl.textContent = 'Saved ✓';
  window.setTimeout(() => (statusEl.textContent = ''), 2000);
});

async function init(): Promise<void> {
  const s = await loadSettings();
  providerEl.value = s.provider;
  modelEl.value = s.model;
  apiKeyEl.value = s.apiKey;
  updateHint();
}

void init();
