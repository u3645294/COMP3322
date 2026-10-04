import { describe, it, expect, beforeEach } from "vitest";
import { api, registerUser, truncateAll, anyIngredientId } from "../helpers.js";

beforeEach(truncateAll);

describe("pantry integration", () => {
  it("returns an empty pantry for a new user", async () => {
    const { agent } = await registerUser();
    const response = await agent.get("/api/v1/pantry-items");
    expect(response.status).toBe(200);
    expect(response.body.data.pantryItems).toEqual([]);
  });

  it("creates an item", async () => {
    const ingredientId = await anyIngredientId();
    const { agent } = await registerUser();
    const response = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 3, unit: "piece" });
    expect(response.status).toBe(201);
    expect(response.body.data.pantryItem.ingredientId).toBe(ingredientId);
    expect(response.body.data.pantryItem.quantity).toBe(3);
    expect(response.body.data.pantryItem.unit).toBe("piece");
    expect(response.body.data.pantryItem.canonicalName).toEqual(expect.any(String));
    const listed = await agent.get("/api/v1/pantry-items");
    expect(listed.body.data.pantryItems[0].canonicalName).toBe(response.body.data.pantryItem.canonicalName);
  });

  it("rejects a duplicate ingredient with 409", async () => {
    const ingredientId = await anyIngredientId();
    const { agent } = await registerUser();
    await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 1, unit: "piece" });
    const response = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 2, unit: "piece" });
    expect(response.status).toBe(409);
  });

  it("rejects zero quantity with 400", async () => {
    const ingredientId = await anyIngredientId();
    const { agent } = await registerUser();
    const response = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 0, unit: "piece" });
    expect(response.status).toBe(400);
  });

  it("rejects an unsupported unit with 400", async () => {
    const ingredientId = await anyIngredientId();
    const { agent } = await registerUser();
    const response = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 1, unit: "handful" });
    expect(response.status).toBe(400);
  });

  it("rejects a nonexistent ingredient with 422", async () => {
    const { agent } = await registerUser();
    const response = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId: 999999, quantity: 1, unit: "piece" });
    expect(response.status).toBe(422);
  });

  it("updates an item", async () => {
    const ingredientId = await anyIngredientId();
    const { agent } = await registerUser();
    const created = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 1, unit: "piece" });
    const id = created.body.data.pantryItem.id;
    const response = await agent
      .patch(`/api/v1/pantry-items/${id}`)
      .send({ quantity: 5 });
    expect(response.status).toBe(200);
    expect(response.body.data.pantryItem.quantity).toBe(5);
  });

  it("deletes an item", async () => {
    const ingredientId = await anyIngredientId();
    const { agent } = await registerUser();
    const created = await agent
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 1, unit: "piece" });
    const id = created.body.data.pantryItem.id;
    const del = await agent.delete(`/api/v1/pantry-items/${id}`);
    expect(del.status).toBe(204);
    const list = await agent.get("/api/v1/pantry-items");
    expect(list.body.data.pantryItems).toEqual([]);
  });

  it("does not allow one user to see another user's pantry", async () => {
    const ingredientId = await anyIngredientId();
    const { agent: a } = await registerUser();
    const { agent: b } = await registerUser();
    await a
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 1, unit: "piece" });

    const response = await b.get("/api/v1/pantry-items");
    expect(response.body.data.pantryItems).toEqual([]);
  });

  it("returns 404 when accessing another user's item", async () => {
    const ingredientId = await anyIngredientId();
    const { agent: a } = await registerUser();
    const { agent: b } = await registerUser();
    const created = await a
      .post("/api/v1/pantry-items")
      .send({ ingredientId, quantity: 1, unit: "piece" });
    const id = created.body.data.pantryItem.id;

    const patch = await b
      .patch(`/api/v1/pantry-items/${id}`)
      .send({ quantity: 9 });
    expect(patch.status).toBe(404);

    const del = await b.delete(`/api/v1/pantry-items/${id}`);
    expect(del.status).toBe(404);
  });

  it("rejects unauthenticated requests with 401", async () => {
    const response = await api().get("/api/v1/pantry-items");
    expect(response.status).toBe(401);
  });
});

