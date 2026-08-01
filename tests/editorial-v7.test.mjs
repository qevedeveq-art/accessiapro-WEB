#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  V7_EDITORIAL_GROUPS,
  V7_EDITORIAL_ROUTES,
} from "./site-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function fileForRoute(route) {
  if (route.endsWith("/")) {
    return path.join(ROOT, route.slice(1), "index.html");
  }
  return path.join(ROOT, route.slice(1));
}

test("the v7 catalogue exposes the complete four-pillar editorial programme", () => {
  assert.equal(V7_EDITORIAL_GROUPS.facturation.length, 6);
  assert.equal(V7_EDITORIAL_GROUPS.cyber.length, 7);
  assert.equal(V7_EDITORIAL_GROUPS.automatisation.length, 15);
  assert.equal(V7_EDITORIAL_GROUPS.occitanie.length, 11);
  assert.equal(V7_EDITORIAL_ROUTES.length, 39);
  assert.equal(new Set(V7_EDITORIAL_ROUTES).size, 39);

  const requiredHubs = [
    "/guides/facturation-electronique-pme/",
    "/guides/cybersecurite-pme/",
    "/guides/automatisation-pme/",
    "/guides/ia-entreprise-occitanie/",
  ];
  for (const route of requiredHubs) {
    assert.ok(V7_EDITORIAL_ROUTES.includes(route), route);
  }
});

test("every v7 page carries review metadata, primary references and no forbidden host", async () => {
  for (const route of V7_EDITORIAL_ROUTES) {
    const html = await readFile(fileForRoute(route), "utf8");
    assert.match(route, /^\/(?:articles|guides)\//, route);
    assert.match(html, /"@type":"Article"/, route);
    assert.match(html, /"datePublished":"2026-\d{2}-\d{2}"/, route);
    assert.match(html, /"dateModified":"2026-\d{2}-\d{2}"/, route);
    assert.match(html, /Prochaine revue :/, route);
    assert.ok(html.length >= 10_000, `${route}: contenu généré trop court`);
    assert.doesNotMatch(
      html,
      /(?:https?:\/\/)?[a-z0-9-]+\.access-ia\.pro/i,
      route,
    );
    const sourceLinks = html.match(/href="https:\/\/(?!access-ia\.pro)[^"]+"/g) ?? [];
    assert.ok(sourceLinks.length >= 2, `${route}: sources primaires insuffisantes`);
  }
});

test("the generated site indexes every v7 page and restores the article catalogue", async () => {
  for (const route of V7_EDITORIAL_ROUTES) {
    const html = await readFile(fileForRoute(route), "utf8");
    assert.doesNotMatch(html, /content="noindex, follow"/, route);
    assert.doesNotMatch(html, /Contenu regroupé|Archive éditoriale/, route);
    assert.match(html, /"@type":"Article"/, route);
    assert.match(html, /Prochaine revue :/, route);
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
  assert.equal(locations.length, 61);

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
  assert.equal(htmlFiles.length, 70);
});
