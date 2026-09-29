import { describe, it, expect } from "vitest";
import { api } from "../helpers.js";

describe("recipes integration (public)", () => {
  it("lists recipes with pagination metadata", async () => {
    const response = await api().get("/api/v1/recipes?limit=5");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.recipes)).toBe(true);
    expect(response.body.data.recipes.length).toBeLessThanOrEqual(5);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(30);
    expect(response.body.meta.limit).toBe(5);
    expect(response.body.meta.offset).toBe(0);
  });

  it("defaults limit to 20 when not provided", async () => {
    const response = await api().get("/api/v1/recipes");
    expect(response.status).toBe(200);
    expect(response.body.meta.limit).toBe(20);
  });

  it("supports offset", async () => {
    const first = await api().get("/api/v1/recipes?limit=3&offset=0");
    const second = await api().get("/api/v1/recipes?limit=3&offset=3");
    const firstIds = first.body.data.recipes.map((r) => r.id);
    const secondIds = second.body.data.recipes.map((r) => r.id);
    expect(firstIds).not.toEqual(secondIds);
  });

  it("rejects limit above 100 with 400", async () => {
    const response = await api().get("/api/v1/recipes?limit=101");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects negative offset with 400", async () => {
    const response = await api().get("/api/v1/recipes?offset=-1");
    expect(response.status).toBe(400);
  });

  it("returns a single recipe with ingredients and steps", async () => {
    const list = await api().get("/api/v1/recipes?limit=1");
    const recipeId = list.body.data.recipes[0].id;

    const response = await api().get(`/api/v1/recipes/${recipeId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.recipe.id).toBe(recipeId);
    expect(Array.isArray(response.body.data.recipe.ingredients)).toBe(true);
    expect(Array.isArray(response.body.data.recipe.steps)).toBe(true);
  });

  it("returns 404 for a nonexistent recipe", async () => {
    const response = await api().get("/api/v1/recipes/99999999");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects non-numeric id with 400", async () => {
    const response = await api().get("/api/v1/recipes/abc");
    expect(response.status).toBe(400);
  });

  it("does not require authentication", async () => {
    const response = await api().get("/api/v1/recipes");
    expect(response.status).toBe(200);
  });
});

