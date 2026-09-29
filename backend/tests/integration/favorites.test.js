import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  api,
  registerUser,
  truncateAll,
  findRecipeIdByTitle
} from "../helpers.js";

beforeEach(truncateAll);
afterAll(truncateAll);

describe("favorites integration", () => {
  it("returns empty favorites for a new user", async () => {
    const { agent } = await registerUser();
    const response = await agent.get("/api/v1/favorites");
    expect(response.status).toBe(200);
    expect(response.body.data.favorites).toEqual([]);
    expect(response.body.meta.count).toBe(0);
  });

  it("adds a favorite with 201", async () => {
    const { agent } = await registerUser();
    const recipeId = await findRecipeIdByTitle("Avocado Toast");

    const response = await agent
      .post("/api/v1/favorites")
      .send({ recipeId });

    expect(response.status).toBe(201);
    expect(response.body.data.favorite.recipeId).toBe(recipeId);
  });

  it("is idempotent: adding twice returns 200", async () => {
    const { agent } = await registerUser();
    const recipeId = await findRecipeIdByTitle("Avocado Toast");

    await agent.post("/api/v1/favorites").send({ recipeId });
    const second = await agent.post("/api/v1/favorites").send({ recipeId });

    expect(second.status).toBe(200);
    expect(second.body.data.favorite.recipeId).toBe(recipeId);
  });

  it("lists favorites with recipe details", async () => {
    const { agent } = await registerUser();
    const recipeId = await findRecipeIdByTitle("Avocado Toast");
    await agent.post("/api/v1/favorites").send({ recipeId });

    const response = await agent.get("/api/v1/favorites");
    expect(response.status).toBe(200);
    expect(response.body.data.favorites).toHaveLength(1);

    const favorite = response.body.data.favorites[0];
    expect(favorite.recipeId).toBe(recipeId);
    expect(favorite.title).toBe("Avocado Toast");
    expect(Array.isArray(favorite.tags)).toBe(true);
  });

  it("rejects a nonexistent recipe with 422", async () => {
    const { agent } = await registerUser();
    const response = await agent
      .post("/api/v1/favorites")
      .send({ recipeId: 99999999 });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("DOMAIN_RULE_ERROR");
  });

  it("rejects invalid body with 400", async () => {
    const { agent } = await registerUser();
    const response = await agent
      .post("/api/v1/favorites")
      .send({ recipeId: "abc" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("deletes a favorite with 204, then 404", async () => {
    const { agent } = await registerUser();
    const recipeId = await findRecipeIdByTitle("Avocado Toast");
    await agent.post("/api/v1/favorites").send({ recipeId });

    const del = await agent.delete(`/api/v1/favorites/${recipeId}`);
    expect(del.status).toBe(204);

    const delAgain = await agent.delete(`/api/v1/favorites/${recipeId}`);
    expect(delAgain.status).toBe(404);
  });

  it("isolates favorites between users", async () => {
    const { agent: a } = await registerUser();
    const { agent: b } = await registerUser();
    const recipeId = await findRecipeIdByTitle("Avocado Toast");

    await a.post("/api/v1/favorites").send({ recipeId });

    const bList = await b.get("/api/v1/favorites");
    expect(bList.body.data.favorites).toEqual([]);
  });

  it("prevents one user deleting another user's favorite", async () => {
    const { agent: a } = await registerUser();
    const { agent: b } = await registerUser();
    const recipeId = await findRecipeIdByTitle("Avocado Toast");

    await a.post("/api/v1/favorites").send({ recipeId });

    const response = await b.delete(`/api/v1/favorites/${recipeId}`);
    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await api().get("/api/v1/favorites");
    expect(response.status).toBe(401);
  });
});

