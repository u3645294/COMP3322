export async function up(knex) {
  await knex.schema.createTable("search_history", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.json("pantry_snapshot").notNullable();
    table.json("rules_snapshot").notNullable();

    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(["user_id", "created_at"], "idx_search_history_user_time");
  });

  await knex.schema.createTable("search_results", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("search_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("search_history")
      .onDelete("CASCADE");

    table
      .bigInteger("recipe_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("recipes")
      .onDelete("CASCADE");

    table.integer("rank").unsigned().notNullable();
    table.decimal("coverage", 5, 4).nullable();

    table.unique(["search_id", "recipe_id"], {
      indexName: "uniq_search_recipe"
    });
    table.index("search_id", "idx_search_results_search");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("search_results");
  await knex.schema.dropTableIfExists("search_history");
}

