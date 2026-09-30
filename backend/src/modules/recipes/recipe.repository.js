import { database } from "../../db/database.js";

const RECIPE_COLUMNS = [
  "id",
  "title",
  "description",
  "servings",
  "prep_minutes as prepMinutes",
  "cook_minutes as cookMinutes",
  "difficulty",
  "image_url as imageUrl",
  "source_url as sourceUrl",
  "tags",
  "created_at as createdAt",
  "updated_at as updatedAt"
];

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

function normalizeRecipe(row) {
  if (!row) return null;
  return { ...row, tags: normalizeTags(row.tags) };
}

export async function countAll() {
  const [row] = await database("recipes").count({ total: "*" });
  return Number(row.total);
}

export async function listRecipes({ limit, offset }) {
  const rows = await database("recipes")
    .select(RECIPE_COLUMNS)
    .orderBy("title", "asc")
    .limit(limit)
    .offset(offset);
  return rows.map(normalizeRecipe);
}

export async function findRecipeById(id) {
  const row = await database("recipes")
    .select(RECIPE_COLUMNS)
    .where({ id })
    .first();
  return normalizeRecipe(row);
}

/**
 * Returns ingredient rows for the given recipe IDs, joined with ingredient names.
 * Uses canonical_name for display and category for dietary filtering.
 */
export async function listRecipeIngredients(recipeIds) {
  if (recipeIds.length === 0) return [];

  const rows = await database("recipe_ingredients as ri")
    .select(
      "ri.recipe_id as recipeId",
      "ri.ingredient_id as ingredientId",
      "ri.quantity",
      "ri.unit",
      "ri.optional",
      "i.canonical_name as canonicalName",
      "i.category"
    )
    .join("ingredients as i", "i.id", "ri.ingredient_id")
    .whereIn("ri.recipe_id", recipeIds)
    .orderBy("ri.recipe_id")
    .orderBy("i.canonical_name");

  return rows.map((row) => ({
    ...row,
    quantity: row.quantity === null ? null : Number(row.quantity),
    optional: Boolean(row.optional)
  }));
}

export async function listRecipeSteps(recipeIds) {
  if (recipeIds.length === 0) return [];

  return database("recipe_steps")
    .select(
      "recipe_id as recipeId",
      "step_number as stepNumber",
      "instruction"
    )
    .whereIn("recipe_id", recipeIds)
    .orderBy("recipe_id")
    .orderBy("step_number");
}

/**
 * Used by the search algorithm: every recipe with its ingredient list.
 */
export async function listAllRecipesWithIngredients() {
  const recipes = await database("recipes").select(RECIPE_COLUMNS).orderBy("title", "asc");
  const normalized = recipes.map(normalizeRecipe);
  const ids = normalized.map((r) => r.id);

  const allIngredients = await listRecipeIngredients(ids);

  const byRecipe = new Map();
  for (const ing of allIngredients) {
    if (!byRecipe.has(ing.recipeId)) byRecipe.set(ing.recipeId, []);
    byRecipe.get(ing.recipeId).push(ing);
  }

  return normalized.map((recipe) => ({
    ...recipe,
    ingredients: byRecipe.get(recipe.id) ?? []
  }));
}

