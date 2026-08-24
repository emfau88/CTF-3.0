import { defineConfig } from "@playwright/test";

const e2ePort = process.env.CORE_ARENA_E2E_PORT ?? "4197";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "line",
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}/CTF-3.0/`,
    headless: true,
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${e2ePort}`,
    url: `http://127.0.0.1:${e2ePort}/CTF-3.0/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
