import type { AskRequest } from '../shared/types';

/** Build the grounded system prompt from the page context + selection. */
export function buildSystemPrompt(req: AskRequest): string {
  return [
    "You are a concise reading companion embedded in the user's browser.",
    `The user is viewing the page titled "${req.pageTitle}" (${req.pageUrl}) and has`,
    'selected this passage:',
    '"""',
    req.selection,
    '"""',
    'Answer the user\'s question about this passage. Be direct and grounded in the',
    'passage; use the page context only to disambiguate. If the passage is',
    "insufficient to answer, say what's missing. Format with markdown when helpful.",
  ].join('\n');
}
