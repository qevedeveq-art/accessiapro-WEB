import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { AUTOMATION_CASE_ROUTES, INDEXABLE_ROUTES } from "./site-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function fileForRoute(route) {
  if (route === "/") return path.join(ROOT, "index.html");
  if (route.endsWith("/")) return path.join(ROOT, route.slice(1), "index.html");
  return path.join(ROOT, route.slice(1));
}

function jsonLd(html) {
  const source = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  assert.ok(source, "JSON-LD absent");
  return JSON.parse(source)["@graph"];
}

test("the local authority dataset separates facts, scope and future survey", async () => {
  const [guide, rawDataset] = await Promise.all([
    readFile(fileForRoute("/guides/ia-entreprise-occitanie/"), "utf8"),
    readFile(path.join(ROOT, "assets/data/observatoire-ia-occitanie-v1.json"), "utf8"),
  ]);
  const dataset = JSON.parse(rawDataset);

  assert.equal(dataset.status, "methodology-and-official-baseline-only");
  assert.equal(dataset.officialIndicators.length, 3);
  assert.equal(dataset.futureLocalSurvey.status, "not-started");
  assert.equal(dataset.futureLocalSurvey.responses, 0);
  assert.ok(dataset.futureLocalSurvey.minimumPublicationThreshold >= 30);
  assert.ok(dataset.limitations.every((item) => item.length >= 40));

  const graph = jsonLd(guide);
  const article = graph.find((node) => node["@type"] === "Article");
  const schemaDataset = graph.find((node) => node["@type"] === "Dataset");
  assert.ok(article.spatialCoverage.some(({ name }) => name === "Toulouse"));
  assert.ok(article.spatialCoverage.some(({ name }) => name === "Occitanie"));
  assert.equal(
    schemaDataset.distribution.contentUrl,
    "https://access-ia.pro/assets/data/observatoire-ia-occitanie-v1.json",
  );
  assert.doesNotMatch(guide, /"@type":"(?:LocalBusiness|ProfessionalService)"/);
});

test("the two decision tools are local-only and use safe DOM APIs", async () => {
  const [guide, canvasScript, comparison, selectorScript] = await Promise.all([
    readFile(fileForRoute("/guides/ia-pme/"), "utf8"),
    readFile(path.join(ROOT, "assets/js/copilote-canvas.js"), "utf8"),
    readFile(fileForRoute("/articles/comparatif-ia-cloud-locale-pme.html"), "utf8"),
    readFile(path.join(ROOT, "assets/js/architecture-selector.js"), "utf8"),
  ]);

  assert.match(guide, /id="copilot-canvas-form"/);
  assert.match(guide, /sans compte, stockage, cookie ni transmission/i);
  assert.match(comparison, /id="architecture-selector-form"/);
  assert.match(comparison, /Piste de départ, pas recommandation/);

  for (const [name, script] of [["canvas", canvasScript], ["selector", selectorScript]]) {
    assert.doesNotMatch(script, /\bfetch\s*\(/, `${name}: réseau interdit`);
    assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB/i, `${name}: stockage interdit`);
    assert.doesNotMatch(script, /\.innerHTML|insertAdjacentHTML|document\.write|\beval\s*\(/, `${name}: sink dangereux`);
  }
  for (const label of ["Cloud professionnel géré", "Service européen", "Architecture hybride", "IA locale"]) {
    assert.ok(selectorScript.includes(label), label);
  }
});

test("ROI now balances financial return with human utility", async () => {
  const [page, script] = await Promise.all([
    readFile(fileForRoute("/articles/calculateur-roi-ia-pme.html"), "utf8"),
    readFile(path.join(ROOT, "assets/js/calculateur-roi.js"), "utf8"),
  ]);
  for (const name of [
    "utiliteIrritant",
    "utiliteQualite",
    "utiliteAutonomie",
    "utiliteAcceptabilite",
  ]) assert.match(page, new RegExp(`name="${name}"`));
  assert.match(page, /id="out-utility-score"/);
  assert.match(page, /ni scientifique, ni comparable entre entreprises/i);
  assert.match(script, /utilityScore/);
});

test("every automation case links to the shared security-by-design framework", async () => {
  assert.equal(AUTOMATION_CASE_ROUTES.length, 14);
  for (const route of AUTOMATION_CASE_ROUTES) {
    const page = await readFile(fileForRoute(route), "utf8");
    assert.match(page, /href="\/methodologie\.html#securite-by-design"/, route);
  }
  const method = await readFile(fileForRoute("/methodologie.html"), "utf8");
  assert.match(method, /id="securite-by-design"/);
  assert.equal((method.match(/<tr><td>\d\./g) ?? []).length, 8);
});

test("the documentary demonstrator is explicitly synthetic and testable", async () => {
  const page = await readFile(
    fileForRoute("/articles/cas-usage-assistant-documentaire.html"),
    "utf8",
  );
  assert.match(page, /Démonstrateur synthétique — aucune donnée client/);
  assert.match(page, /Modèle de menaces minimum/);
  assert.match(page, /Jeu de test et règle de reprise/);
  assert.match(page, /benchmark synthétique de 30 cas/);
});

test("v9 strengthens existing URLs without index inflation", () => {
  assert.equal(INDEXABLE_ROUTES.length, 61);
  assert.equal(new Set(INDEXABLE_ROUTES).size, 61);
});
