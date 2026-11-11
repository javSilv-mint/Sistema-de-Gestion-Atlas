const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("fs");

async function login(page, user, pass) {
  await page.goto("/login");
  await page.getByTestId("input-nombre-usuario").fill(user);
  await page.getByTestId("input-password").fill(pass);
  await page.getByTestId("button-login").click();
  await page.waitForURL(/\/home/, { timeout: 30000 });
}

test("[E2E-01] Login de administrador y navegación a Clientes @compat", async ({ page }, info) => {
  const t0 = Date.now();
  await login(page, "admin", "admin");
  const tLogin = Date.now() - t0;
  await page.screenshot({ path: `capturas/E2E-01-home-${info.project.name}.png`, fullPage: true });
  await page.getByTestId("link-nav-clientes").click();
  await expect(page).toHaveURL(/\/clientes/);
  await expect(page.getByText("María González").first()).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: `capturas/E2E-01-clientes-${info.project.name}.png`, fullPage: true });
  info.annotations.push({ type: "tiempo_login_ms", description: String(tLogin) });
});

test("[E2E-02] Credenciales inválidas muestran error y no ingresan", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("input-nombre-usuario").fill("admin");
  await page.getByTestId("input-password").fill("incorrecta");
  await page.getByTestId("button-login").click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "capturas/E2E-02-login-invalido.png" });
  await expect(page).toHaveURL(/\/login/);
});

test("[E2E-03] Credenciales por defecto no deben mostrarse en la pantalla de login", async ({ page }) => {
  await page.goto("/login");
  await page.screenshot({ path: "capturas/E2E-03-pantalla-login.png", fullPage: true });
  const texto = await page.locator("body").innerText();
  expect(texto, "La pantalla de login expone credenciales admin/admin o editor/editor").not.toMatch(/admin\s*\/\s*admin|editor\s*\/\s*editor/i);
});

test("[E2E-04] Usuario editor no puede acceder al formulario de nuevo cliente", async ({ page }) => {
  await login(page, "editor", "editor");
  await page.goto("/clientes/nuevo");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "capturas/E2E-04-editor-nuevo-cliente.png", fullPage: true });
  await expect(page.getByText("No autorizado")).toBeVisible();
});

test("[E2E-05] Token y rol no se almacenan en localStorage manipulable", async ({ page }) => {
  await login(page, "editor", "editor");
  const ls = await page.evaluate(() => ({ token: localStorage.getItem("token"), role: localStorage.getItem("role") }));
  fs.writeFileSync("capturas/E2E-05-localstorage.json", JSON.stringify(ls, null, 2));
  expect(ls.role, "El rol del editor quedó guardado como: " + ls.role).not.toBe("administrador");
  expect(ls.token, "El JWT queda expuesto en localStorage (riesgo XSS)").toBeNull();
});

for (const ruta of ["/login", "/home", "/clientes"]) {
  test(`[E2E-06] Accesibilidad WCAG 2.1 AA en ${ruta}`, async ({ page }) => {
    if (ruta !== "/login") await login(page, "admin", "admin");
    await page.goto(ruta);
    await page.waitForTimeout(ruta === "/clientes" ? 6000 : 1500);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const nombre = ruta.replace(/\//g, "") || "raiz";
    fs.writeFileSync(`capturas/E2E-06-axe-${nombre}.json`, JSON.stringify(r.violations.map(v => ({ id: v.id, impacto: v.impact, descripcion: v.help, nodos: v.nodes.length })), null, 2));
    const graves = r.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(graves.map(v => `${v.id} (${v.impact}, ${v.nodes.length} nodos)`), "Violaciones serias/críticas de accesibilidad").toEqual([]);
  });
}

test("[E2E-07] Interfaz responsiva en móvil sin desplazamiento horizontal @compat", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.screenshot({ path: `capturas/E2E-07-movil-${info.project.name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow, "Existe desplazamiento horizontal en 390 px").toBe(false);
});
