import { asyncHandler } from "../../utils/async-handler.js";
import * as pantryService from "./pantry.service.js";

export const list = asyncHandler(async (request, response) => {
  const pantryItems = await pantryService.listItems(request.user.id);
  response.json({ data: { pantryItems } });
});

export const create = asyncHandler(async (request, response) => {
  const pantryItem = await pantryService.createItem(
    request.user.id,
    request.body
  );
  response.status(201).json({ data: { pantryItem } });
});

export const update = asyncHandler(async (request, response) => {
  const pantryItem = await pantryService.updateItem(
    request.user.id,
    request.params.id,
    request.body
  );
  response.json({ data: { pantryItem } });
});

export const remove = asyncHandler(async (request, response) => {
  await pantryService.deleteItem(request.user.id, request.params.id);
  response.status(204).end();
});

