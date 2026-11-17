import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['modal.spec.js', 'runtime.spec.js'],
  workers: 1,
  outputDir: './artifacts',
  reporter: [['list'], ['json', { outputFile: './artifacts/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 800 },
    launchOptions: process.env.MODAL_BROWSER_PATH ? { executablePath: process.env.MODAL_BROWSER_PATH } : {}
  },
  webServer: { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});
