import { defineConfig } from "@playwright/test";

process.loadEnvFile(".env");

export default defineConfig({
  testDir: "tests",
  // Starts the instance that the tests run against.
  globalSetup: "tests/kit/global-setup.ts",
  // The tests share one database.
  workers: 1,
});
