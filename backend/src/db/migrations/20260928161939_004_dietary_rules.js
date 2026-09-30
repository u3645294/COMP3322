export async function up(knex) {
  await knex.schema.createTable("user_dietary_rules", (table) => {
    table.bigIncrements("id");

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.string("rule_type", 50).notNullable();
    table.string("rule_value", 100).notNullable();

    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["user_id", "rule_type", "rule_value"], {
      indexName: "uniq_user_dietary_rule"
    });
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("user_dietary_rules");
}

