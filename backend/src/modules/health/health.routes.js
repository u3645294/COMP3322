import { Router } from "express";
import { database } from "../../db/database.js";

export const healthRouter = Router();

healthRouter.get("/", async (request, response, next) => {
  try {
    await database.raw("SELECT 1");
    response.json({
      data: {
        status: "ok",
        database: "connected"
      }
    });
  } catch (error) {
    next(error);
  }
});

