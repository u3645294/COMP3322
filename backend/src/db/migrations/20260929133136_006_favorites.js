export async function up(knex) {
  await knex.schema.createTable("favorites", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table
      .bigInteger("recipe_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("recipes")
      .onDelete("CASCADE");

    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["user_id", "recipe_id"], {
      indexName: "uniq_user_favorite"
    });
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("favorites");
}

