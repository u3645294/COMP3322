import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { listSearchesSchema, searchIdSchema } from "./search.schemas.js";
import * as searchController from "./search.controller.js";

export const searchRouter = Router();
export const searchHistoryRouter = Router();

// POST /api/v1/search
searchRouter.use(authenticate);
searchRouter.post("/", searchController.run);

// GET /api/v1/search-history and /api/v1/search-history/:id
searchHistoryRouter.use(authenticate);
searchHistoryRouter.get(
  "/",
  validate({ query: listSearchesSchema }),
  searchController.listHistory
);
searchHistoryRouter.get(
  "/:id",
  validate({ params: searchIdSchema }),
  searchController.getHistoryEntry
);

