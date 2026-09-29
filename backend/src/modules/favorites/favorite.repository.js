import { database } from "../../db/database.js";

export async function listByUser(userId) {
  return database("favorites as f")
    .select(
      "f.id as favoriteId",
      "f.created_at as favoritedAt",
      "r.id as recipeId",
      "r.title",
      "r.description",
      "r.servings",
      "r.prep_minutes as prepMinutes",
      "r.cook_minutes as cookMinutes",
      "r.difficulty",
      "r.image_url as imageUrl",
      "r.tags"
    )
    .join("recipes as r", "r.id", "f.recipe_id")
    .where("f.user_id", userId)
    .orderBy("f.created_at", "desc")
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        tags: normalizeTags(row.tags)
      }))
    );
}

export async function findFavorite(userId, recipeId) {
  return database("favorites")
    .select("id", "created_at as createdAt")
    .where({ user_id: userId, recipe_id: recipeId })
    .first();
}

export async function insertFavorite(userId, recipeId) {
  const [id] = await database("favorites").insert({
    user_id: userId,
    recipe_id: recipeId
  });
  return { id, recipeId };
}

export async function deleteFavorite(userId, recipeId) {
  return database("favorites")
    .where({ user_id: userId, recipe_id: recipeId })
    .del();
}

export async function recipeExists(recipeId) {
  const row = await database("recipes").select("id").where({ id: recipeId }).first();
  return Boolean(row);
}

function normalizeTags(tags) {
  if (tags === null || tags === undefined) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

