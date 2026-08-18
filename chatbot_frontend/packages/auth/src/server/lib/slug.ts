// Matches Unicode combining diacritical marks (U+0300-U+036F) left behind after NFD normalization.
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(DIACRITICS_PATTERN, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organizacao"
  );
}

export function randomSlugSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}
