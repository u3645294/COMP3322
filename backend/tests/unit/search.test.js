import { describe, it, expect } from "vitest";
import {
  listSearchesSchema,
  searchIdSchema
} from "../../src/modules/search/search.schemas.js";

describe("listSearchesSchema", () => {
  it("applies defaults", () => {
    const result = listSearchesSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(20);
    expect(result.data.offset).toBe(0);
  });

  it("coerces strings", () => {
    const result = listSearchesSchema.safeParse({ limit: "10", offset: "3" });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(10);
    expect(result.data.offset).toBe(3);
  });

  it("rejects limit > 100", () => {
    expect(listSearchesSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("rejects negative offset", () => {
    expect(listSearchesSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
});

describe("searchIdSchema", () => {
  it("accepts a positive integer", () => {
    expect(searchIdSchema.safeParse({ id: 1 }).success).toBe(true);
  });

  it("rejects zero", () => {
    expect(searchIdSchema.safeParse({ id: 0 }).success).toBe(false);
  });

  it("rejects non-numeric", () => {
    expect(searchIdSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});

