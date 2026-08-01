import { expect, test } from "@playwright/test";

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
