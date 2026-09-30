import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  api,
  registerUser,
  truncateAll,
  findIngredientIdByName
} from "../helpers.js";

beforeEach(truncateAll);
afterAll(truncateAll);

async function addPantryItems(agent, names) {
  for (const name of names) {
    const id = await findIngredientIdByName(name);
    const response = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId: id, quantity: 1, unit: "piece" });
    if (response.status !== 201) {
      throw new Error(
        `Failed to add pantry item ${name}: ${response.status} ${JSON.stringify(response.body)}`
      );
    }
  }
}

describe("search integration", () => {
  it("returns empty results with an empty pantry", async () => {
    const { agent } = await registerUser();
    const response = await agent.post("/api/v1/search");
    expect(response.status).toBe(200);
    expect(response.body.data.results).toEqual([]);
    expect(response.body.meta.count).toBe(0);
    expect(typeof response.body.data.searchId).toBe("number");
  });

  it("requires authentication", async () => {
    const response = await api().post("/api/v1/search");
    expect(response.status).toBe(401);
  });

  it("ranks recipes by coverage", async () => {
    const { agent } = await registerUser();
    await addPantryItems(agent, ["pasta", "butter", "garlic"]);

    const response = await agent.post("/api/v1/search");
    expect(response.status).toBe(200);

    const results = response.body.data.results;
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    expect(first.title).toBe("Garlic Butter Pasta");
    expect(first.coverage).toBeCloseTo(0.6, 3);
    expect(first.matchedCount).toBe(3);
    expect(first.requiredCount).toBe(5);
  });

  it("excludes recipes with an allergenic ingredient", async () => {
    const { agent } = await registerUser();
    await addPantryItems(agent, ["pasta", "butter", "garlic"]);

    await agent.put("/api/v1/dietary-rules").send({
      rules: [{ ruleType: "allergy", ruleValue: "butter" }]
    });

    const response = await agent.post("/api/v1/search");
    const titles = response.body.data.results.map((r) => r.title);
    expect(titles).not.toContain("Garlic Butter Pasta");
  });

  it("filters by vegetarian diet rule", async () => {
    const { agent } = await registerUser();
    await addPantryItems(agent, ["rice"]);

    const before = await agent.post("/api/v1/search");
    const beforeTitles = before.body.data.results.map((r) => r.title);
    expect(beforeTitles).toContain("Chicken Rice Bowl");
    expect(beforeTitles).toContain("Rice and Beans");

    await agent.put("/api/v1/dietary-rules").send({
      rules: [{ ruleType: "diet", ruleValue: "vegetarian" }]
    });

    const after = await agent.post("/api/v1/search");
    const afterTitles = after.body.data.results.map((r) => r.title);
    expect(afterTitles).not.toContain("Chicken Rice Bowl");
    expect(afterTitles).toContain("Rice and Beans");

    for (const recipe of after.body.data.results) {
      expect(recipe.tags).toContain("vegetarian");
    }
  });

  it("records search history", async () => {
    const { agent } = await registerUser();
    await addPantryItems(agent, ["pasta", "butter", "garlic"]);
    await agent.post("/api/v1/search");

    const response = await agent.get("/api/v1/search-history");
    expect(response.status).toBe(200);
    expect(response.body.data.searches.length).toBeGreaterThanOrEqual(1);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it("returns a specific search with snapshots and results", async () => {
    const { agent } = await registerUser();
    await addPantryItems(agent, ["pasta", "butter", "garlic"]);
    const search = await agent.post("/api/v1/search");
    const searchId = search.body.data.searchId;

    const response = await agent.get(`/api/v1/search-history/${searchId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.search.id).toBe(searchId);
    expect(Array.isArray(response.body.data.search.pantrySnapshot)).toBe(true);
    expect(Array.isArray(response.body.data.search.rulesSnapshot)).toBe(true);
    expect(response.body.data.search.results.length).toBeGreaterThan(0);
  });

  it("returns 404 when accessing another user's search", async () => {
    const { agent: a } = await registerUser();
    const { agent: b } = await registerUser();
    const search = await a.post("/api/v1/search");
    const searchId = search.body.data.searchId;

    const response = await b.get(`/api/v1/search-history/${searchId}`);
    expect(response.status).toBe(404);
  });

  it("requires authentication for search history", async () => {
    const response = await api().get("/api/v1/search-history");
    expect(response.status).toBe(401);
  });
});

