import { asyncHandler } from "../../utils/async-handler.js";
import * as dietaryRuleService from "./dietary-rule.service.js";

export const list = asyncHandler(async (request, response) => {
  const rules = await dietaryRuleService.listRules(request.user.id);
  response.json({ data: { rules } });
});

export const replace = asyncHandler(async (request, response) => {
  const rules = await dietaryRuleService.replaceRules(
    request.user.id,
    request.body.rules
  );
  response.json({ data: { rules } });
});

