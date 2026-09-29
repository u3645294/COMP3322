import { env } from "../src/config/env.js";

if (env.NODE_ENV !== "test") {
  throw new Error(
    `Tests must run with NODE_ENV=test. Current value: ${env.NODE_ENV}`
  );
}

if (!env.DB_TEST_NAME.endsWith("_test")) {
  throw new Error(
    `Test database name must end with "_test". Current value: ${env.DB_TEST_NAME}`
  );
}

