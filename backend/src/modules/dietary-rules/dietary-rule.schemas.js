import { z } from "zod";

export const RULE_TYPES = ["diet", "allergy", "excluded_ingredient"];

export const dietaryRuleSchema = z
  .object({
    ruleType: z
      .string()
      .refine((value) => RULE_TYPES.includes(value), {
        message: `Rule type must be one of: ${RULE_TYPES.join(", ")}.`
      }),
    ruleValue: z
      .string()
      .trim()
      .min(1, "Rule value is required.")
      .max(100, "Rule value must be at most 100 characters.")
  })
  .strict();

export const replaceDietaryRulesSchema = z.object({
  rules: z
    .array(dietaryRuleSchema)
    .max(50, "At most 50 rules allowed.")
    .refine(
      (rules) => {
        const seen = new Set();
        for (const rule of rules) {
          const key = `${rule.ruleType}::${rule.ruleValue.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      },
      { message: "Duplicate rules are not allowed." }
    )
});
