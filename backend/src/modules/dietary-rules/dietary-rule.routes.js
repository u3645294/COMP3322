import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { replaceDietaryRulesSchema } from "./dietary-rule.schemas.js";
import * as dietaryRuleController from "./dietary-rule.controller.js";

export const dietaryRuleRouter = Router();

dietaryRuleRouter.use(authenticate);

dietaryRuleRouter.get("/", dietaryRuleController.list);

dietaryRuleRouter.put(
  "/",
  validate({ body: replaceDietaryRulesSchema }),
  dietaryRuleController.replace
);

