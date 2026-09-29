import { describe, it, expect } from "vitest";
import { replaceDietaryRulesSchema } from "../../src/modules/dietary-rules/dietary-rule.schemas.js";

describe("replaceDietaryRulesSchema", () => {
  it("accepts valid rules", () => {
    const result = replaceDietaryRulesSchema.safeParse({
      rules: [
        { ruleType: "diet", ruleValue: "vegetarian" },
        { ruleType: "allergy", ruleValue: "peanut" }
      ]
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty list", () => {
    expect(
      replaceDietaryRulesSchema.safeParse({ rules: [] }).success
    ).toBe(true);
  });

  it("rejects unknown rule type", () => {
    const result = replaceDietaryRulesSchema.safeParse({
      rules: [{ ruleType: "nonsense", ruleValue: "x" }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty rule value", () => {
    const result = replaceDietaryRulesSchema.safeParse({
      rules: [{ ruleType: "diet", ruleValue: "" }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects case-insensitive duplicates", () => {
    const result = replaceDietaryRulesSchema.safeParse({
      rules: [
        { ruleType: "diet", ruleValue: "vegetarian" },
        { ruleType: "diet", ruleValue: "Vegetarian" }
      ]
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown field inside a rule", () => {
    const result = replaceDietaryRulesSchema.safeParse({
      rules: [{ ruleType: "diet", ruleValue: "vegan", extra: 1 }]
    });
    expect(result.success).toBe(false);
  });
});

