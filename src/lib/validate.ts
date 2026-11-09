export function findPlaceholders(text: unknown): string[] {
  if (!text) return [];
  const pattern = /\[[^\]]+\]|\{\{[^}]+\}\}|\{[^}]+\}|\(ая\)|\(ка\)/g;
  const matches = JSON.stringify(text).match(pattern) || [];
  return [...new Set(matches)].filter(
    m => m.length < 50 && !/^\[\s*\]$/.test(m)
  );
}

export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+-\s+/g, '\n- ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}
