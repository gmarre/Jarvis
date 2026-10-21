// Parcours de bout en bout (sprint 6) : eleve, professeur, parent.
//
//   npm run test:e2e
//
// L'application tourne en mode demonstration (VITE_USE_MOCK=true) : les
// parcours ne touchent jamais la vraie base, et la correction se fait avec le
// meme code partage que le serveur. Chromium seul, sur un telephone et sur un
// ordinateur. Playwright 1.61 : la derniere version qui tourne sous Node 18 ;
// sous Node 18.18, Playwright ne transpile pas le TypeScript d'un paquet
// "type": "module", d'ou ces fichiers en CommonJS.

const { defineConfig, devices } = require('@playwright/test')

const PORT = 5199

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.cjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
    { name: 'telephone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_USE_MOCK: 'true' },
  },
})
