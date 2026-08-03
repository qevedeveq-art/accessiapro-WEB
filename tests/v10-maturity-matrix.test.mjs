import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const {
  AXES,
  calculateSubscores,
  findCriticalBlockers,
  interpretAxis,
  interpretTotal,
} = require(path.join(ROOT, "assets", "js", "autodiagnostic-maturite.js"));

function answersWithAxisScore(axisName, score) {
  const answers = Object.fromEntries(
    Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, 0]),
  );
  let remaining = score;
  for (const question of AXES[axisName].questions) {
    answers[question] = Math.min(2, remaining);
    remaining -= answers[question];
  }
  return answers;
}

test("the maturity matrix covers 15 questions and three explicit axes", async () => {
  const page = await readFile(
    path.join(ROOT, "guides", "ia-pme", "index.html"),
    "utf8",
  );
  const form = page.match(/<form id="maturity-form"[\s\S]*?<\/form>/)?.[0] ?? "";

  assert.equal((form.match(/<select name="q\d+"/g) ?? []).length, 15);
  assert.equal(
    (form.match(/<option value="" selected disabled>Choisir — requis<\/option>/g) ?? []).length,
    15,
  );
  for (let index = 1; index <= 15; index += 1) {
    assert.match(form, new RegExp(`<select name="q${index}"[^>]*required`));
  }

  for (const axis of ["value", "innovation", "compliance"]) {
    assert.match(form, new RegExp(`data-maturity-axis="${axis}"`));
  }
  assert.equal((form.match(/<fieldset[^>]*data-maturity-axis=/g) ?? []).length, 3);

  for (const id of [
    "maturity-value-score",
    "maturity-value-level",
    "maturity-innovation-score",
    "maturity-innovation-level",
    "maturity-compliance-score",
    "maturity-compliance-level",
    "maturity-score",
    "maturity-blockers",
    "maturity-blocker-list",
    "maturity-reset",
    "maturity-export",
  ]) {
    assert.match(page, new RegExp(`id="${id}"`), id);
  }
  assert.match(page, /id="maturity-score">0<\/span>\/30/);
  assert.match(page, /id="maturity-calculate"[^>]*type="button"/);
  assert.match(page, /Actif original — version 2\.0/);
  assert.match(page, /sans compte, stockage, cookie ni transmission/i);
});

test("the matrix keeps data local and exports an auditable JSON result", async () => {
  const script = await readFile(
    path.join(ROOT, "assets", "js", "autodiagnostic-maturite.js"),
    "utf8",
  );

  for (const question of ["q8", "q9", "q11", "q13"]) {
    assert.match(script, new RegExp(`${question}:`), `${question} doit bloquer le pilote à zéro`);
  }
  assert.match(script, /localOnly:\s*true/);
  assert.match(script, /maturite-ia-innovation-conformite\.json/);
  assert.match(script, /generatedAt/);
  assert.match(script, /subscores/);
  assert.match(script, /blockers/);
  assert.match(script, /actions/);
  assert.match(script, /new Blob\(/);
  assert.match(script, /URL\.createObjectURL\(/);
  assert.match(script, /\.textContent\s*=/);
  assert.match(script, /\.replaceChildren\(/);
  assert.match(script, /form\.reportValidity\(\)/);

  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|document\.cookie/i);
  assert.doesNotMatch(
    script,
    /\.innerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/,
  );
});

test("the public scoring thresholds match the specification boundaries", () => {
  for (const [score, expected] of [
    [0, "Prérequis manquants"],
    [3, "Prérequis manquants"],
    [4, "Cadrage incomplet"],
    [7, "Cadrage incomplet"],
    [8, "Axe préparé"],
    [10, "Axe préparé"],
  ]) {
    assert.equal(interpretAxis(score), expected);
    assert.equal(calculateSubscores(answersWithAxisScore("value", score)).value, score);
  }

  assert.match(interpretTotal(10, []).level, /Explorer/i);
  assert.match(interpretTotal(11, []).level, /Consolider/i);
  assert.match(interpretTotal(21, []).level, /Consolider/i);
  assert.match(interpretTotal(22, []).level, /Préparer/i);
  assert.match(interpretTotal(30, []).level, /Préparer/i);
  assert.match(interpretTotal(30, ["blocage"]).level, /Sécuriser/i);

  const readyAnswers = Object.fromEntries(
    Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, 2]),
  );
  assert.deepEqual(findCriticalBlockers(readyAnswers), []);
  for (const question of ["q8", "q9", "q11", "q13"]) {
    assert.equal(findCriticalBlockers({ ...readyAnswers, [question]: 0 }).length, 1);
  }
});

test("the matrix exposes fresh primary-source context to search and AI surfaces", async () => {
  const [page, llms] = await Promise.all([
    readFile(path.join(ROOT, "guides", "ia-pme", "index.html"), "utf8"),
    readFile(path.join(ROOT, "llms.txt"), "utf8"),
  ]);

  assert.match(page, /Vérifié le 3 août 2026/);
  for (const source of [
    "www.francenum.gouv.fr",
    "www.cnil.fr",
    "cyber.gouv.fr",
    "eur-lex.europa.eu",
  ]) {
    assert.ok(page.includes(source), source);
  }
  assert.match(llms, /Guide de décision et matrice de maturité/);
  assert.doesNotMatch(llms, /Guide de décision et autodiagnostic/);
});
