import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it, expect, vi } from "vitest";

const source = readFileSync(new URL("../../../Alpha website/recipe_script.js", import.meta.url), "utf8");

function browser(recipes = []) {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ match: { status: true, recipes: [] } }) }));
  const context = vm.createContext({
    window: { location: { search: "", hostname: "localhost", port: "8080", protocol: "http:" } },
    document: { getElementById: () => ({ innerHTML: "" }) },
    RECIPES: recipes, URLSearchParams, fetch,
    localStorage: { getItem: () => "[]" }
  });
  vm.runInContext(source, context);
  return { match: context.window.match_recipe, fetch };
}

describe("match_recipe browser dietary-rule input", () => {
  it.each([
    { status: true, recipes: [{ recipeId: 700019, title: "Tomato Egg", missingIngredients: {}, tags: [], recommendIndex: 120 }] },
    { status: false, recipes: [], likedRecipes: [{ recipeId: 700019, title: "Tomato Egg" }] }
  ])("preserves database recipe IDs instead of substituting demo IDs: %j", async (result) => {
    const { match, fetch } = browser([{ id: "tomato-egg", name: "Tomato Egg" }]);
    fetch.mockResolvedValue({ ok: true, json: async () => ({ match: result }) });
    await expect(match({ pantry: [], liked_recipe_ids: [700019] })).resolves.toBe(result);
    expect(JSON.parse(fetch.mock.calls[0][1].body).client_obj.liked_recipe_ids).toEqual([700019]);
  });

  it.each([
    { ruleType: "allergy", ruleValue: "butter" },
    { rules: [{ ruleType: "diet", ruleValue: "vegetarian" }] }
  ])("sends the third argument with session credentials: %j", async (rules) => {
    const { match, fetch } = browser();
    await match({ pantry: [] }, {}, rules);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/v1/recipe-matches");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body).dietary_rules).toEqual(rules);
  });

  it("accepts rules on the client object, with the third argument taking precedence", async () => {
    const { match, fetch } = browser();
    const dietary_rules = { ruleType: "allergy", ruleValue: "butter" };
    await match({ pantry: [], dietary_rules });
    expect(JSON.parse(fetch.mock.calls[0][1].body).dietary_rules).toEqual(dietary_rules);
    await match({ pantry: [], dietary_rules }, {}, { rules: [] });
    expect(JSON.parse(fetch.mock.calls[1][1].body).dietary_rules).toEqual({ rules: [] });
  });

  it("keeps existing two-argument calls working", async () => {
    const { match, fetch } = browser();
    await expect(match({ pantry: [] }, [1, "quick"])).resolves.toEqual({ status: true, recipes: [] });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      dietary_rules: { rules: [] }, preference_list: { ingredient_ids: [1], tags: ["quick"] }
    });
  });

  it("surfaces missing-login errors", async () => {
    const { match, fetch } = browser();
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: "Authentication required." } }) });
    await expect(match({ pantry: [] })).rejects.toThrow("Authentication required.");
  });
});
