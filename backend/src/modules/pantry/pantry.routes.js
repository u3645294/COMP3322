import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  createPantryItemSchema,
  updatePantryItemSchema,
  pantryItemIdSchema
} from "./pantry.schemas.js";
import * as pantryController from "./pantry.controller.js";

export const pantryRouter = Router();

// Every pantry endpoint requires authentication.
pantryRouter.use(authenticate);

pantryRouter.get("/", pantryController.list);

pantryRouter.post(
  "/",
  validate({ body: createPantryItemSchema }),
  pantryController.create
);

pantryRouter.patch(
  "/:id",
  validate({ params: pantryItemIdSchema, body: updatePantryItemSchema }),
  pantryController.update
);

pantryRouter.delete(
  "/:id",
  validate({ params: pantryItemIdSchema }),
  pantryController.remove
);

