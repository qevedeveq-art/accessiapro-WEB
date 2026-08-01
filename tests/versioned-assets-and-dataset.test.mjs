#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(
  process.argv[2] ?? path.join(import.meta.dirname, ".."),
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if ([".git", "node_modules", "output"].includes(entry.name)) {
      continue;
    }

    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }

  return files;
}

function shortHash(contents) {
  return createHash("sha256").update(contents).digest("hex").slice(0, 12);
}

test("every HTML page versions long-lived public assets with their content hash", async () => {
  const htmlFiles = (await walk(ROOT)).filter((file) => file.endsWith(".html"));
  const commonAssets = [
    "favicon.ico",
    "assets/css/style.css",
    "assets/css/seo-2026.css",
    "assets/images/apple-touch-icon.png",
    "assets/images/favicon.svg",
    "assets/images/logo-icon.webp",
    "assets/images/og-image.jpg",
  ];

  for (const asset of commonAssets) {
    const contents = await readFile(path.join(ROOT, asset));
    const expectedUrl = `/${asset}?v=${shortHash(contents)}`;

    for (const htmlFile of htmlFiles) {
      const html = await readFile(htmlFile, "utf8");
      assert.ok(
        html.includes(expectedUrl),
        `${path.relative(ROOT, htmlFile)} must reference ${expectedUrl}`,
      );
    }
  }

  const profile = await readFile(
    path.join(ROOT, "a-propos-quentin-devesa.html"),
    "utf8",
  );
  const portrait = await readFile(
    path.join(ROOT, "assets", "images", "quentin-devesa.webp"),
  );
  assert.ok(
    profile.includes(
      `/assets/images/quentin-devesa.webp?v=${shortHash(portrait)}`,
    ),
  );
});

test("the downloadable benchmark contains 30 synthetic and weighted cases", async () => {
  const datasetPath = path.join(
    ROOT,
    "assets",
    "data",
    "benchmark-assistants-pme-v1.json",
  );
  const dataset = JSON.parse(await readFile(datasetPath, "utf8"));

  assert.equal(dataset.schemaVersion, "1.0");
  assert.equal(dataset.dataClassification, "synthetic-only");
  assert.equal(dataset.cases.length, 30);
  assert.equal(new Set(dataset.cases.map(({ id }) => id)).size, 30);

  const expectedDistribution = new Map([
    ["courant", 12],
    ["ambigu", 5],
    ["sans-reponse", 4],
    ["risque", 4],
    ["adversarial", 3],
    ["reprise", 2],
  ]);
  const actualDistribution = new Map();

  for (const benchmarkCase of dataset.cases) {
    actualDistribution.set(
      benchmarkCase.category,
      (actualDistribution.get(benchmarkCase.category) ?? 0) + 1,
    );
    assert.equal(benchmarkCase.dataClass, "synthetic");
    assert.ok(benchmarkCase.task.length >= 20);
    assert.ok(benchmarkCase.prompt.length >= 20);
    assert.ok(benchmarkCase.expectedSignals.length >= 2);
    assert.ok(benchmarkCase.criticalFailures.length >= 1);
    assert.equal(
      Object.values(benchmarkCase.weights).reduce((sum, value) => sum + value, 0),
      100,
    );
  }

  assert.deepEqual(actualDistribution, expectedDistribution);
});

test("the evaluation article exposes the download and honest Dataset metadata", async () => {
  const article = await readFile(
    path.join(ROOT, "articles", "evaluer-assistant-ia-pme.html"),
    "utf8",
  );
  const datasetUrl = "/assets/data/benchmark-assistants-pme-v1.json";

  assert.match(article, new RegExp(`href="${datasetUrl}"[^>]*download`));
  assert.match(article, /données synthétiques/i);
  assert.match(article, /ne contient ni résultat ni classement/i);

  const jsonLd = article.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(jsonLd, "the evaluation article must contain JSON-LD");
  const graph = JSON.parse(jsonLd[1])["@graph"];
  const dataset = graph.find((entry) => entry["@type"] === "Dataset");

  assert.ok(dataset, "the evaluation article must declare a Dataset");
  assert.equal(
    dataset.distribution.contentUrl,
    `https://access-ia.pro${datasetUrl}`,
  );
  assert.equal(dataset.distribution.encodingFormat, "application/json");
  assert.equal(dataset.measurementTechnique, "Protocole de test sur 30 cas synthétiques");
});
