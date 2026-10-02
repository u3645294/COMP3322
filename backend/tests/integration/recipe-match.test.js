import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { database } from "../../src/db/database.js";
import {
  api, registerUser, truncateAll, findIngredientIdByName, findRecipeIdByTitle
} from "../helpers.js";

const endpoint = "/api/v1/recipe-matches";
const fixtureIds = [];
let butterId;
let tomatoId;
let eggYolkId;

beforeAll(async () => {
  butterId = await findIngredientIdByName("butter");
  tomatoId = await findIngredientIdByName("tomato");
  await database("ingredient_aliases").insert({ ingredient_id: butterId, alias: "matcher butter alias" });
  // High-scoring but forbidden recipes must not crowd out allowed results.
  for (let i = 0; i < 25; i++) {
    const [id] = await database("recipes").insert({
      title: `Matcher optional butter ${i}`, tags: JSON.stringify(["vegetarian", "matcher-preferred"])
    });
    fixtureIds.push(id);
    await database("recipe_ingredients").insert([
      { recipe_id: id, ingredient_id: tomatoId, quantity: 1, unit: "piece", optional: false },
      { recipe_id: id, ingredient_id: butterId, quantity: 1, unit: "piece", optional: true }
    ]);
  }
  [eggYolkId] = await database("ingredients").insert({ canonical_name: "egg yolk", category: "Protein" });
  const [eggRecipeId] = await database("recipes").insert({
    title: "Matcher egg yolk recipe", tags: JSON.stringify(["vegetarian"])
  });
  fixtureIds.push(eggRecipeId);
  await database("recipe_ingredients").insert([
    { recipe_id: eggRecipeId, ingredient_id: tomatoId, quantity: 1, unit: "piece", optional: false },
    { recipe_id: eggRecipeId, ingredient_id: eggYolkId, quantity: 1, unit: "piece", optional: true }
  ]);
});

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  if (fixtureIds.length) await database("recipes").whereIn("id", fixtureIds).del();
  await database("ingredient_aliases").where({ alias: "matcher butter alias" }).del();
  if (eggYolkId) await database("ingredients").where({ id: eggYolkId }).del();
});

async function bodyWithPantry(names, extra = {}) {
  return {
    client_obj: {
      pantry: await Promise.all(names.map(async (name) => ({
        ingredient_id: await findIngredientIdByName(name), amount: 1000, unit: "g"
      })))
    },
    ...extra
  };
}

function titles(response) {
  expect(response.status).toBe(200);
  return response.body.match.recipes.map((recipe) => recipe.title);
}

describe("SQL recipe matching dietary rules", () => {
  it("requires a login session", async () => {
    expect((await api().post(endpoint).send({ client_obj: {} })).status).toBe(401);
  });

  it("returns the exact database IDs and titles for ranked recipes", async () => {
    const { agent } = await registerUser();
    const response = await agent.post(endpoint).send(await bodyWithPantry(["tomato"], {
      preference_list: { tags: ["matcher-preferred"] }
    }));
    expect(response.status).toBe(200);
    const recipes = response.body.match.recipes;
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.some((recipe) => fixtureIds.includes(recipe.recipeId))).toBe(true);
    const stored = await database("recipes").select("id", "title").whereIn("id", recipes.map((recipe) => recipe.recipeId));
    const titlesById = new Map(stored.map((recipe) => [recipe.id, recipe.title]));
    for (const recipe of recipes) {
      expect(Number.isSafeInteger(recipe.recipeId)).toBe(true);
      expect(titlesById.get(recipe.recipeId)).toBe(recipe.title);
    }
  });

  it("returns database IDs in liked order and omits nonexistent IDs", async () => {
    const { agent } = await registerUser();
    const ids = [fixtureIds[2], fixtureIds[0]];
    const response = await agent.post(endpoint).send({
      client_obj: { pantry: [], liked_recipe_ids: [ids[0], Number.MAX_SAFE_INTEGER, ids[1]] }
    });
    expect(response.status).toBe(200);
    expect(response.body.match.status).toBe(false);
    expect(response.body.match.likedRecipes).toEqual([
      { recipeId: ids[0], title: "Matcher optional butter 2" },
      { recipeId: ids[1], title: "Matcher optional butter 0" }
    ]);
  });

  it("rejects demo string IDs in liked_recipe_ids", async () => {
    const { agent } = await registerUser();
    const response = await agent.post(endpoint).send({
      client_obj: { pantry: [], liked_recipe_ids: ["tomato-egg"] }
    });
    expect(response.status).toBe(400);
  });

  it("combines saved rules with a single supplied rule and scopes saved rules to the user", async () => {
    const { agent } = await registerUser();
    const { agent: other } = await registerUser();
    await agent.put("/api/v1/dietary-rules").send({
      rules: [{ ruleType: "allergy", ruleValue: " BUTTER " }]
    }).expect(200);
    const body = await bodyWithPantry(["pasta"], {
      dietary_rules: { ruleType: "excluded_ingredient", ruleValue: "cheese" }
    });
    const matches = titles(await agent.post(endpoint).send(body));
    expect(matches).toContain("Simple Tomato Pasta");
    expect(matches).not.toContain("Garlic Butter Pasta");
    expect(matches).not.toContain("Creamy Spinach Pasta");
    expect(titles(await other.post(endpoint).send(body))).toContain("Garlic Butter Pasta");
  });

  it("an empty supplied rules object cannot remove saved vegetarian rules", async () => {
    const { agent } = await registerUser();
    await agent.put("/api/v1/dietary-rules").send({
      rules: [{ ruleType: "diet", ruleValue: "Vegetarian" }]
    }).expect(200);
    const response = await agent.post(endpoint).send(await bodyWithPantry(["pasta", "chicken breast"], {
      dietary_rules: { rules: [] }
    }));
    expect(titles(response)).toContain("Simple Tomato Pasta");
    expect(titles(response)).not.toContain("Chicken Rice Bowl");
    expect(titles(response)).not.toContain("Garlic Butter Pasta");
  });

  it("applies supplied vegan rules to exclude dairy and eggs", async () => {
    const { agent } = await registerUser();
    const body = await bodyWithPantry(["pasta", "mushroom", "tomato"], {
      dietary_rules: { rules: [{ ruleType: "diet", ruleValue: "VEGAN" }] }
    });
    const matches = titles(await agent.post(endpoint).send(body));
    expect(matches).toContain("Simple Tomato Pasta");
    expect(matches).not.toContain("Creamy Spinach Pasta");
    expect(matches).not.toContain("Mushroom Omelette");
    expect(matches).not.toContain("Matcher egg yolk recipe");
    expect(matches).not.toContain("Matcher optional butter 0");
  });

  it("filters optional ingredients and aliases before the ranked result limit", async () => {
    const { agent } = await registerUser();
    const response = await agent.post(endpoint).send(await bodyWithPantry(["tomato"], {
      preference_list: { tags: ["matcher-preferred"] },
      dietary_rules: { ruleType: "allergy", ruleValue: "MATCHER BUTTER ALIAS" }
    }));
    expect(titles(response)).toContain("Tomato Basil Salad");
    expect(titles(response).some((title) => title.startsWith("Matcher optional butter"))).toBe(false);
  });

  it("excludes egg yolks independently of dairy in vegan fallback recipes", async () => {
    const { agent } = await registerUser();
    const body = {
      client_obj: { pantry: [], liked_recipe_ids: [fixtureIds.at(-1)] },
      dietary_rules: { ruleType: "diet", ruleValue: "vegetarian" }
    };
    const vegetarian = await agent.post(endpoint).send(body);
    expect(vegetarian.status).toBe(200);
    expect(vegetarian.body.match.likedRecipes).toHaveLength(1);
    body.dietary_rules.ruleValue = "vegan";
    const vegan = await agent.post(endpoint).send(body);
    expect(vegan.status).toBe(200);
    expect(vegan.body.match.likedRecipes).toEqual([]);
  });

  it("requires catalog tags for other diets rather than ignoring the restriction", async () => {
    const { agent } = await registerUser();
    const body = await bodyWithPantry(["pasta"], {
      dietary_rules: { ruleType: "diet", ruleValue: "QUICK" }
    });
    expect(titles(await agent.post(endpoint).send(body))).toContain("Garlic Butter Pasta");
    expect(titles(await agent.post(endpoint).send(body))).not.toContain("Simple Tomato Pasta");
    body.dietary_rules.ruleValue = "unclassified diet";
    body.client_obj.liked_recipe_ids = [await findRecipeIdByTitle("Simple Tomato Pasta")];
    const response = await agent.post(endpoint).send(body);
    expect(response.status).toBe(200);
    expect(response.body.match).toEqual({ status: false, recipes: [], likedRecipes: [] });
  });

  it("applies saved and supplied rules to liked-recipe fallback results", async () => {
    const { agent } = await registerUser();
    await agent.put("/api/v1/dietary-rules").send({
      rules: [{ ruleType: "allergy", ruleValue: "butter" }]
    }).expect(200);
    const likedIds = await Promise.all([
      "Garlic Butter Pasta", "Chicken Rice Bowl", "Creamy Spinach Pasta", "Simple Tomato Pasta"
    ].map(findRecipeIdByTitle));
    const response = await agent.post(endpoint).send({
      client_obj: { pantry: [], liked_recipe_ids: likedIds },
      dietary_rules: { rules: [{ ruleType: "diet", ruleValue: "vegan" }] }
    });
    expect(response.status).toBe(200);
    expect(response.body.match.status).toBe(false);
    expect(response.body.match.likedRecipes.map((recipe) => recipe.title)).toEqual(["Simple Tomato Pasta"]);
  });

  it("filters liked recipes before their result limit", async () => {
    const { agent } = await registerUser();
    const allowedId = await findRecipeIdByTitle("Tomato Basil Salad");
    const response = await agent.post(endpoint).send({
      client_obj: { pantry: [], liked_recipe_ids: [...fixtureIds.slice(0, 25), allowedId] },
      dietary_rules: { ruleType: "excluded_ingredient", ruleValue: "butter" }
    });
    expect(response.status).toBe(200);
    expect(response.body.match.likedRecipes).toEqual([{ recipeId: allowedId, title: "Tomato Basil Salad" }]);
  });

  it.each([
    { ruleType: "invalid", ruleValue: "butter" },
    { ruleType: "allergy", ruleValue: "" },
    { rules: [{ ruleType: "allergy", ruleValue: "butter" }, { ruleType: "allergy", ruleValue: "BUTTER" }] },
    { rules: Array.from({ length: 51 }, (_, i) => ({ ruleType: "allergy", ruleValue: `ingredient ${i}` })) },
    { rules: [], userId: 1 },
    null
  ])("rejects malformed supplied dietary rules: %j", async (dietary_rules) => {
    const { agent } = await registerUser();
    expect((await agent.post(endpoint).send({ client_obj: {}, dietary_rules })).status).toBe(400);
  });
});
