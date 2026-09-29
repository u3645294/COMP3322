import { database } from "../../db/database.js";

export async function listByUser(userId) {
  return database("user_dietary_rules")
    .select(
      "id",
      "rule_type as ruleType",
      "rule_value as ruleValue",
      "created_at as createdAt"
    )
    .where({ user_id: userId })
    .orderBy("rule_type")
    .orderBy("rule_value");
}

export async function replaceAll(userId, rules) {
  return database.transaction(async (trx) => {
    await trx("user_dietary_rules").where({ user_id: userId }).del();

    if (rules.length > 0) {
      await trx("user_dietary_rules").insert(
        rules.map((rule) => ({
          user_id: userId,
          rule_type: rule.ruleType,
          rule_value: rule.ruleValue
        }))
      );
    }

    return trx("user_dietary_rules")
      .select(
        "id",
        "rule_type as ruleType",
        "rule_value as ruleValue",
        "created_at as createdAt"
      )
      .where({ user_id: userId })
      .orderBy("rule_type")
      .orderBy("rule_value");
  });
}

