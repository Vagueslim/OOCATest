import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'evidence/test-results.json' }],
    ['html', { outputFolder: 'evidence/report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:5181',
    viewport: { width: 360, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command:
          'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5181 --strictPort',
        url: 'http://127.0.0.1:5181',
        reuseExistingServer: true,
      },
});
