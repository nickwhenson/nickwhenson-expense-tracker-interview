import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const credentialsEnvPath = path.resolve(__dirname, 'environment/.env');

if (fs.existsSync(credentialsEnvPath)) {
  const envLines = fs.readFileSync(credentialsEnvPath, 'utf-8').split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: false,
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
