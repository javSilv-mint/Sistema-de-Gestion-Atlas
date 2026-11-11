// Pruebas E2E de interfaz de Atlas (funcionales, rol, accesibilidad y responsividad)
const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "reporte-e2e", open: "never" }], ["json", { outputFile: "resultados-e2e.json" }]],
  use: { baseURL: process.env.FRONT_URL || "http://localhost:3350", screenshot: "on", trace: "retain-on-failure" },
  projects: [
    { name: "chromium-escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox-escritorio", use: { ...devices["Desktop Firefox"] }, grep: /@compat/ },
    { name: "webkit-movil", use: { ...devices["iPhone 13"] }, grep: /@compat/ },
  ],
});
