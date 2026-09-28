const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const commonConnection = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

module.exports = {
  development: {
    client: "mysql2",
    connection: {
      ...commonConnection,
      database: process.env.DB_NAME
    },
    migrations: {
      directory: "./src/db/migrations"
    },
    seeds: {
      directory: "./src/db/seeds"
    }
  },

  test: {
    client: "mysql2",
    connection: {
      ...commonConnection,
      database: process.env.DB_TEST_NAME
    },
    migrations: {
      directory: "./src/db/migrations"
    },
    seeds: {
      directory: "./src/db/seeds"
    }
  }
};

