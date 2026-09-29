import { AuthenticationError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { findUserById } from "../modules/auth/auth.repository.js";
import { toSafeUser } from "../modules/auth/auth.service.js";
import { destroySession } from "../utils/session-helpers.js";

export const authenticate = asyncHandler(async (request, response, next) => {
  const userId = request.session?.userId;

  if (!userId) {
    throw new AuthenticationError("Authentication required.");
  }

  const user = await findUserById(userId);

  if (!user) {
    // Stale session (user deleted). Clean it up.
    await destroySession(request);
    throw new AuthenticationError("Authentication required.");
  }

  request.user = toSafeUser(user);
  next();
});

