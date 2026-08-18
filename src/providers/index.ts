import type { CustomProvider, Settings } from '../shared/types';
import { anthropicAdapter } from './anthropic';
import { openaiCompatAdapter } from './openaiCompat';
import { BUILTIN_PRESETS, type ProviderPreset } from './presets';
import type { Adapter, AdapterId } from './types';

const ADAPTERS: Record<AdapterId, Adapter> = {
  'openai-compat': openaiCompatAdapter,
  anthropic: anthropicAdapter,
};

export function getAdapter(id: AdapterId): Adapter {
  return ADAPTERS[id];
}

/** A custom provider stored in settings, presented as a preset. */
function customToPreset(c: CustomProvider): ProviderPreset {
  return {
    id: c.id,
    label: c.label,
    adapter: c.adapter,
    baseUrl: c.baseUrl,
    defaultModel: c.defaultModel,
    apiKeyRequired: c.apiKeyRequired,
    custom: true,
  };
}

/** Every selectable provider: built-ins first, then the user's custom ones. */
export function allProviders(settings: Settings): ProviderPreset[] {
  return [...BUILTIN_PRESETS, ...settings.customProviders.map(customToPreset)];
}

export function findProvider(settings: Settings, id: string): ProviderPreset | undefined {
  return allProviders(settings).find((p) => p.id === id);
}

/** What the background worker needs to make a call for the active provider. */
export interface ResolvedProvider {
  preset: ProviderPreset;
  adapter: Adapter;
  baseUrl: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
}

export function resolveActive(settings: Settings): ResolvedProvider | undefined {
  const preset = findProvider(settings, settings.activeProviderId);
  if (!preset) return undefined;
  const config = settings.configs[preset.id];
  return {
    preset,
    adapter: getAdapter(preset.adapter),
    baseUrl: config?.baseUrl?.trim() || preset.baseUrl,
    apiKey: config?.apiKey?.trim() ?? '',
    model: config?.model?.trim() || preset.defaultModel,
    headers: preset.headers,
  };
}

export { BUILTIN_PRESETS } from './presets';
export type { ProviderPreset } from './presets';
