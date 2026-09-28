export async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.bigIncrements("id");
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.string("display_name", 100).notNullable();
    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
  });

  await knex.schema.createTable("sessions", (table) => {
    table.string("sid", 255).primary();
    table.json("sess").notNullable();
    table.dateTime("expired").notNullable().index();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("users");
}

