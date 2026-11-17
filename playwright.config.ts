import { defineConfig, devices } from '@playwright/test';

// The repository's default Vite port 8080 and the prior preview port 4173 are
// occupied in this workspace. Bind this checkout to a dedicated test port.
const baseURL = 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/t11-14-pedagogical-corrections.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  outputDir: 'artifacts/qa/playwright-results',
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: `${baseURL}/dev/stuwy-explain-v2`,
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
