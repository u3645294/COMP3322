import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  regenerateSession,
  destroySession
} from "../../utils/session-helpers.js";

import * as authService from "./auth.service.js";

export const register = asyncHandler(async (request, response) => {
  const user = await authService.register(request.body);

  // Session fixation protection: new session ID on privilege change.
  await regenerateSession(request);
  request.session.userId = user.id;

  response.status(201).json({ data: { user } });
});

export const login = asyncHandler(async (request, response) => {
  const user = await authService.login(request.body);

  await regenerateSession(request);
  request.session.userId = user.id;

  response.json({ data: { user } });
});

export const me = asyncHandler(async (request, response) => {
  response.json({ data: { user: request.user } });
});

export const logout = asyncHandler(async (request, response) => {
  await destroySession(request);
  response.clearCookie(env.SESSION_COOKIE_NAME);
  response.status(204).end();
});

