import { describe, it, expect } from "vitest";
import {
  listRecipesSchema,
  recipeIdSchema
} from "../../src/modules/recipes/recipe.schemas.js";

describe("listRecipesSchema", () => {
  it("applies default limit and offset", () => {
    const result = listRecipesSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(20);
    expect(result.data.offset).toBe(0);
  });

  it("coerces numeric strings", () => {
    const result = listRecipesSchema.safeParse({ limit: "5", offset: "10" });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(5);
    expect(result.data.offset).toBe(10);
  });

  it("rejects limit below 1", () => {
    expect(listRecipesSchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it("rejects limit above 100", () => {
    expect(listRecipesSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("rejects negative offset", () => {
    expect(listRecipesSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
});

describe("recipeIdSchema", () => {
  it("accepts a positive integer", () => {
    expect(recipeIdSchema.safeParse({ id: 5 }).success).toBe(true);
  });

  it("coerces a numeric string", () => {
    const result = recipeIdSchema.safeParse({ id: "42" });
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(42);
  });

  it("rejects zero", () => {
    expect(recipeIdSchema.safeParse({ id: 0 }).success).toBe(false);
  });

  it("rejects negative", () => {
    expect(recipeIdSchema.safeParse({ id: -3 }).success).toBe(false);
  });

  it("rejects non-numeric string", () => {
    expect(recipeIdSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});

