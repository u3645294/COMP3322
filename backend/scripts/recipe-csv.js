import { z } from "zod";

// RFC 4180: quoted JSON, escaped quotes, CRLF and embedded newlines are supported.
export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += character;
    } else if (character === '"') {
      if (field || closed) throw new Error("Invalid quote in CSV field.");
      quoted = true;
    } else if (character === ",") {
      row.push(field); field = ""; closed = false;
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = ""; closed = false;
    } else {
      if (closed) throw new Error("Unexpected character after closing CSV quote.");
      field += character;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (field || row.length || closed) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  if (!headers?.length || new Set(headers).size !== headers.length) throw new Error("Missing or duplicate CSV headers.");
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`CSV record ${index + 2}: wrong field count.`);
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  });
}

const optionalInteger = (minimum) => z.preprocess(
  (value) => value === "" ? null : Number(value),
  z.number().int().min(minimum).max(4294967295).nullable()
);
const jsonField = (schema) => z.string().transform((value, context) => {
  try { return JSON.parse(value); }
  catch { context.addIssue({ code: "custom", message: "Invalid JSON" }); return z.NEVER; }
}).pipe(schema);
const nullableText = (limit) => z.string().max(limit).transform((value) => value || null);
const ingredientSchema = z.object({
  canonical_name: z.string().min(1).max(150),
  category: z.string().min(1).max(100),
  quantity: z.number().nonnegative().max(99999999.99).nullable(),
  unit: z.string().min(1).max(50).nullable(),
  optional: z.boolean(),
  source_name: z.string().min(1),
  source_measure: z.string()
});
const recipeSchema = z.object({
  source_id: z.string().regex(/^\d+$/),
  category: z.string().min(1),
  cuisine: z.string(),
  balance_ingredient: z.string().min(1),
  title: z.string().min(1).max(200),
  description: nullableText(65535),
  servings: optionalInteger(1),
  prep_minutes: optionalInteger(0),
  cook_minutes: optionalInteger(0),
  difficulty: z.enum(["", "easy", "medium", "hard"]).transform((value) => value || null),
  image_url: z.union([z.literal(""), z.url().max(1000)]).transform((value) => value || null),
  source_url: z.url().max(1000),
  tags: jsonField(z.array(z.string().min(1)).min(1)),
  ingredients: jsonField(z.array(ingredientSchema).min(1)),
  steps: jsonField(z.array(z.object({
    step_number: z.number().int().positive(), instruction: z.string().min(1).max(65535)
  })).min(1))
});

export const CATEGORIES = ["Beef", "Chicken", "Pork", "Seafood", "Pasta", "Vegetarian", "Breakfast", "Side", "Dessert", "Miscellaneous"];
export const GROUPS = ["chicken", "beef", "pork", "seafood", "pasta", "rice", "potato", "legumes", "egg", "fruit"];
export function validateRecipes(text) {
  const recipes = parseCsv(text).map((row, index) => {
    const parsed = recipeSchema.safeParse(row);
    if (!parsed.success) throw new Error(`CSV record ${index + 2}: ${parsed.error.message}`);
    const recipe = parsed.data;
    if (recipe.source_url !== `https://www.themealdb.com/meal/${recipe.source_id}`) throw new Error(`Invalid source URL for ${recipe.title}.`);
    if (new Set(recipe.ingredients.map((i) => i.canonical_name.toLowerCase())).size !== recipe.ingredients.length) throw new Error(`Duplicate ingredient in ${recipe.title}.`);
    if (!recipe.steps.every((step, i) => step.step_number === i + 1)) throw new Error(`Nonsequential steps in ${recipe.title}.`);
    return recipe;
  });
  if (recipes.length !== 100) throw new Error(`Expected 100 recipes, found ${recipes.length}.`);
  for (const field of ["source_id", "source_url", "title"]) {
    if (new Set(recipes.map((r) => r[field].toLowerCase())).size !== 100) throw new Error(`Duplicate ${field}.`);
  }
  for (const [field, values] of [["category", CATEGORIES], ["balance_ingredient", GROUPS]]) {
    for (const value of values) {
      if (recipes.filter((r) => r[field] === value).length !== 10) throw new Error(`Expected 10 recipes for ${field}=${value}.`);
    }
  }
  return recipes;
}

export function summarizeRecipes(recipes) {
  const count = (field) => Object.fromEntries([...new Set(recipes.map((r) => r[field]))].map((value) => [value, recipes.filter((r) => r[field] === value).length]));
  return {
    recipes: recipes.length,
    ingredientLinks: recipes.reduce((total, r) => total + r.ingredients.length, 0),
    steps: recipes.reduce((total, r) => total + r.steps.length, 0),
    categories: count("category"),
    commonIngredientGroups: count("balance_ingredient")
  };
}
