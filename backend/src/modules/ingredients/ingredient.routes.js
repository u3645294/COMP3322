import { Router } from "express";

import { validate } from "../../middleware/validate.js";
import { searchIngredientsSchema } from "./ingredient.schemas.js";
import * as ingredientController from "./ingredient.controller.js";

export const ingredientRouter = Router();

ingredientRouter.get(
  "/",
  validate({ query: searchIngredientsSchema }),
  ingredientController.search
);

