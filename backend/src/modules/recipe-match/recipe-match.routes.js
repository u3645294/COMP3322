import { Router } from "express";
import { z } from "zod";
import { database } from "../../db/database.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ValidationError } from "../../utils/app-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { getUserDietaryRules } from "../dietary-rules/dietary-rule.service.js";
import {
  dietaryRuleSchema,
  replaceDietaryRulesSchema
} from "../dietary-rules/dietary-rule.schemas.js";

export const recipeMatchRouter = Router();

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const ids = z.array(id).max(100).refine((values) => new Set(values).size === values.length, {
  message: "Duplicate IDs are not allowed."
}).default([]);
const names = z.array(z.string().trim().min(1).max(100)).max(100)
  .refine((values) => new Set(values.map((value) => value.toLowerCase())).size === values.length, {
    message: "Duplicate tags are not allowed."
  }).transform((values) => values.map((value) => value.toLowerCase())).default([]);
const pantryItem = z.object({
  ingredient_id: id.optional(),
  name: z.string().trim().min(1).max(150).optional(),
  amount: z.number().positive(),
  unit: z.string().trim().min(1).max(50),
  expires_on: z.iso.date().nullable().optional()
}).strict().refine((item) => item.ingredient_id || item.name, {
  message: "Each pantry item needs an ingredient_id or name."
});
const bodySchema = z.object({
  client_obj: z.object({
    pantry: z.array(pantryItem).max(100).refine((items) => {
      const keys = items.map((item) => item.ingredient_id
        ? `id:${item.ingredient_id}` : `name:${item.name.toLowerCase()}`);
      return new Set(keys).size === keys.length;
    }, { message: "Duplicate pantry ingredients are not allowed." }).default([]),
    not_allowed: z.object({
      ingredient_ids: ids,
      tags: names
    }).strict().prefault({}),
    liked_recipe_ids: ids
  }).strict(),
  preference_list: z.object({
    ingredient_ids: ids,
    tags: names
  }).strict().prefault({}),
  dietary_rules: z.union([
    dietaryRuleSchema.transform((rule) => ({ rules: [rule] })),
    replaceDietaryRulesSchema.strict()
  ]).default({ rules: [] })
}).strict();

const dietaryRulesSql = `
  SELECT rule_type, rule_value
  FROM JSON_TABLE(?, '$[*]' COLUMNS (
    rule_type VARCHAR(30) PATH '$.ruleType',
    rule_value VARCHAR(100) PATH '$.ruleValue'
  )) AS rules
`;

// Apply the same restrictions before LIMIT in both ranked and liked results.
// Ingredient restrictions include optional ingredients and catalog aliases.
// Diets require the corresponding catalog tag. Vegan uses the existing search's
// vegetarian tag requirement and also excludes dairy and eggs.
const dietaryFilterSql = `
  NOT EXISTS (
    SELECT 1 FROM dietary_rules AS rule
    WHERE (
      rule.rule_type IN ('allergy', 'excluded_ingredient')
      AND EXISTS (
        SELECT 1 FROM recipe_ingredients AS restricted
        JOIN ingredients AS ingredient ON ingredient.id = restricted.ingredient_id
        WHERE restricted.recipe_id = r.id
          AND (
            BINARY LOWER(ingredient.canonical_name) = BINARY rule.rule_value
            OR EXISTS (
              SELECT 1 FROM ingredient_aliases AS alias
              WHERE alias.ingredient_id = ingredient.id
                AND BINARY LOWER(alias.alias) = BINARY rule.rule_value
            )
          )
      )
    ) OR (
      rule.rule_type = 'diet'
      AND (
        NOT EXISTS (
          SELECT 1 FROM JSON_TABLE(COALESCE(r.tags, JSON_ARRAY()), '$[*]'
            COLUMNS (tag VARCHAR(100) PATH '$')) AS diet_tag
          WHERE BINARY LOWER(diet_tag.tag) = BINARY
            CASE WHEN rule.rule_value = 'vegan' THEN 'vegetarian' ELSE rule.rule_value END
        )
        OR (rule.rule_value = 'vegan' AND EXISTS (
          SELECT 1 FROM recipe_ingredients AS restricted
          JOIN ingredients AS ingredient ON ingredient.id = restricted.ingredient_id
          WHERE restricted.recipe_id = r.id
            AND (LOWER(ingredient.category) = 'dairy'
              OR LOWER(ingredient.canonical_name) IN
                ('egg', 'eggs', 'egg white', 'egg whites', 'egg yolk', 'egg yolks'))
        ))
      )
    )
  )
`;

// The first inserted recipe_ingredients row is the main ingredient. Seed data
// inserts ingredients in recipe order; the schema has no explicit main marker.
const pantrySql = `
  SELECT COALESCE(raw.ingredient_id, i.id) AS ingredient_id,
         raw.amount,
         CASE WHEN LOWER(raw.unit) IN ('pcs', 'pc', 'pieces')
              THEN 'piece' ELSE LOWER(raw.unit) END AS unit,
         raw.expires_on
  FROM JSON_TABLE(?, '$[*]' COLUMNS (
    ingredient_id BIGINT PATH '$.ingredient_id' NULL ON EMPTY,
    name VARCHAR(150) PATH '$.name' NULL ON EMPTY,
    amount DECIMAL(10,2) PATH '$.amount',
    unit VARCHAR(50) PATH '$.unit',
    expires_on DATE PATH '$.expires_on' NULL ON EMPTY
  )) AS raw
  LEFT JOIN ingredients AS i ON BINARY LOWER(i.canonical_name) = BINARY LOWER(raw.name)
  WHERE COALESCE(raw.ingredient_id, i.id) IS NOT NULL
    AND (raw.expires_on IS NULL OR raw.expires_on >= CURDATE())
`;

const eligibleSql = `
  SELECT r.id, r.title, r.tags,
         r.description, r.difficulty, r.servings,
         r.prep_minutes, r.cook_minutes, r.image_url
  FROM recipes AS r
  JOIN (
    SELECT recipe_id, MIN(id) AS main_row_id
    FROM recipe_ingredients GROUP BY recipe_id
  ) AS main_row ON main_row.recipe_id = r.id
  JOIN recipe_ingredients AS main_ingredient ON main_ingredient.id = main_row.main_row_id
  WHERE EXISTS (SELECT 1 FROM pantry AS p
                WHERE p.ingredient_id = main_ingredient.ingredient_id)
    AND NOT EXISTS (
      SELECT 1 FROM recipe_ingredients AS ri
      JOIN JSON_TABLE(?, '$[*]' COLUMNS (id BIGINT PATH '$')) AS banned
        ON banned.id = ri.ingredient_id
      WHERE ri.recipe_id = r.id
    )
    AND NOT JSON_OVERLAPS(COALESCE(r.tags, JSON_ARRAY()), CAST(? AS JSON))
    AND ${dietaryFilterSql}
`;

// eligible.id comes directly from recipes.id; preserve it as recipeId.
const candidateSql = `
  WITH pantry AS (${pantrySql}),
  dietary_rules AS (${dietaryRulesSql}),
  eligible AS (${eligibleSql}),
  preferred_ingredients AS (
    SELECT id FROM JSON_TABLE(?, '$[*]' COLUMNS (id BIGINT PATH '$')) AS preferred
  )
  SELECT e.id AS recipeId, e.title, e.description, e.difficulty, e.servings, e.prep_minutes, e.cook_minutes, e.image_url,
    ROUND(
      20 + 100 * SUM(CASE WHEN ri.optional = 0 AND p.ingredient_id IS NOT NULL
        AND (ri.quantity IS NULL OR
             (BINARY p.unit = BINARY LOWER(ri.unit) AND p.amount >= ri.quantity))
        THEN 1 ELSE 0 END) / NULLIF(SUM(ri.optional = 0), 0)
      + 15 * MAX(CASE WHEN p.expires_on BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
                       THEN 1 ELSE 0 END)
      + 5 * COUNT(DISTINCT preferred_ingredients.id)
      + 10 * (SELECT COUNT(*) FROM JSON_TABLE(COALESCE(e.tags, JSON_ARRAY()), '$[*]'
            COLUMNS (tag VARCHAR(100) PATH '$')) AS recipe_tag
            JOIN JSON_TABLE(?, '$[*]' COLUMNS (tag VARCHAR(100) PATH '$')) AS preferred_tag
              ON BINARY LOWER(preferred_tag.tag) = BINARY LOWER(recipe_tag.tag)), 2
    ) AS recommendIndex,
    SUM(CASE WHEN ri.optional = 0 AND (p.ingredient_id IS NULL OR
       (ri.quantity IS NOT NULL AND (BINARY p.unit <> BINARY LOWER(ri.unit) OR p.amount < ri.quantity)))
       THEN 1 ELSE 0 END) AS missingCount,
    MAX(CASE WHEN p.expires_on BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
             THEN 1 ELSE 0 END) AS expiring,
    COUNT(DISTINCT preferred_ingredients.id) AS preferredIngredientCount,
    (SELECT COUNT(*) FROM JSON_TABLE(COALESCE(e.tags, JSON_ARRAY()), '$[*]'
      COLUMNS (tag VARCHAR(100) PATH '$')) AS recipe_tag
      JOIN JSON_TABLE(?, '$[*]' COLUMNS (tag VARCHAR(100) PATH '$')) AS preferred_tag
        ON BINARY LOWER(preferred_tag.tag) = BINARY LOWER(recipe_tag.tag)) AS preferredTagCount
  FROM eligible AS e
  JOIN recipe_ingredients AS ri ON ri.recipe_id = e.id
  LEFT JOIN pantry AS p ON p.ingredient_id = ri.ingredient_id
  LEFT JOIN preferred_ingredients ON preferred_ingredients.id = ri.ingredient_id
  GROUP BY e.id, e.title, e.tags, e.description, e.difficulty, e.servings,
    e.prep_minutes, e.cook_minutes, e.image_url
  HAVING SUM(ri.optional = 0) > 0
  ORDER BY recommendIndex DESC, e.id ASC
  LIMIT 20
`;

const missingSql = `
  WITH pantry AS (${pantrySql})
  SELECT ri.recipe_id AS recipeId, ri.ingredient_id AS ingredientId,
    CASE WHEN p.ingredient_id IS NULL OR BINARY p.unit <> BINARY LOWER(ri.unit)
         THEN ri.quantity ELSE GREATEST(ri.quantity - p.amount, 0) END AS amount,
    ri.unit,
    i.canonical_name AS canonicalName
  FROM recipe_ingredients AS ri
  LEFT JOIN pantry AS p ON p.ingredient_id = ri.ingredient_id
  JOIN ingredients AS i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id IN (?) AND ri.optional = 0
    AND (p.ingredient_id IS NULL OR BINARY p.unit <> BINARY LOWER(ri.unit) OR p.amount < ri.quantity)
  ORDER BY ri.recipe_id, ri.id
`;

// Resolve liked IDs against recipes.id so nonexistent IDs cannot be returned.
const fallbackSql = `
  WITH dietary_rules AS (${dietaryRulesSql})
  SELECT r.id AS recipeId, r.title, r.description, r.difficulty, r.servings, r.prep_minutes, r.cook_minutes, r.image_url
  FROM recipes AS r
  JOIN JSON_TABLE(?, '$[*]' COLUMNS (
    position FOR ORDINALITY, id BIGINT PATH '$'
  )) AS liked ON liked.id = r.id
  WHERE NOT EXISTS (
    SELECT 1 FROM recipe_ingredients AS ri
    JOIN JSON_TABLE(?, '$[*]' COLUMNS (id BIGINT PATH '$')) AS banned
      ON banned.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
  )
  AND NOT JSON_OVERLAPS(COALESCE(r.tags, JSON_ARRAY()), CAST(? AS JSON))
  AND ${dietaryFilterSql}
  ORDER BY liked.position ASC LIMIT 20
`;

recipeMatchRouter.post("/", authenticate, asyncHandler(async (request, response) => {
  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) throw new ValidationError("Invalid recipe match input.");

  const { client_obj: client, preference_list: preferences, dietary_rules: supplied } = parsed.data;
  const savedRules = await getUserDietaryRules(request.user.id);
  const rules = new Map();
  for (const rule of [...savedRules, ...supplied.rules]) {
    const ruleValue = rule.ruleValue.trim().toLowerCase();
    rules.set(`${rule.ruleType}::${ruleValue}`, { ruleType: rule.ruleType, ruleValue });
  }
  const dietaryRules = JSON.stringify([...rules.values()]);
  const pantry = JSON.stringify(client.pantry);
  const bannedIds = JSON.stringify(client.not_allowed.ingredient_ids);
  const bannedTags = JSON.stringify(client.not_allowed.tags);
  const preferredIds = JSON.stringify(preferences.ingredient_ids);
  const preferredTags = JSON.stringify(preferences.tags);

  const [candidates] = await database.raw(candidateSql, [
    pantry, dietaryRules, bannedIds, bannedTags, preferredIds, preferredTags, preferredTags
  ]);

  if (candidates.length === 0) {
    const [likedRecipes] = await database.raw(fallbackSql, [
      dietaryRules, JSON.stringify(client.liked_recipe_ids), bannedIds, bannedTags
    ]);
    response.json({ match: { status: false, recipes: [], likedRecipes } });
    return;
  }

  const recipeIds = candidates.map((row) => row.recipeId);
  const [missingRows] = await database.raw(missingSql, [pantry, recipeIds]);
  const missingByRecipe = new Map(recipeIds.map((recipeId) => [recipeId, {}]));
  for (const row of missingRows) {
    missingByRecipe.get(row.recipeId)[row.ingredientId] = {
      amount: row.amount === null ? null : Number(row.amount),
      unit: row.unit,
      canonicalName: row.canonicalName
    };
  }

  response.json({ match: {
    status: true,
    recipes: candidates.map((row) => {
      const matchTags = [];
      if (Number(row.missingCount) === 0) matchTags.push("perfect match");
      if (Number(row.expiring) > 0) matchTags.push("expiring food");
      if (Number(row.preferredIngredientCount) > 0 || Number(row.preferredTagCount) > 0) {
        matchTags.push("suits your flavour");
      }
      return {
        recipeId: row.recipeId,
        title: row.title,
        description: row.description,
        difficulty: row.difficulty,
        servings: row.servings === null ? null : Number(row.servings),
        prepMinutes: row.prep_minutes === null ? null : Number(row.prep_minutes),
        cookMinutes: row.cook_minutes === null ? null : Number(row.cook_minutes),
        imageUrl: row.image_url,
        missingIngredients: missingByRecipe.get(row.recipeId),
        requiredCount: Number(row.requiredCount),
        matchedCount: Number(row.matchedCount),
        tags: matchTags,
        recommendIndex: Number(row.recommendIndex)
      };
    })
  } });
}));
