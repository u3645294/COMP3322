import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  addFavoriteSchema,
  recipeIdParamSchema
} from "./favorite.schemas.js";
import * as favoriteController from "./favorite.controller.js";

export const favoriteRouter = Router();

favoriteRouter.use(authenticate);

favoriteRouter.get("/", favoriteController.list);

favoriteRouter.post(
  "/",
  validate({ body: addFavoriteSchema }),
  favoriteController.add
);

favoriteRouter.delete(
  "/:recipeId",
  validate({ params: recipeIdParamSchema }),
  favoriteController.remove
);

