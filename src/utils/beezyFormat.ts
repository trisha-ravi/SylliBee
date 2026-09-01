/** Render-friendly helpers for Beezy chat copy. */
export function beezyBullets(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

export function beezySection(title: string, body: string): string {
  return `${title}\n${body}`;
}

export function beezyParagraphs(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n');
}
