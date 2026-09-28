import knex from "knex";
import { env } from "../config/env.js";

export const database = knex({
  client: "mysql2",

  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD
  },

  pool: {
    min: 2,
    max: 10
  }
});
0
