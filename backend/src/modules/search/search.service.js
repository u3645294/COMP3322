import { NotFoundError } from "../../utils/app-error.js";
import { getUserPantry } from "../pantry/pantry.service.js";
import { getUserDietaryRules } from "../dietary-rules/dietary-rule.service.js";
import * as recipeRepo from "../recipes/recipe.repository.js";
import * as searchRepo from "./search.repository.js";

const MAX_RESULTS = 20;

/**
 * Diet rules are evaluated against recipe tags and ingredient categories.
 * - vegetarian: recipe must carry the "vegetarian" tag.
 * - vegan: recipe must be vegetarian AND contain no Dairy ingredients or eggs.
 */
const DIET_CHECKS = {
  vegetarian: (recipe) => recipe.tags.includes("vegetarian"),
  vegan: (recipe) =>
    recipe.tags.includes("vegetarian") &&
    !recipe.ingredients.some(
      (ing) => ing.category === "Dairy" || ing.canonicalName === "egg"
    )
};

function violatesRules(recipe, rules) {
  for (const rule of rules) {
    const value = String(rule.ruleValue).toLowerCase();

    if (rule.ruleType === "allergy" || rule.ruleType === "excluded_ingredient") {
      const contains = recipe.ingredients.some(
        (ing) => ing.canonicalName.toLowerCase() === value
      );
      if (contains) return true;
      continue;
    }

    if (rule.ruleType === "diet") {
      const check = DIET_CHECKS[value];
      // Unknown diets don't filter — safer than accidentally excluding everything.
      if (check && !check(recipe)) return true;
    }
  }
  return false;
}

function parseSnapshot(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export async function runSearch(userId) {
  const [pantry, rules, recipes] = await Promise.all([
    getUserPantry(userId),
    getUserDietaryRules(userId),
    recipeRepo.listAllRecipesWithIngredients()
  ]);

  const pantryIngredientIds = new Set(pantry.map((item) => item.ingredientId));

  const candidates = [];

  for (const recipe of recipes) {
    if (violatesRules(recipe, rules)) continue;

    const required = recipe.ingredients.filter((ing) => !ing.optional);
    if (required.length === 0) continue;

    const matched = required.filter((ing) =>
      pantryIngredientIds.has(ing.ingredientId)
    );
    if (matched.length === 0) continue;

    const missing = required.filter(
      (ing) => !pantryIngredientIds.has(ing.ingredientId)
    );

    const coverage = matched.length / required.length;
    candidates.push({ recipe, matched, missing, coverage });
  }

  candidates.sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    if (a.missing.length !== b.missing.length) {
      return a.missing.length - b.missing.length;
    }
    return a.recipe.title.localeCompare(b.recipe.title);
  });

  const top = candidates.slice(0, MAX_RESULTS);

  const persistedResults = top.map((candidate, index) => ({
    recipeId: candidate.recipe.id,
    rank: index + 1,
    coverage: Number(candidate.coverage.toFixed(4))
  }));

  const searchId = await searchRepo.insertSearchWithResults({
    userId,
    pantrySnapshot: pantry,
    rulesSnapshot: rules,
    results: persistedResults
  });

  return {
    searchId,
    results: top.map((candidate, index) => ({
      rank: index + 1,
      recipeId: candidate.recipe.id,
      title: candidate.recipe.title,
      description: candidate.recipe.description,
      difficulty: candidate.recipe.difficulty,
      tags: candidate.recipe.tags,
      servings: candidate.recipe.servings,
      prepMinutes: candidate.recipe.prepMinutes,
      cookMinutes: candidate.recipe.cookMinutes,
      coverage: Number(candidate.coverage.toFixed(4)),
      matchedCount: candidate.matched.length,
      requiredCount: candidate.recipe.ingredients.filter((ing) => !ing.optional).length,
      matchedIngredients: candidate.matched.map((ing) => ({
        id: ing.ingredientId,
        canonicalName: ing.canonicalName
      })),
      missingIngredients: candidate.missing.map((ing) => ({
        id: ing.ingredientId,
        canonicalName: ing.canonicalName
      }))
    }))
  };
}

export async function listSearches(userId, { limit, offset }) {
  const [total, searches] = await Promise.all([
    searchRepo.countSearchesByUser(userId),
    searchRepo.listSearchesByUser(userId, { limit, offset })
  ]);
  return { searches, total, limit, offset };
}

export async function getSearchById(userId, id) {
  const search = await searchRepo.findSearchById(userId, id);
  if (!search) {
    throw new NotFoundError("Search not found.");
  }

  const results = await searchRepo.listResultsForSearch(id);

  return {
    id: search.id,
    createdAt: search.createdAt,
    pantrySnapshot: parseSnapshot(search.pantrySnapshot),
    rulesSnapshot: parseSnapshot(search.rulesSnapshot),
    results: results.map((row) => ({
      rank: row.rank,
      recipeId: row.recipeId,
      coverage: row.coverage === null ? null : Number(row.coverage)
    }))
  };
}

