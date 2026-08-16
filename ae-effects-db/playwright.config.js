const {defineConfig, devices} = require("@playwright/test");

module.exports = defineConfig({
  testDir:"./tests/e2e",
  timeout:30_000,
  expect:{timeout:8_000},
  fullyParallel:true,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI ? 1 : 0,
  reporter:process.env.CI ? "github" : "line",
  use:{
    baseURL:"http://127.0.0.1:4173",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    serviceWorkers:"allow",
  },
  projects:[{name:"chromium", use:{...devices["Desktop Chrome"]}}],
  webServer:{
    command:"python -m http.server 4173 --bind 127.0.0.1",
    url:"http://127.0.0.1:4173/dist/web/asset-manifest.json",
    reuseExistingServer:!process.env.CI,
    timeout:30_000,
  },
});
