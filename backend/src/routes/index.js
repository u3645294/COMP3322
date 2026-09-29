import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { ingredientRouter } from "../modules/ingredients/ingredient.routes.js";
import { pantryRouter } from "../modules/pantry/pantry.routes.js";
import { dietaryRuleRouter } from "../modules/dietary-rules/dietary-rule.routes.js";
import { recipeRouter } from "../modules/recipes/recipe.routes.js";
import {
  searchRouter,
  searchHistoryRouter
} from "../modules/search/search.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/ingredients", ingredientRouter);
apiRouter.use("/pantry-items", pantryRouter);
apiRouter.use("/dietary-rules", dietaryRuleRouter);
apiRouter.use("/recipes", recipeRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/search-history", searchHistoryRouter);

