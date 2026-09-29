export async function up(knex) {
  await knex.schema.createTable("recipes", (table) => {
    table.bigIncrements("id");
    table.string("title", 200).notNullable();
    table.text("description").nullable();
    table.integer("servings").unsigned().nullable();
    table.integer("prep_minutes").unsigned().nullable();
    table.integer("cook_minutes").unsigned().nullable();
    table.string("difficulty", 20).nullable(); // "easy" | "medium" | "hard"
    table.string("image_url", 1000).nullable();
    table.string("source_url", 1000).nullable();
    table.json("tags").nullable();
    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.index("title", "idx_recipes_title");
    table.index("difficulty", "idx_recipes_difficulty");
  });

  await knex.schema.createTable("recipe_ingredients", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("recipe_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("recipes")
      .onDelete("CASCADE");

    table
      .bigInteger("ingredient_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ingredients")
      .onDelete("RESTRICT");

    table.decimal("quantity", 10, 2).nullable();
    table.string("unit", 50).nullable();
    table.boolean("optional").notNullable().defaultTo(false);

    table.unique(["recipe_id", "ingredient_id"], {
      indexName: "uniq_recipe_ingredient"
    });
    table.index("ingredient_id", "idx_recipe_ingredients_ingredient");
  });

  await knex.schema.createTable("recipe_steps", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("recipe_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("recipes")
      .onDelete("CASCADE");

    table.integer("step_number").unsigned().notNullable();
    table.text("instruction").notNullable();

    table.unique(["recipe_id", "step_number"], {
      indexName: "uniq_recipe_step_number"
    });
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("recipe_steps");
  await knex.schema.dropTableIfExists("recipe_ingredients");
  await knex.schema.dropTableIfExists("recipes");
}

