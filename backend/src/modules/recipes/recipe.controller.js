import { asyncHandler } from "../../utils/async-handler.js";
import * as recipeService from "./recipe.service.js";

export const list = asyncHandler(async (request, response) => {
  const { recipes, total, limit, offset } = await recipeService.listRecipes(
    request.query
  );
  response.json({
    data: { recipes },
    meta: { count: recipes.length, total, limit, offset }
  });
});

export const getOne = asyncHandler(async (request, response) => {
  const recipe = await recipeService.getRecipeById(request.params.id);
  response.json({ data: { recipe } });
});

