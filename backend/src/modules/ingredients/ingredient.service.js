import { searchIngredients } from "./ingredient.repository.js";

const MAX_RESULTS = 10;

export async function findIngredients(query) {
  const rows = await searchIngredients(query, MAX_RESULTS);
  return rows;
}

/**
 * Exported for the search module (recipe matching).
 * Accepts a single string or an array of strings. Returns deduped canonical rows.
 */
export async function findCanonicalIngredients(input) {
  const queries = Array.isArray(input) ? input : [input];
  const seen = new Map();

  for (const raw of queries) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    const matches = await findIngredients(trimmed);
    for (const match of matches) {
      if (!seen.has(match.id)) {
        seen.set(match.id, match);
      }
    }
  }

  return Array.from(seen.values());
}

