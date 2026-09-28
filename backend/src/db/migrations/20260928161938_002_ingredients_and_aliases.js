export async function up(knex) {
  await knex.schema.createTable("ingredients", (table) => {
    table.bigIncrements("id");
    table.string("canonical_name", 150).notNullable().unique();
    table.string("category", 100).nullable();
    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("ingredient_aliases", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("ingredient_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ingredients")
      .onDelete("CASCADE");
    table.string("alias", 150).notNullable().unique();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("ingredient_aliases");
  await knex.schema.dropTableIfExists("ingredients");
}

