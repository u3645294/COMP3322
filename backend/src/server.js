import { app } from "./app.js";
import { env } from "./config/env.js";
import { database } from "./db/database.js";

const server = app.listen(env.PORT, () => {
  console.log(`PantryChef backend listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await database.destroy();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

