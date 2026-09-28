export async function up(knex) {
  await knex.schema.createTable("pantry_items", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
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
    table.date("expires_on").nullable();

    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.unique(["user_id", "ingredient_id"], {
      indexName: "uniq_pantry_user_ingredient"
    });

    table.check("quantity IS NULL OR quantity > 0", [], "chk_pantry_quantity_positive");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("pantry_items");
}

