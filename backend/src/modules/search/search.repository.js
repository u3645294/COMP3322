import { database } from "../../db/database.js";

/**
 * Insert a search_history row and its search_results in one transaction.
 * Returns the new search_history id.
 */
export async function insertSearchWithResults({
  userId,
  pantrySnapshot,
  rulesSnapshot,
  results
}) {
  return database.transaction(async (trx) => {
    const [searchId] = await trx("search_history").insert({
      user_id: userId,
      pantry_snapshot: JSON.stringify(pantrySnapshot),
      rules_snapshot: JSON.stringify(rulesSnapshot)
    });

    if (results.length > 0) {
      await trx("search_results").insert(
        results.map((result) => ({
          search_id: searchId,
          recipe_id: result.recipeId,
          rank: result.rank,
          coverage: result.coverage
        }))
      );
    }

    return searchId;
  });
}

export async function countSearchesByUser(userId) {
  const [row] = await database("search_history")
    .where({ user_id: userId })
    .count({ total: "*" });
  return Number(row.total);
}

export async function listSearchesByUser(userId, { limit, offset }) {
  return database("search_history")
    .select(
      "id",
      "created_at as createdAt"
    )
    .where({ user_id: userId })
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset);
}

export async function findSearchById(userId, id) {
  return database("search_history")
    .select(
      "id",
      "pantry_snapshot as pantrySnapshot",
      "rules_snapshot as rulesSnapshot",
      "created_at as createdAt"
    )
    .where({ user_id: userId, id })
    .first();
}

export async function listResultsForSearch(searchId) {
  return database("search_results")
    .select(
      "recipe_id as recipeId",
      "rank",
      "coverage"
    )
    .where({ search_id: searchId })
    .orderBy("rank", "asc");
}

