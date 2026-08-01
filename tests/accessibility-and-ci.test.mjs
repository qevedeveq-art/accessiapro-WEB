#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(
  process.argv[2] ?? path.join(import.meta.dirname, ".."),
);

function shortHash(contents) {
  return createHash("sha256").update(contents).digest("hex").slice(0, 12);
}

test("interactive tools keep labelled bounded controls and announced results", async () => {
  const maturity = await readFile(
    path.join(ROOT, "guides", "ia-pme", "index.html"),
    "utf8",
  );
  const roi = await readFile(
    path.join(ROOT, "articles", "calculateur-roi-ia-pme.html"),
    "utf8",
  );

  assert.equal((maturity.match(/<label>[\s\S]*?<select /g) ?? []).length, 10);
  assert.equal((maturity.match(/<select [^>]*required/g) ?? []).length, 10);
  assert.match(
    maturity,
    /id="maturity-result"[^>]*hidden[^>]*tabindex="-1"[^>]*aria-live="polite"/,
  );

  assert.equal((roi.match(/<label>[\s\S]*?<input /g) ?? []).length, 5);
  assert.equal(
    (roi.match(/<input [^>]*type="number"[^>]*min="[^" ]+"[^>]*max="[^" ]+"[^>]*required/g) ?? [])
      .length,
    5,
  );
  assert.match(
    roi,
    /id="roi-result"[^>]*hidden[^>]*tabindex="-1"[^>]*aria-live="polite"/,
  );
});

test("interactive scripts use their content hash and reduced motion is honoured", async () => {
  const checks = [
    [
      "guides/ia-pme/index.html",
      "assets/js/autodiagnostic-maturite.js",
    ],
    [
      "articles/calculateur-roi-ia-pme.html",
      "assets/js/calculateur-roi.js",
    ],
  ];

  for (const [pagePath, scriptPath] of checks) {
    const [page, script] = await Promise.all([
      readFile(path.join(ROOT, pagePath), "utf8"),
      readFile(path.join(ROOT, scriptPath)),
    ]);
    assert.match(
      page,
      new RegExp(`src="/${scriptPath.replaceAll(".", "\\.")}\\?v=${shortHash(script)}"`),
    );
  }

  const css = await readFile(path.join(ROOT, "assets/css/seo-2026.css"), "utf8");
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?html\s*{[\s\S]*?scroll-behavior:\s*auto/,
  );
});

test("the narrow mobile header exposes every navigation item without clipping", async () => {
  const css = await readFile(path.join(ROOT, "assets/css/seo-2026.css"), "utf8");
  const narrowMobile = css.match(
    /@media \(max-width: 520px\)\s*{([\s\S]*?)(?=\n@media \(prefers-reduced-motion)/,
  );

  assert.ok(narrowMobile, "the 520px mobile breakpoint must exist");
  assert.match(
    narrowMobile[1],
    /\.seo-header\s*{[\s\S]*?position:\s*static/,
  );
  assert.match(
    narrowMobile[1],
    /\.seo-nav\s*{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(narrowMobile[1], /overflow-x:\s*visible/);
});

test("GitHub Actions validates only and cannot deploy", async () => {
  const workflow = await readFile(
    path.join(ROOT, ".github", "workflows", "validate.yml"),
    "utf8",
  );

  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /node tests\/audit-site\.mjs/);
  assert.match(workflow, /node --test tests\/\*\.test\.mjs/);
  assert.match(workflow, /node --check assets\/js\/[^\s]+/);
  assert.doesNotMatch(workflow, /secrets\.|ssh|scp|rsync|deploy|workflow_dispatch/i);
});
