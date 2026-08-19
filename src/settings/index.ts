import { allProviders, findProvider, resolveActive, BUILTIN_PRESETS } from '../providers';
import { ADAPTER_OPTIONS } from '../providers/presets';
import { loadSettings, saveSettings } from '../shared/settings';
import type { AdapterId, } from '../providers/types';
import type { CustomProvider, ProviderConfig, Settings } from '../shared/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const providerEl = $<HTMLSelectElement>('provider');
const modelEl = $<HTMLInputElement>('model');
const modelListEl = $<HTMLDataListElement>('model-list');
const modelHintEl = $<HTMLDivElement>('model-hint');
const apikeyGroup = $<HTMLDivElement>('apikey-group');
const apiKeyEl = $<HTMLInputElement>('apiKey');
const keyHintEl = $<HTMLDivElement>('key-hint');
const baseUrlEl = $<HTMLInputElement>('baseUrl');
const baseurlHintEl = $<HTMLDivElement>('baseurl-hint');
const saveEl = $<HTMLButtonElement>('save');
const testEl = $<HTMLButtonElement>('test');
const removeEl = $<HTMLButtonElement>('remove');
const statusEl = $<HTMLDivElement>('status');

const cLabelEl = $<HTMLInputElement>('c-label');
const cAdapterEl = $<HTMLSelectElement>('c-adapter');
const cBaseUrlEl = $<HTMLInputElement>('c-baseUrl');
const cModelEl = $<HTMLInputElement>('c-model');
const cKeyReqEl = $<HTMLInputElement>('c-key-required');
const cAddEl = $<HTMLButtonElement>('c-add');
const cStatusEl = $<HTMLDivElement>('c-status');

let settings: Settings;
let currentId = '';

// ---------- rendering ----------

function renderProviderOptions(): void {
  const custom = settings.customProviders;
  const builtinIds = new Set(BUILTIN_PRESETS.map((p) => p.id));
  providerEl.innerHTML = '';

  const builtinGroup = document.createElement('optgroup');
  builtinGroup.label = 'Built-in';
  for (const p of BUILTIN_PRESETS) {
    builtinGroup.appendChild(new Option(p.label, p.id));
  }
  providerEl.appendChild(builtinGroup);

  if (custom.length) {
    const customGroup = document.createElement('optgroup');
    customGroup.label = 'Custom';
    for (const p of custom) {
      if (!builtinIds.has(p.id)) customGroup.appendChild(new Option(p.label, p.id));
    }
    providerEl.appendChild(customGroup);
  }
  providerEl.value = settings.activeProviderId;
}

function renderFields(): void {
  const preset = findProvider(settings, currentId);
  if (!preset) return;
  const config = settings.configs[currentId] ?? { apiKey: '', model: '' };

  // Model + suggestions.
  modelEl.value = config.model || preset.defaultModel;
  modelListEl.innerHTML = '';
  for (const m of preset.models ?? []) modelListEl.appendChild(new Option(m));
  modelHintEl.textContent = preset.models?.length
    ? `Suggestions: ${preset.models.join(', ')}`
    : '';

  // API key (hidden when not required, e.g. local Ollama).
  apikeyGroup.classList.toggle('hidden', !preset.apiKeyRequired);
  apiKeyEl.value = config.apiKey || '';
  keyHintEl.innerHTML = preset.keyUrl
    ? `Get a key: <a href="${preset.keyUrl}" target="_blank" rel="noopener">${preset.keyUrl}</a>`
    : 'Stored in <code>chrome.storage.local</code> on this device only.';

  // Base URL. Built-ins: override (blank = preset default). Custom/local: the value.
  baseUrlEl.value = config.baseUrl || (preset.custom ? preset.baseUrl : '');
  baseUrlEl.placeholder = preset.baseUrl;
  baseurlHintEl.textContent = preset.custom
    ? 'The endpoint this provider calls.'
    : `Default: ${preset.baseUrl}. Leave blank unless you use a proxy.`;

  removeEl.classList.toggle('hidden', !preset.custom);
}

// ---------- capture / persist ----------

function captureCurrent(): void {
  const preset = findProvider(settings, currentId);
  if (!preset) return;
  const config: ProviderConfig = {
    apiKey: apiKeyEl.value.trim(),
    model: modelEl.value.trim(),
  };
  const baseUrl = baseUrlEl.value.trim();
  // Only store a base URL when it differs from the preset default.
  if (baseUrl && baseUrl !== preset.baseUrl) config.baseUrl = baseUrl;
  settings.configs[currentId] = config;
}

function selectProvider(id: string): void {
  captureCurrent();
  currentId = id;
  settings.activeProviderId = id;
  renderFields();
}

// ---------- events ----------

providerEl.addEventListener('change', () => selectProvider(providerEl.value));

saveEl.addEventListener('click', async () => {
  captureCurrent();
  await saveSettings(settings);
  flash(statusEl, 'Saved ✓', '#2fae6b');
});

testEl.addEventListener('click', async () => {
  captureCurrent();
  const resolved = resolveActive(settings);
  if (!resolved) {
    flash(statusEl, 'No provider selected.', '#d1435b');
    return;
  }
  if (resolved.preset.apiKeyRequired && !resolved.apiKey) {
    flash(statusEl, 'Add an API key first.', '#d1435b');
    return;
  }

  testEl.disabled = true;
  saveEl.disabled = true;
  flash(statusEl, 'Testing…', '#8791a5');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    let gotOutput = false;
    await resolved.adapter.stream({
      baseUrl: resolved.baseUrl,
      apiKey: resolved.apiKey,
      model: resolved.model,
      headers: resolved.headers,
      system: 'Reply with the single word OK.',
      messages: [{ role: 'user', content: 'ping' }],
      signal: controller.signal,
      onDelta: () => {
        gotOutput = true;
      },
    });
    flash(statusEl, gotOutput ? 'Connected ✓' : 'Connected (no output) ✓', '#2fae6b');
  } catch (err) {
    const msg = controller.signal.aborted
      ? 'Timed out after 20s.'
      : err instanceof Error
        ? err.message
        : 'Connection failed.';
    flash(statusEl, msg, '#d1435b');
  } finally {
    window.clearTimeout(timeout);
    testEl.disabled = false;
    saveEl.disabled = false;
  }
});

removeEl.addEventListener('click', async () => {
  const preset = findProvider(settings, currentId);
  if (!preset?.custom) return;
  settings.customProviders = settings.customProviders.filter((p) => p.id !== currentId);
  delete settings.configs[currentId];
  currentId = 'anthropic';
  settings.activeProviderId = currentId;
  renderProviderOptions();
  renderFields();
  await saveSettings(settings);
  flash(statusEl, 'Removed', '#d1435b');
});

cAddEl.addEventListener('click', async () => {
  const label = cLabelEl.value.trim();
  const baseUrl = cBaseUrlEl.value.trim();
  const model = cModelEl.value.trim();
  if (!label || !baseUrl || !model) {
    flash(cStatusEl, 'Name, base URL and model are required.', '#d1435b');
    return;
  }
  const id = uniqueId(label);
  const provider: CustomProvider = {
    id,
    label,
    adapter: cAdapterEl.value as AdapterId,
    baseUrl,
    defaultModel: model,
    apiKeyRequired: cKeyReqEl.checked,
  };
  captureCurrent();
  settings.customProviders.push(provider);
  currentId = id;
  settings.activeProviderId = id;
  renderProviderOptions();
  renderFields();
  await saveSettings(settings);

  cLabelEl.value = cBaseUrlEl.value = cModelEl.value = '';
  ($('add-details') as HTMLDetailsElement).open = false;
  flash(statusEl, `Added ${label} ✓`, '#2fae6b');
});

// ---------- helpers ----------

function uniqueId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'provider';
  let id = `custom-${slug}`;
  let n = 2;
  const taken = new Set(allProviders(settings).map((p) => p.id));
  while (taken.has(id)) id = `custom-${slug}-${n++}`;
  return id;
}

let flashTimer: number | undefined;
function flash(el: HTMLElement, msg: string, color: string): void {
  el.textContent = msg;
  el.style.color = color;
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => (el.textContent = ''), 2200);
}

// ---------- init ----------

async function init(): Promise<void> {
  settings = await loadSettings();
  for (const a of ADAPTER_OPTIONS) cAdapterEl.appendChild(new Option(a.label, a.id));
  currentId = findProvider(settings, settings.activeProviderId)
    ? settings.activeProviderId
    : 'anthropic';
  settings.activeProviderId = currentId;
  renderProviderOptions();
  renderFields();
}

void init();
