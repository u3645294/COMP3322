import { env } from "../config/env.js";

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  const status = error.status ?? error.statusCode ?? 500;
  const code = error.code ?? "INTERNAL_ERROR";
  const message =
    status >= 500
      ? "An unexpected error occurred."
      : error.message ?? "Request failed.";

  if (status >= 500) {
    console.error(`[${request.method} ${request.originalUrl}]`, error);
  }

  const body = { error: { code, message } };

  if (error.fields) {
    body.error.fields = error.fields;
  }

  if (env.NODE_ENV !== "production" && status >= 500) {
    body.error.stack = error.stack;
  }

  response.status(status).json(body);
}

