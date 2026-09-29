import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { ingredientRouter } from "../modules/ingredients/ingredient.routes.js";
import { pantryRouter } from "../modules/pantry/pantry.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/ingredients", ingredientRouter);
apiRouter.use("/pantry-items", pantryRouter);

