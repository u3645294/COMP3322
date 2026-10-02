import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import knex from "knex";
import { parseCsv, validateRecipes } from "../scripts/recipe-csv.js";
import { importRecipes } from "../scripts/import-recipes.js";
import { up as ingredientMigration } from "../src/db/migrations/20260928161938_002_ingredients_and_aliases.js";
import { up as recipeMigration } from "../src/db/migrations/20260929133135_005_recipes.js";

const csv = await readFile(fileURLToPath(new URL("../data/recipes.csv", import.meta.url)), "utf8");
const recipes = validateRecipes(csv);

test("CSV preserves quotes, commas, Unicode and newlines in instructions", () => {
  assert.deepEqual(parseCsv('\uFEFFname,instruction\r\n"crème","Mix, then say ""done"".\nServe."\r\n'), [
    { name: "crème", instruction: 'Mix, then say "done".\nServe.' }
  ]);
  assert.throws(() => parseCsv('a,b\n"unclosed,b'), /Unclosed/);
  assert.throws(() => parseCsv('a,b\n"quoted"trailing,b'), /Unexpected/);
});

test("100 recipes satisfy both quotas and missing metadata stays NULL", () => {
  assert.equal(recipes.length, 100);
  assert.ok(recipes.every((r) => r.servings === null && r.prep_minutes === null && r.cook_minutes === null && r.difficulty === null));
  assert.throws(() => validateRecipes(csv.replace(/"\[""beef""/, '"[INVALID')), /Invalid JSON/);
  const lines = csv.trimEnd().split("\n");
  assert.throws(() => validateRecipes(lines.slice(0, -1).join("\n")), /Expected 100/);
  assert.throws(() => validateRecipes([...lines.slice(0, -1), lines[1]].join("\n")), /Duplicate/);
});

test("MySQL import reruns preserve IDs and failures roll back all changes", { skip: !process.env.RECIPE_IMPORT_TEST_PORT }, async () => {
  // Run only against the disposable container described in data/README.md.
  const database = knex({ client: "mysql2", connection: {
    host: "127.0.0.1", port: Number(process.env.RECIPE_IMPORT_TEST_PORT),
    user: "root", password: "recipe-import-test", database: "pantrychef_recipe_import_test"
  }, pool: { min: 0, max: 1 } });
  try {
    await ingredientMigration(database);
    await recipeMigration(database);
    const [tomatoId] = await database("ingredients").insert({ canonical_name: "tomato", category: "Vegetables" });
    await database("ingredient_aliases").insert({ ingredient_id: tomatoId, alias: "tomatoes" });
    const [unrelatedId] = await database("recipes").insert({ title: "Keep this recipe", source_url: "https://example.com/existing" });
    const first = await importRecipes(database, recipes);
    assert.equal(first.inserted, 100);
    assert.equal(first.updated, 0);
    const initialRows = await database("recipes").select("id", "title", "source_url").orderBy("id");
    const linkCount = Number((await database("recipe_ingredients").count({ n: "*" }))[0].n);
    const stepCount = Number((await database("recipe_steps").count({ n: "*" }))[0].n);
    assert.equal(linkCount, recipes.reduce((n, r) => n + r.ingredients.length, 0));
    assert.equal(stepCount, recipes.reduce((n, r) => n + r.steps.length, 0));
    const second = await importRecipes(database, recipes);
    assert.deepEqual(second, { inserted: 0, updated: 100, ingredientsCreated: 0 });
    assert.deepEqual(await database("recipes").select("id", "title", "source_url").orderBy("id"), initialRows);
    assert.equal(Number((await database("recipe_ingredients").count({ n: "*" }))[0].n), linkCount);
    assert.equal((await database("recipes").where({ id: unrelatedId }).first()).title, "Keep this recipe");

    // Fail late in the second recipe after changing the first, exercising rollback.
    const broken = structuredClone(recipes);
    broken[0].title = "This change must roll back";
    broken[1].ingredients[0].canonical_name = "x".repeat(151);
    await assert.rejects(importRecipes(database, broken));
    assert.deepEqual(await database("recipes").select("id", "title", "source_url").orderBy("id"), initialRows);
    assert.equal(Number((await database("recipe_ingredients").count({ n: "*" }))[0].n), linkCount);
    assert.equal(Number((await database("recipe_steps").count({ n: "*" }))[0].n), stepCount);
  } finally { await database.destroy(); }
});
