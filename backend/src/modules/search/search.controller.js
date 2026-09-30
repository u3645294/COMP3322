import { asyncHandler } from "../../utils/async-handler.js";
import * as searchService from "./search.service.js";

export const run = asyncHandler(async (request, response) => {
  const { searchId, results } = await searchService.runSearch(request.user.id);
  response.json({
    data: { searchId, results },
    meta: { count: results.length }
  });
});

export const listHistory = asyncHandler(async (request, response) => {
  const { searches, total, limit, offset } = await searchService.listSearches(
    request.user.id,
    request.query
  );
  response.json({
    data: { searches },
    meta: { count: searches.length, total, limit, offset }
  });
});

export const getHistoryEntry = asyncHandler(async (request, response) => {
  const search = await searchService.getSearchById(
    request.user.id,
    request.params.id
  );
  response.json({ data: { search } });
});

