import { NotFoundError, DomainRuleError } from "../../utils/app-error.js";
import * as favoriteRepo from "./favorite.repository.js";

export async function listFavorites(userId) {
  return favoriteRepo.listByUser(userId);
}

export async function addFavorite(userId, recipeId) {
  const exists = await favoriteRepo.recipeExists(recipeId);
  if (!exists) {
    throw new DomainRuleError("Recipe does not exist.", {
      recipeId: "Recipe not found."
    });
  }

  // Idempotent: if already favorited, return that row.
  const existing = await favoriteRepo.findFavorite(userId, recipeId);
  if (existing) {
    return { favoriteId: existing.id, recipeId, alreadyExisted: true };
  }

  try {
    const inserted = await favoriteRepo.insertFavorite(userId, recipeId);
    return { favoriteId: inserted.id, recipeId, alreadyExisted: false };
  } catch (error) {
    // Unique constraint race: another request inserted the same favorite.
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      const row = await favoriteRepo.findFavorite(userId, recipeId);
      return { favoriteId: row.id, recipeId, alreadyExisted: true };
    }
    throw error;
  }
}

export async function removeFavorite(userId, recipeId) {
  const deleted = await favoriteRepo.deleteFavorite(userId, recipeId);
  if (!deleted) {
    throw new NotFoundError("Favorite not found.");
  }
}

