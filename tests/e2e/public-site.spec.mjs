import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("homepage remains readable and locally focused", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("L’IA au service de l’humain");
  await expect(page.getByRole("link", { name: "Occitanie", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Articles", exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(runtimeErrors).toEqual([]);
});

test("keyboard users can reach the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenu-principal")).toBeFocused();
});

test("the maturity matrix calculates three axes, blocks unsafe pilots and resets", async ({ page }) => {
  await page.goto("/guides/ia-pme/");
  const form = page.locator("#maturity-form");

  for (let index = 1; index <= 15; index += 1) {
    await form.locator(`[name="q${index}"]`).selectOption("2");
  }
  await form.locator('[name="q9"]').selectOption("0");
  await form.getByRole("button", { name: "Calculer ma maturité" }).click();

  await expect(page.locator("#maturity-result")).toBeVisible();
  await expect(page.locator("#maturity-result")).toBeFocused();
  await expect(page.locator("#maturity-value-score")).toHaveText("10");
  await expect(page.locator("#maturity-innovation-score")).toHaveText("8");
  await expect(page.locator("#maturity-compliance-score")).toHaveText("10");
  await expect(page.locator("#maturity-score")).toHaveText("28");
  await expect(page.locator("#maturity-blockers")).toBeVisible();
  await expect(page.locator("#maturity-blockers")).toContainText("ne pas démarrer");
  await expect(page.locator("#maturity-export")).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await form.getByRole("button", { name: "Exporter le résultat JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("maturite-ia-innovation-conformite.json");
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported).toMatchObject({
    version: "2.0",
    localOnly: true,
    total: 28,
    subscores: { value: 10, innovation: 8, compliance: 10 },
  });
  expect(exported.blockers).toHaveLength(1);
  expect(exported.actions.length).toBeLessThanOrEqual(3);

  await form.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(page.locator("#maturity-result")).toBeHidden();
  await expect(page.locator("#maturity-export")).toBeDisabled();
  await expect(form.locator('[name="q1"]')).toHaveValue("");
});

test("the maturity matrix is operable by keyboard and announces its result", async ({ page }) => {
  await page.goto("/guides/ia-pme/");
  const form = page.locator("#maturity-form");

  for (let index = 1; index <= 15; index += 1) {
    await form.locator(`[name="q${index}"]`).selectOption("2");
  }
  await form.locator('[name="q1"]').focus();
  for (let index = 1; index <= 15; index += 1) {
    await expect(form.locator(`[name="q${index}"]`)).toBeFocused();
    await page.keyboard.press("Tab");
  }
  await expect(page.locator("#maturity-calculate")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator("#maturity-result")).toBeVisible();
  await expect(page.locator("#maturity-result")).toBeFocused();
  await expect(page.locator("#maturity-score")).toHaveText("30");
  await expect(page.locator("#maturity-blockers")).toBeHidden();
});

test("the local matrix cannot submit scores when JavaScript is disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/guides/ia-pme/`);
  const initialUrl = page.url();

  await page.locator('[name="q1"]').selectOption("2");
  await page.locator("#maturity-calculate").click();

  await expect(page).toHaveURL(initialUrl);
  expect(new URL(page.url()).search).toBe("");
  await context.close();
});

test("the copilot canvas calculates locally and can be reset", async ({ page }) => {
  await page.goto("/guides/ia-pme/");
  const form = page.locator("#copilot-canvas-form");
  await form.locator('[name="problem"]').fill("Retrouver la bonne procédure sans utiliser une version périmée.");
  await form.locator('[name="users"]').fill("Équipe qualité, validation par le responsable documentaire.");
  await form.locator('[name="currentProcess"]').fill("Recherche manuelle dans plusieurs dossiers partagés.");
  await form.locator('[name="dataClass"]').selectOption({ index: 1 });
  await form.locator('[name="humanDecision"]').fill("La personne ouvre la citation et décide si la procédure s’applique.");
  await form.locator('[name="successMetric"]').fill("Réponse exacte, version correcte et temps complet mesuré.");
  await form.locator('[name="stopRule"]').fill("Arrêt immédiat en cas de fuite ou de réponse sans source.");
  await form.getByRole("button", { name: "Générer mon canvas" }).click();
  await expect(page.locator("#copilot-canvas-result")).toBeVisible();
  await expect(page.locator("#copilot-canvas-summary")).toContainText("Retrouver la bonne procédure");
  await expect(page.locator("#copilot-canvas-export")).toBeEnabled();
  await form.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(page.locator("#copilot-canvas-result")).toBeHidden();
});

test("the architecture selector explains an indicative result", async ({ page }) => {
  await page.goto("/articles/comparatif-ia-cloud-locale-pme.html");
  const form = page.locator("#architecture-selector-form");
  await form.locator('[name="sensitivity"]').selectOption("confidential");
  await form.locator('[name="connectivity"]').selectOption("intermittent");
  await form.locator('[name="operations"]').selectOption("partner");
  await form.locator('[name="ecosystem"]').selectOption("mixed");
  await form.locator('[name="urgency"]').selectOption("months");
  await form.getByRole("button", { name: "Afficher la piste à comparer" }).click();
  await expect(page.locator("#architecture-selector-result")).toBeVisible();
  await expect(page.locator("#architecture-selector-title")).not.toBeEmpty();
  expect(await page.locator("#architecture-selector-controls li").count()).toBeGreaterThanOrEqual(3);
});

test("ROI includes the human utility counterweight", async ({ page }) => {
  await page.goto("/articles/calculateur-roi-ia-pme.html");
  await expect(page.locator("#roi-result")).toBeVisible();
  await expect(page.locator("#out-utility-score")).toHaveText("12/20");
  await page.locator('[name="utiliteAutonomie"]').selectOption("5");
  await expect(page.locator("#out-utility-score")).toHaveText("14/20");
  await expect(page.locator("#out-utility-level")).toContainText("pilote");
});
