import knex from "knex";
import { env } from "../config/env.js";

const databaseName =
  env.NODE_ENV === "test" ? env.DB_TEST_NAME : env.DB_NAME;

export const database = knex({
  client: "mysql2",

  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: databaseName,
    user: env.DB_USER,
    password: env.DB_PASSWORD
  },

  pool: {
    min: 2,
    max: 10
  }
});

