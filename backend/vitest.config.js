import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup.js"],
    hookTimeout: 30000,
    testTimeout: 15000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test"
    }
  }
});

