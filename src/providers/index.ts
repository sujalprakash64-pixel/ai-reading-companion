import type { ProviderId } from '../shared/types';
import type { StreamProvider } from './types';
import { claudeProvider } from './claude';
import { openaiProvider } from './openai';

const REGISTRY: Record<ProviderId, StreamProvider> = {
  claude: claudeProvider,
  openai: openaiProvider,
};

export function getProvider(id: ProviderId): StreamProvider {
  return REGISTRY[id];
}

export type { StreamProvider } from './types';
