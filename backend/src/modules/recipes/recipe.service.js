import { NotFoundError } from "../../utils/app-error.js";
import * as recipeRepo from "./recipe.repository.js";

export async function listRecipes({ limit, offset }) {
  const [total, recipes] = await Promise.all([
    recipeRepo.countAll(),
    recipeRepo.listRecipes({ limit, offset })
  ]);
  return { recipes, total, limit, offset };
}

export async function getRecipeById(id) {
  const recipe = await recipeRepo.findRecipeById(id);
  if (!recipe) {
    throw new NotFoundError("Recipe not found.");
  }

  const [ingredients, steps] = await Promise.all([
    recipeRepo.listRecipeIngredients([id]),
    recipeRepo.listRecipeSteps([id])
  ]);

  return {
    ...recipe,
    ingredients: ingredients.map((row) => ({
      ingredientId: row.ingredientId,
      canonicalName: row.canonicalName,
      quantity: row.quantity,
      unit: row.unit,
      optional: row.optional
    })),
    steps: steps.map((row) => ({
      stepNumber: row.stepNumber,
      instruction: row.instruction
    }))
  };
}

