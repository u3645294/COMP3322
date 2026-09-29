import * as dietaryRuleRepo from "./dietary-rule.repository.js";

export async function listRules(userId) {
  return dietaryRuleRepo.listByUser(userId);
}

export async function replaceRules(userId, rules) {
  const normalized = rules.map((rule) => ({
    ruleType: rule.ruleType,
    ruleValue: rule.ruleValue.trim()
  }));

  return dietaryRuleRepo.replaceAll(userId, normalized);
}

/**
 * Used by Backend Member 2 for recipe matching.
 */
export async function getUserDietaryRules(userId) {
  return dietaryRuleRepo.listByUser(userId);
}

