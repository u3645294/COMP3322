import { asyncHandler } from "../../utils/async-handler.js";
import * as favoriteService from "./favorite.service.js";

export const list = asyncHandler(async (request, response) => {
  const favorites = await favoriteService.listFavorites(request.user.id);
  response.json({
    data: { favorites },
    meta: { count: favorites.length }
  });
});

export const add = asyncHandler(async (request, response) => {
  const result = await favoriteService.addFavorite(
    request.user.id,
    request.body.recipeId
  );
  response
    .status(result.alreadyExisted ? 200 : 201)
    .json({ data: { favorite: { recipeId: result.recipeId } } });
});

export const remove = asyncHandler(async (request, response) => {
  await favoriteService.removeFavorite(
    request.user.id,
    request.params.recipeId
  );
  response.status(204).end();
});

