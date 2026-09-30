import { z } from "zod";

export const addFavoriteSchema = z.object({
  recipeId: z.coerce.number().int().positive()
});

export const recipeIdParamSchema = z.object({
  recipeId: z.coerce.number().int().positive()
});

