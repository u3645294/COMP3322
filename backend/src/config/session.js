import session from "express-session";
import { ConnectSessionKnexStore } from "connect-session-knex";

import { database } from "../db/database.js";
import { env } from "./env.js";

const sessionStore = new ConnectSessionKnexStore({
  knex: database,
  tableName: "sessions",
  createTable: false,
  cleanupInterval: 60_000
});

export const sessionMiddleware = session({
  name: env.SESSION_COOKIE_NAME,
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
});

