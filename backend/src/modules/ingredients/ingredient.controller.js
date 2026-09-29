import { asyncHandler } from "../../utils/async-handler.js";
import * as ingredientService from "./ingredient.service.js";

export const search = asyncHandler(async (request, response) => {
  const ingredients = await ingredientService.findIngredients(request.query.query);
  response.json({ data: { ingredients } });
});

