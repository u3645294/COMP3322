import { describe, it, expect } from "vitest";
import {
  addFavoriteSchema,
  recipeIdParamSchema
} from "../../src/modules/favorites/favorite.schemas.js";

describe("addFavoriteSchema", () => {
  it("accepts a positive integer recipeId", () => {
    expect(addFavoriteSchema.safeParse({ recipeId: 5 }).success).toBe(true);
  });

  it("coerces a numeric string", () => {
    const result = addFavoriteSchema.safeParse({ recipeId: "42" });
    expect(result.success).toBe(true);
    expect(result.data.recipeId).toBe(42);
  });

  it("rejects zero", () => {
    expect(addFavoriteSchema.safeParse({ recipeId: 0 }).success).toBe(false);
  });

  it("rejects negative", () => {
    expect(addFavoriteSchema.safeParse({ recipeId: -1 }).success).toBe(false);
  });

  it("rejects non-numeric", () => {
    expect(addFavoriteSchema.safeParse({ recipeId: "abc" }).success).toBe(false);
  });

  it("rejects missing recipeId", () => {
    expect(addFavoriteSchema.safeParse({}).success).toBe(false);
  });
});

describe("recipeIdParamSchema", () => {
  it("accepts a numeric string", () => {
    const result = recipeIdParamSchema.safeParse({ recipeId: "7" });
    expect(result.success).toBe(true);
    expect(result.data.recipeId).toBe(7);
  });

  it("rejects zero", () => {
    expect(recipeIdParamSchema.safeParse({ recipeId: 0 }).success).toBe(false);
  });
});

