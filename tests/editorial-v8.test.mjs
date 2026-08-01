import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  EXPECTED_GENERATED_ROUTES,
  INDEXABLE_ROUTES,
  externalEditorialPages,
} from "../../SEO access-ia/content/catalogue.mjs";
import { bridgePages } from "../../SEO access-ia/content/bridge-pages.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const BRIDGE_ROUTES = [
  "/articles/diag-data-ia-pme-occitanie.html",
  "/articles/facturation-electronique-cybersecurite-pme.html",
  "/articles/gouvernance-acces-ia-pme.html",
  "/articles/automatisation-no-code-rpa-api-agent-ia-pme.html",
];

function fileForRoute(route) {
  if (route === "/") return path.join(ROOT, "index.html");
  if (route.endsWith("/")) return path.join(ROOT, route.slice(1), "index.html");
  return path.join(ROOT, route.slice(1));
}

function visibleWords(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

test("the v8 bridge cluster adds four distinct decision pages", () => {
  assert.deepEqual(bridgePages.map(({ route }) => route), BRIDGE_ROUTES);
  assert.equal(bridgePages.length, 4);
  for (const page of bridgePages) {
    assert.equal(page.schemaType, "Article", page.route);
    assert.equal(page.section, "Ressources", page.route);
    assert.ok(page.content.length >= 5_000, `${page.route}: contenu trop court`);
    assert.ok(page.citations?.length >= 4, `${page.route}: citations insuffisantes`);
    assert.ok(page.nextReview, `${page.route}: prochaine revue absente`);
  }
});

test("the v8 catalogue keeps one explicit route contract", () => {
  assert.equal(externalEditorialPages.length, 43);
  assert.equal(INDEXABLE_ROUTES.length, 61);
  assert.equal(EXPECTED_GENERATED_ROUTES.length, 70);
  for (const route of BRIDGE_ROUTES) assert.ok(INDEXABLE_ROUTES.includes(route), route);
});

test("every indexable article exposes the v8 reading system and citations", async () => {
  for (const route of INDEXABLE_ROUTES) {
    const html = await readFile(fileForRoute(route), "utf8");
    assert.match(html, /<body[^>]+data-pillar="[^"]+"/, `${route}: pilier absent`);
    assert.match(html, /class="[^"]*\bseo-hero-grid\b[^"]*"/, `${route}: hero v8 absent`);
    assert.match(html, /class="seo-signal-panel"/, `${route}: signal éditorial absent`);
    if (/"@type":"Article"/.test(html)) {
      assert.match(html, /class="seo-toc"/, `${route}: sommaire absent`);
      assert.match(html, /"citation":\[/, `${route}: citations JSON-LD absentes`);
    }
  }
});

test("headings and comparison tables are navigable across the catalogue", async () => {
  for (const route of INDEXABLE_ROUTES) {
    const html = await readFile(fileForRoute(route), "utf8");
    const headings = html.match(/<h2[^>]*>/g) ?? [];
    for (const heading of headings) {
      assert.match(heading, /\sid="[^"]+"/, `${route}: H2 sans ancre`);
    }
    const tables = html.match(/<div class="seo-table-wrap"[^>]*>/g) ?? [];
    for (const table of tables) {
      assert.match(table, /role="region"/, `${route}: tableau sans région`);
      assert.match(table, /tabindex="0"/, `${route}: tableau non navigable`);
    }
  }
});

test("the short foundation articles now provide decision-grade depth", async () => {
  const minimums = new Map([
    ["/articles/calculateur-roi-ia-pme.html", 600],
    ["/articles/rgpd-ia-entreprise.html", 650],
    ["/articles/securite-ia-pme-fuites-donnees.html", 650],
    ["/articles/formation-equipe-ia.html", 650],
    ["/methodologie.html", 600],
    ["/tarifs-ia-pme.html", 550],
  ]);
  for (const [route, minimum] of minimums) {
    const html = await readFile(fileForRoute(route), "utf8");
    assert.ok(visibleWords(html) >= minimum, `${route}: moins de ${minimum} mots utiles`);
  }
});

test("automation cases no longer share one generic heading signature", () => {
  const automation = externalEditorialPages.filter(({ route }) =>
    route.includes("/cas-usage-"),
  );
  const signatures = automation.map(({ content }) =>
    [...content.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)]
      .map(([, heading]) => heading.replace(/<[^>]+>/g, "").trim())
      .join(" | "),
  );
  assert.equal(automation.length, 14);
  assert.equal(new Set(signatures).size, 14);
});

test("navigation, transition pages and CSS express the v8 architecture", async () => {
  const home = await readFile(path.join(ROOT, "index.html"), "utf8");
  for (const route of [
    "/guides/ia-entreprise-occitanie/",
    "/guides/facturation-electronique-pme/",
    "/guides/cybersecurite-pme/",
    "/guides/automatisation-pme/",
    "/articles/",
  ]) assert.ok(home.includes(`href="${route}"`), route);

  const transition = await readFile(
    fileForRoute("/articles/chatgpt-claude-mistral-pme.html"),
    "utf8",
  );
  assert.doesNotMatch(transition, /Ressource regroupée/i);
  assert.match(transition, /ressource a été consolidée/i);

  const css = await readFile(path.join(ROOT, "assets/css/seo-2026.css"), "utf8");
  for (const selector of [
    ".seo-scroll-progress",
    ".seo-hero-grid",
    ".seo-signal-panel",
    ".seo-pillar-badge",
    ".seo-toc",
  ]) assert.ok(css.includes(selector), selector);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
