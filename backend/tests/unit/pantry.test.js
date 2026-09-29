import { describe, it, expect } from "vitest";
import {
  createPantryItemSchema,
  updatePantryItemSchema,
  SUPPORTED_UNITS
} from "../../src/modules/pantry/pantry.schemas.js";

describe("createPantryItemSchema", () => {
  it("accepts valid item", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      quantity: 3,
      unit: "piece"
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      quantity: 0,
      unit: "piece"
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      quantity: -1,
      unit: "piece"
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing quantity", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      unit: "piece"
    });
    expect(result.success).toBe(true);
  });

  it("accepts every supported unit", () => {
    for (const unit of SUPPORTED_UNITS) {
      const result = createPantryItemSchema.safeParse({
        ingredientId: 213,
        unit
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unsupported unit", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      unit: "handful"
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid calendar date", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      unit: "piece",
      expiresOn: "2026-02-30"
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid ISO date", () => {
    const result = createPantryItemSchema.safeParse({
      ingredientId: 213,
      unit: "piece",
      expiresOn: "2026-12-31"
    });
    expect(result.success).toBe(true);
  });
});

describe("updatePantryItemSchema", () => {
  it("rejects empty update", () => {
    expect(updatePantryItemSchema.safeParse({}).success).toBe(false);
  });

  it("accepts quantity-only update", () => {
    expect(updatePantryItemSchema.safeParse({ quantity: 5 }).success).toBe(true);
  });

  it("rejects unknown fields", () => {
    expect(updatePantryItemSchema.safeParse({ bogus: 1 }).success).toBe(false);
  });
});

