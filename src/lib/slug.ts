// Letters that Unicode normalization can't reduce to plain Latin (Azerbaijani, Turkish, German and others).
const MAP: Record<string, string> = { ə: 'e', ı: 'i', ß: 'ss', ø: 'o', đ: 'd', ł: 'l', æ: 'ae', œ: 'oe' };

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[əıßøđłæœ]/g, (c) => MAP[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return slug || randomSuffix();
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}
