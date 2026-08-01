#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT_ROOT = path.resolve(
  ROOT,
  "..",
  "SEO access-ia",
  "content",
);

const { facturationPages } = await import(
  path.join(CONTENT_ROOT, "facturation-pages.mjs")
);
const { cyberPages } = await import(path.join(CONTENT_ROOT, "cyber-pages.mjs"));
const { automationPages } = await import(
  path.join(CONTENT_ROOT, "automation-pages.mjs")
);
const { occitaniePages } = await import(
  path.join(CONTENT_ROOT, "occitanie-pages.mjs")
);

const editorialPages = [
  ...facturationPages,
  ...cyberPages,
  ...automationPages,
  ...occitaniePages,
];

function fileForRoute(route) {
  if (route.endsWith("/")) {
    return path.join(ROOT, route.slice(1), "index.html");
  }
  return path.join(ROOT, route.slice(1));
}

test("the v7 catalogue exposes the complete four-pillar editorial programme", () => {
  assert.equal(facturationPages.length, 6);
  assert.equal(cyberPages.length, 7);
  assert.equal(automationPages.length, 15);
  assert.equal(occitaniePages.length, 11);
  assert.equal(editorialPages.length, 39);
  assert.equal(new Set(editorialPages.map(({ route }) => route)).size, 39);

  const requiredHubs = [
    "/guides/facturation-electronique-pme/",
    "/guides/cybersecurite-pme/",
    "/guides/automatisation-pme/",
    "/guides/ia-entreprise-occitanie/",
  ];
  for (const route of requiredHubs) {
    assert.ok(editorialPages.some((page) => page.route === route), route);
  }
});

test("every v7 page carries review metadata, primary references and no forbidden host", () => {
  for (const page of editorialPages) {
    assert.match(page.route, /^\/(?:articles|guides)\//, page.route);
    assert.equal(page.schemaType, "Article", page.route);
    assert.match(page.datePublished, /^2026-\d{2}-\d{2}$/, page.route);
    assert.match(page.dateModified, /^2026-\d{2}-\d{2}$/, page.route);
    assert.ok(page.nextReview?.length >= 8, page.route);
    assert.ok(page.content.length >= 1800, `${page.route}: contenu trop court`);
    assert.doesNotMatch(
      page.content,
      /(?:https?:\/\/)?[a-z0-9-]+\.access-ia\.pro/i,
      page.route,
    );
    const sourceLinks = page.content.match(/href="https:\/\/(?!access-ia\.pro)[^"]+"/g) ?? [];
    assert.ok(sourceLinks.length >= 2, `${page.route}: sources primaires insuffisantes`);
  }
});

test("the generated site indexes every v7 page and restores the article catalogue", async () => {
  for (const page of editorialPages) {
    const html = await readFile(fileForRoute(page.route), "utf8");
    assert.doesNotMatch(html, /content="noindex, follow"/, page.route);
    assert.doesNotMatch(html, /Contenu regroupé|Archive éditoriale/, page.route);
    assert.match(html, /"@type":"Article"/, page.route);
    assert.match(html, /Prochaine revue :/, page.route);
  }

  const articleIndex = await readFile(
    path.join(ROOT, "articles", "index.html"),
    "utf8",
  );
  assert.doesNotMatch(articleIndex, /content="noindex, follow"/);
  for (const route of [
    "/guides/facturation-electronique-pme/",
    "/guides/cybersecurite-pme/",
    "/guides/automatisation-pme/",
    "/guides/ia-entreprise-occitanie/",
  ]) {
    assert.match(articleIndex, new RegExp(`href="${route}"`));
  }
});

test("sitemap and LLM discovery surfaces expose the expanded catalogue", async () => {
  const sitemap = await readFile(path.join(ROOT, "sitemap.xml"), "utf8");
  const locations = sitemap.match(/<loc>/g) ?? [];
  assert.equal(locations.length, 57);

  const llms = await readFile(path.join(ROOT, "llms.txt"), "utf8");
  const full = await readFile(path.join(ROOT, "llms-full.txt"), "utf8");
  for (const route of [
    "/guides/facturation-electronique-pme/",
    "/guides/cybersecurite-pme/",
    "/guides/automatisation-pme/",
    "/guides/ia-entreprise-occitanie/",
  ]) {
    assert.ok(llms.includes(route), route);
    assert.ok(full.includes(route), route);
  }
});

test("the build produces the expected public HTML surface", async () => {
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full)));
      else files.push(full);
    }
    return files;
  }

  const htmlFiles = (await walk(ROOT)).filter((file) => file.endsWith(".html"));
  assert.equal(htmlFiles.length, 66);
});
