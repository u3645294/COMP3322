import { database } from "../../db/database.js";

/**
 * Search ingredients by canonical name or alias.
 *
 * Returns rows shaped as:
 *   { id, canonicalName, matchedText, matchKind }
 * where matchKind is "exact" | "prefix" | "partial".
 *
 * Ranking: exact > prefix > partial, then alphabetical by canonical name.
 */
export async function searchIngredients(rawQuery, limit = 10) {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) return [];

  const exact = query;
  const prefix = `${query}%`;
  const partial = `%${query}%`;

  const rows = await database
    .select(
      "i.id as id",
      "i.canonical_name as canonicalName",
      database.raw(
        `CASE
           WHEN LOWER(i.canonical_name) = ? THEN 'exact'
           WHEN LOWER(i.canonical_name) LIKE ? THEN 'prefix'
           ELSE 'partial'
         END AS canonicalKind`,
        [exact, prefix]
      ),
      database.raw(
        `CASE
           WHEN LOWER(a.alias) = ? THEN 'exact'
           WHEN LOWER(a.alias) LIKE ? THEN 'prefix'
           ELSE 'partial'
         END AS aliasKind`,
        [exact, prefix]
      ),
      database.raw("a.alias as alias")
    )
    .from("ingredients as i")
    .leftJoin("ingredient_aliases as a", "a.ingredient_id", "i.id")
    .where((builder) => {
      builder
        .whereRaw("LOWER(i.canonical_name) LIKE ?", [partial])
        .orWhereRaw("LOWER(a.alias) LIKE ?", [partial]);
    });

  // Reduce duplicates (an ingredient may match on both name and alias).
  const best = new Map();

  for (const row of rows) {
    const kinds = [row.canonicalKind, row.aliasKind].filter(Boolean);
    const rank = (kind) => (kind === "exact" ? 0 : kind === "prefix" ? 1 : 2);
    const bestKind = kinds.reduce((acc, k) => (rank(k) < rank(acc) ? k : acc), "partial");

    const candidate = {
      id: row.id,
      canonicalName: row.canonicalName,
      matchedText: row.alias ?? row.canonicalName,
      matchKind: bestKind
    };

    const existing = best.get(row.id);
    if (!existing || rank(candidate.matchKind) < rank(existing.matchKind)) {
      best.set(row.id, candidate);
    }
  }

  const results = Array.from(best.values());
  const rank = (kind) => (kind === "exact" ? 0 : kind === "prefix" ? 1 : 2);

  results.sort((a, b) => {
    const r = rank(a.matchKind) - rank(b.matchKind);
    if (r !== 0) return r;
    return a.canonicalName.localeCompare(b.canonicalName);
  });

  return results.slice(0, limit).map(({ matchKind, ...rest }) => rest);
}

