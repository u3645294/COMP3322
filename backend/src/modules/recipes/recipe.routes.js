import { Router } from "express";

import { validate } from "../../middleware/validate.js";
import { listRecipesSchema, recipeIdSchema } from "./recipe.schemas.js";
import * as recipeController from "./recipe.controller.js";

export const recipeRouter = Router();

// Public endpoints — no authentication required.
recipeRouter.get(
  "/",
  validate({ query: listRecipesSchema }),
  recipeController.list
);

recipeRouter.get(
  "/:id",
  validate({ params: recipeIdSchema }),
  recipeController.getOne
);

