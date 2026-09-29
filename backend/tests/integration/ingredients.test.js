import { describe, it, expect } from "vitest";
import { api } from "../helpers.js";

describe("ingredients integration", () => {
  it("finds a canonical ingredient", async () => {
    const response = await api()
      .get("/api/v1/ingredients")
      .query({ query: "tomato" });
    expect(response.status).toBe(200);
    const names = response.body.data.ingredients.map((i) => i.canonicalName);
    expect(names).toContain("tomato");
  });

  it("finds by alias", async () => {
    const response = await api()
      .get("/api/v1/ingredients")
      .query({ query: "scallion" });
    expect(response.status).toBe(200);
    const names = response.body.data.ingredients.map((i) => i.canonicalName);
    expect(names).toContain("green onion");
  });

  it("is case-insensitive", async () => {
    const response = await api()
      .get("/api/v1/ingredients")
      .query({ query: "TOMATO" });
    expect(response.status).toBe(200);
    expect(response.body.data.ingredients.length).toBeGreaterThan(0);
  });

  it("rejects empty query", async () => {
    const response = await api()
      .get("/api/v1/ingredients")
      .query({ query: "" });
    expect(response.status).toBe(400);
  });

  it("rejects missing query", async () => {
    const response = await api().get("/api/v1/ingredients");
    expect(response.status).toBe(400);
  });

  it("limits results to 10", async () => {
    const response = await api()
      .get("/api/v1/ingredients")
      .query({ query: "a" });
    expect(response.status).toBe(200);
    expect(response.body.data.ingredients.length).toBeLessThanOrEqual(10);
  });

  it("returns empty list when nothing matches", async () => {
    const response = await api()
      .get("/api/v1/ingredients")
      .query({ query: "zzzzzz" });
    expect(response.status).toBe(200);
    expect(response.body.data.ingredients).toEqual([]);
  });
});

