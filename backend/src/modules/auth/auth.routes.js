import { Router } from "express";
import rateLimit from "express-rate-limit";

import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import * as authController from "./auth.controller.js";

export const authRouter = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts. Try again later."
    }
  }
});

authRouter.post("/register", validate({ body: registerSchema }), authController.register);

authRouter.post(
  "/login",
  loginRateLimiter,
  validate({ body: loginSchema }),
  authController.login
);

authRouter.get("/me", authenticate, authController.me);

authRouter.post("/logout", authenticate, authController.logout);

