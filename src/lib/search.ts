/** Lowercases, strips diacritics (NFD + remove U+0300–U+036F), maps "ł"→"l", trims and collapses whitespace. */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .trim()
    .replace(/\s+/g, " ");
}

/** True when the normalized query is empty or a substring of the normalized name (D5). */
export function matchesQuery(name: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (q === "") return true;
  return normalizeForSearch(name).includes(q);
}
