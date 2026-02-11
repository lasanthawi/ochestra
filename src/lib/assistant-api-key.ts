/** Normalize Assistant Cloud API key: trim and strip leading "Bearer " so the library's Bearer prefix is correct. */
export function normalizeAssistantApiKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}
