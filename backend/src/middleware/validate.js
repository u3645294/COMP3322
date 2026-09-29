import { ValidationError } from "../utils/app-error.js";

/**
 * Validate request data against a Zod schema.
 *
 * Usage:
 *   router.post("/items", validate({ body: itemSchema }), controller);
 *
 * schemas is an object with optional keys: body, query, params.
 */
export function validate(schemas) {
  return (request, response, next) => {
    const errors = {};

    for (const source of ["body", "query", "params"]) {
      const schema = schemas[source];
      if (!schema) continue;

      const parsed = schema.safeParse(request[source]);

      if (!parsed.success) {
        const flat = parsed.error.flatten();
        for (const [key, messages] of Object.entries(flat.fieldErrors)) {
          errors[`${source}.${key}`] = messages?.[0] ?? "Invalid value.";
        }
        for (const formError of flat.formErrors) {
          errors[source] = formError;
        }
        continue;
      }

      // Express 5 defines req.query as a getter-only property, so plain
      // assignment throws. defineProperty replaces the accessor with a
      // plain writable value.
      Object.defineProperty(request, source, {
        value: parsed.data,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError(undefined, errors));
    }

    next();
  };
}

