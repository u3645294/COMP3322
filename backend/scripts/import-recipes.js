#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import knex from "knex";
import { summarizeRecipes, validateRecipes } from "./recipe-csv.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function importRecipes(database, recipes) {
  // One transaction for recipe parents, catalog additions, ingredient links and steps.
  return database.transaction(async (trx) => {
    const existing = await trx("ingredients").select("id", "canonical_name");
    const aliases = await trx("ingredient_aliases").select("ingredient_id", "alias");
    const catalog = new Map(existing.map((i) => [i.canonical_name.toLowerCase(), i.id]));
    for (const alias of aliases) {
      if (!catalog.has(alias.alias.toLowerCase())) catalog.set(alias.alias.toLowerCase(), alias.ingredient_id);
    }
    const result = { inserted: 0, updated: 0, ingredientsCreated: 0 };
    for (const recipe of recipes) {
      const matches = await trx("recipes").select("id").where({ source_url: recipe.source_url });
      if (matches.length > 1) throw new Error(`Multiple existing recipes have source URL ${recipe.source_url}. Resolve duplicates before importing.`);
      const values = Object.fromEntries(["title", "description", "servings", "prep_minutes", "cook_minutes", "difficulty", "image_url", "source_url"].map((field) => [field, recipe[field]]));
      values.tags = JSON.stringify(recipe.tags);
      let recipeId;
      if (matches.length) {
        recipeId = matches[0].id;
        await trx("recipes").where({ id: recipeId }).update(values);
        await trx("recipe_ingredients").where({ recipe_id: recipeId }).del();
        await trx("recipe_steps").where({ recipe_id: recipeId }).del();
        result.updated++;
      } else {
        [recipeId] = await trx("recipes").insert(values);
        result.inserted++;
      }
      const links = new Map();
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.canonical_name.toLowerCase();
        let ingredientId = catalog.get(key);
        if (ingredientId === undefined) {
          [ingredientId] = await trx("ingredients").insert({ canonical_name: key, category: ingredient.category });
          catalog.set(key, ingredientId);
          result.ingredientsCreated++;
        }
        // Existing aliases can make two different CSV names resolve to one DB ingredient.
        const linkKey = String(ingredientId);
        const previous = links.get(linkKey);
        if (previous) {
          if (previous.quantity !== null && ingredient.quantity !== null && previous.unit === ingredient.unit) {
            previous.quantity = Math.round((previous.quantity + ingredient.quantity) * 100) / 100;
            if (previous.quantity > 99999999.99) throw new Error(`Quantity exceeds SQL DECIMAL limit in ${recipe.title}.`);
          } else { previous.quantity = null; previous.unit = null; }
          previous.optional = previous.optional && ingredient.optional;
        } else links.set(linkKey, {
          recipe_id: recipeId, ingredient_id: ingredientId,
          quantity: ingredient.quantity, unit: ingredient.unit, optional: ingredient.optional
        });
      }
      await trx("recipe_ingredients").insert([...links.values()]);
      await trx("recipe_steps").insert(recipe.steps.map((step) => ({ recipe_id: recipeId, ...step })));
    }
    return result;
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: node scripts/import-recipes.js [--dry-run] [--csv PATH]\nValidates 100 balanced recipes. --dry-run requires no database. Otherwise loads root .env and atomically inserts/updates recipes by source URL.");
    return;
  }
  let csvPath = path.join(backendRoot, "data/recipes.csv");
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--csv" && args[i + 1]) csvPath = path.resolve(args[++i]);
    else throw new Error(`Unknown or incomplete option: ${args[i]}`);
  }
  const recipes = validateRecipes(await readFile(csvPath, "utf8"));
  console.log(JSON.stringify(summarizeRecipes(recipes), null, 2));
  if (dryRun) { console.log("Validation passed. No database connection was made."); return; }

  dotenv.config({ path: path.resolve(backendRoot, "../.env"), quiet: true });
  for (const name of ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
    if (!process.env[name]) throw new Error(`Missing ${name}. Configure the repository root .env or environment variables.`);
  }
  const port = Number(process.env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DB_PORT must be an integer from 1 to 65535.");
  const database = knex({
    client: "mysql2",
    connection: { host: process.env.DB_HOST, port, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD },
    // Keep the advisory lock and import transaction on the same pooled connection.
    pool: { min: 0, max: 1 }
  });
  const lockName = "recipe-import:" + createHash("sha256").update(process.env.DB_NAME).digest("hex").slice(0, 40);
  let locked = false;
  try {
    const [rows] = await database.raw("SELECT GET_LOCK(?, 30) AS acquired", [lockName]);
    if (Number(rows[0].acquired) !== 1) throw new Error("Another recipe import is running. Try again later.");
    locked = true;
    console.log(JSON.stringify(await importRecipes(database, recipes), null, 2));
    console.log("Import committed successfully.");
  } finally {
    try { if (locked) await database.raw("SELECT RELEASE_LOCK(?)", [lockName]); }
    finally { await database.destroy(); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Recipe import failed: ${error.message}`); process.exitCode = 1; });
}
