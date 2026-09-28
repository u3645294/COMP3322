import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

// Trust the first proxy hop so rate limiting sees the real client IP behind a proxy.
app.set("trust proxy", 1);

// Security headers.
app.use(helmet());

// CORS for the frontend.
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true
  })
);

// Body and cookie parsing.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Request logging.
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// General rate limiter (per IP).
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

// API routes.
app.use("/api/v1", apiRouter);

// 404 + error handling — must be last.
app.use(notFound);
app.use(errorHandler);
