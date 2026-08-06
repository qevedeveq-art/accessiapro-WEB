#!/usr/bin/env node

// Contrat du formulaire de contact.
//
// Le point sensible n'est pas le rendu : c'est le fait que `contact.php` vit sur
// le serveur, hors de ce depot, et n'a jamais ete versionne. Les noms de champs
// sont donc une dependance externe invisible. Si quelqu'un renomme un champ dans
// le generateur, rien ne casse visiblement : le formulaire s'affiche, s'envoie,
// et le message part avec une valeur vide. Ce contrat rend cette regression
// bruyante.
//
// Source du contrat, triple et concordante :
//   - `docs/apps/my_webapp.md` du depot d'infrastructure ;
//   - le blueprint n8n `ContactForm0001` (cles name/email/company/need/message) ;
//   - l'ancien bundle `main.v2.js`, ecrit contre le meme endpoint.

import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { INDEXABLE_ROUTES, LINKABLE_NON_INDEXED_ROUTES } from "./site-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTACT = path.join(ROOT, "contact.html");
const CONFIRMATION = path.join(ROOT, "contact-envoye.html");
const SCRIPT = path.join(ROOT, "assets/js/contact-form.js");

// Les cinq noms attendus par le serveur. Toute modification ici doit avoir ete
// verifiee sur le serveur d'abord, jamais l'inverse.
const SERVER_FIELDS = ["name", "email", "company", "need", "message"];

async function read(file) {
  return readFile(file, "utf8");
}

test("le formulaire poste vers l'endpoint serveur reel", async () => {
  const html = await read(CONTACT);
  assert.match(
    html,
    /<form[^>]+id="contact-form"[^>]*>/,
    "l'identifiant #contact-form est le point d'accroche du script",
  );
  assert.match(html, /action="\/contact\.php"/, "action serveur absente");
  assert.match(html, /method="post"/, "methode POST absente");
});

test("les cinq champs attendus par le serveur sont presents et nommes exactement", async () => {
  const html = await read(CONTACT);
  for (const field of SERVER_FIELDS) {
    assert.match(
      html,
      new RegExp(`name="${field}"`),
      `champ « ${field} » absent du formulaire — le serveur recevra une valeur vide`,
    );
  }
});

test("les champs obligatoires portent une contrainte native", async () => {
  const html = await read(CONTACT);
  for (const field of ["name", "email", "message"]) {
    const markup = html.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`));
    assert.ok(markup, `champ ${field} introuvable`);
    assert.match(markup[0], /\brequired\b/, `champ ${field} sans attribut required`);
    assert.match(markup[0], /maxlength="\d+"/, `champ ${field} sans maxlength`);
  }
});

test("chaque champ est rattache a une etiquette explicite", async () => {
  const html = await read(CONTACT);
  const ids = [...html.matchAll(/<(?:input|select|textarea)[^>]*id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(ids.length >= SERVER_FIELDS.length, "champs sans identifiant");
  for (const id of ids) {
    assert.match(
      html,
      new RegExp(`<label[^>]*for="${id}"`),
      `aucune etiquette ne pointe vers #${id}`,
    );
  }
});

test("le script est externe : aucun script inline ne peut passer la CSP", async () => {
  for (const file of [CONTACT, CONFIRMATION]) {
    const html = await read(file);
    assert.doesNotMatch(
      html,
      /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>(?![\s\S]*application\/ld\+json)/,
      `${path.basename(file)} contient un script inline`,
    );
    assert.doesNotMatch(html, /\son[a-z]+="/, `${path.basename(file)} contient un gestionnaire inline`);
  }
  const html = await read(CONTACT);
  assert.match(html, /<script src="\/assets\/js\/contact-form\.js\?v=[a-f0-9]{12}" defer><\/script>/);
});

test("le script n'introduit ni cookie, ni stockage, ni appel tiers", async () => {
  const source = await read(SCRIPT);
  for (const forbidden of [
    /document\.cookie/,
    /localStorage/,
    /sessionStorage/,
    /innerHTML/,
    /https?:\/\/(?!\S*access-ia\.pro)/,
  ]) {
    assert.doesNotMatch(source, forbidden, `motif interdit dans contact-form.js : ${forbidden}`);
  }
});

test("le script vise le meme endpoint et les memes champs que le formulaire", async () => {
  const source = await read(SCRIPT);
  assert.match(source, /var ENDPOINT = "\/contact\.php";/);
  assert.match(source, /"X-Requested-With": "XMLHttpRequest"/);
  for (const field of SERVER_FIELDS) {
    assert.match(source, new RegExp(`\\b${field}:`), `champ ${field} absent des limites du script`);
  }
});

test("contact.php reste hors du depot statique", async () => {
  // Le fichier vit sur le serveur et est explicitement preserve au deploiement.
  // Le versionner ici creerait un second exemplaire qui divergerait en silence.
  await assert.rejects(
    stat(path.join(ROOT, "contact.php")),
    "contact.php ne doit pas etre versionne dans le depot statique",
  );
});

test("les deux pages de service sont noindex et auto-canoniques", async () => {
  for (const [file, route] of [
    [CONTACT, "/contact.html"],
    [CONFIRMATION, "/contact-envoye.html"],
  ]) {
    const html = await read(file);
    assert.match(html, /<meta name="robots" content="noindex, follow">/, `${route} devrait etre noindex`);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://access-ia\\.pro${route.replace(".", "\\.")}">`),
      `${route} devrait etre auto-canonique`,
    );
    assert.ok(
      LINKABLE_NON_INDEXED_ROUTES.includes(route),
      `${route} doit etre declaree comme destination liable`,
    );
  }
});

test("aucune des deux pages n'entre dans le sitemap", async () => {
  const sitemap = await read(path.join(ROOT, "sitemap.xml"));
  for (const route of ["/contact.html", "/contact-envoye.html"]) {
    assert.doesNotMatch(sitemap, new RegExp(route.replace(".", "\\.")), `${route} ne doit pas etre dans le sitemap`);
  }
});

test("le formulaire est atteignable depuis au moins deux pages indexables", async () => {
  let sources = 0;
  for (const route of INDEXABLE_ROUTES) {
    const file = route.endsWith("/")
      ? path.join(ROOT, route.slice(1), "index.html")
      : path.join(ROOT, route.slice(1));
    const html = await read(file).catch(() => "");
    if (html.includes('href="/contact.html"')) sources += 1;
  }
  assert.ok(
    sources >= 2,
    `le formulaire n'est lie que depuis ${sources} page(s) indexable(s) — il resterait invisible`,
  );
});

test("la page de contact informe sur les donnees au moment de la collecte", async () => {
  // Article 13 du RGPD : l'information est due au moment ou la donnee est
  // collectee, pas seulement dans une politique atteignable en deux clics.
  const html = await read(CONTACT);
  assert.match(html, /href="\/politique-de-confidentialite\.html"/);
  assert.match(html, /intérêt légitime/i, "base legale absente de la page de collecte");
  assert.match(html, /douze mois/i, "duree de conservation absente de la page de collecte");
});

test("aucune promesse commerciale n'est ouverte par le formulaire", async () => {
  const html = await read(CONTACT);
  for (const forbidden of [/devis gratuit/i, /nos clients/i, /audit offert/i, /nous intervenons/i]) {
    assert.doesNotMatch(html, forbidden, "affirmation incompatible avec le pre-lancement");
  }
  assert.match(html, /janvier 2027/, "le statut de pre-lancement doit rester explicite");
});
