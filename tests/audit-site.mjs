#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.argv[2] ?? ".");
const ORIGIN = "https://access-ia.pro";
const expectedIndexable = new Set([
  "/",
  "/ressources/",
  "/guides/ia-pme/",
  "/guides/automatisation-pme/",
  "/guides/cybersecurite-pme/",
  "/guides/facturation-electronique-pme/",
  "/guides/ia-entreprise-occitanie/",
  "/tarifs-ia-pme.html",
  "/mentions-legales.html",
  "/politique-de-confidentialite.html",
  "/articles/rgpd-ia-entreprise.html",
  "/articles/securite-ia-pme-fuites-donnees.html",
  "/articles/menaces-ia-2026.html",
  "/articles/calculateur-roi-ia-pme.html",
  "/articles/comparatif-ia-cloud-locale-pme.html",
  "/articles/deployer-ia-locale-pme.html",
  "/articles/ai-act-pme-obligations.html",
  "/articles/evaluer-assistant-ia-pme.html",
  "/methodologie.html",
  "/articles/formation-equipe-ia.html",
  "/conseil-ia-toulouse.html",
  "/a-propos-quentin-devesa.html",
  "/articles/prompt-injection-audit-pme.html",
  "/articles/mcp-agent-ia-pme.html",
  "/articles/souverainete-ia-france-ue.html",
  "/articles/journal-usage-ia-pme.html",
  "/articles/applications-metier-sur-mesure.html",
  "/articles/rag-interne-securise-pme.html",
  "/articles/top-10-ia-cloud-pme.html",
  "/articles/top-10-ia-locales-pme.html",
  "/articles/aides-accompagnement-ia-entreprise-occitanie.html",
  "/articles/automatisation-no-code-rpa-api-agent-ia-pme.html",
  "/articles/automatiser-rapprochement-facture-commande-pme.html",
  "/articles/choisir-plateforme-agreee-facturation-electronique-pme.html",
  "/articles/cyberattaque-pme-occitanie-premiers-reflexes.html",
  "/articles/diag-data-ia-pme-occitanie.html",
  "/articles/e-invoicing-e-reporting-pme.html",
  "/articles/entrepreneur-ia-occitanie-lancer-projet.html",
  "/articles/facturation-electronique-cybersecurite-pme.html",
  "/articles/financer-projet-ia-pme-occitanie.html",
  "/articles/formats-facture-electronique-factur-x-ubl-cii.html",
  "/articles/fraude-facture-iban-pme.html",
  "/articles/gouvernance-acces-ia-pme.html",
  "/articles/ia-batiment-artisanat-occitanie.html",
  "/articles/ia-pmi-industrie-occitanie.html",
  "/articles/ia-tourisme-occitanie.html",
  "/articles/monaidecyber-diagnostic-pme.html",
  "/articles/plan-cybersecurite-pme-30-jours.html",
  "/articles/ransomware-continuite-activite-pme.html",
  "/articles/shadow-ai-charte-pme.html",
]);
const auxiliaryRoutes = new Set([
  "/404.html",
  "/articles/integrer-ia-pme.html",
  "/contact.html",
  "/contact-envoye.html",
]);
const selfCanonicalNoindexAllowed = new Set([
  "/404.html",
  "/articles/facture-electronique-2026-pme-open-source.html",
  "/contact.html",
  "/contact-envoye.html",
]);
const linkableAuxiliary = new Set([
  "/articles/",
  "/contact.html",
  "/contact-envoye.html",
  "/articles/facture-electronique-2026-pme-open-source.html",
  "/articles/integrer-ia-pme.html",
  "/articles/cas-usage-achats-fournisseurs.html",
  "/articles/cas-usage-appels-offres.html",
  "/articles/cas-usage-assistant-documentaire.html",
  "/articles/cas-usage-contrats-juridique.html",
  "/articles/cas-usage-controle-gestion.html",
  "/articles/cas-usage-crm-prospection.html",
  "/articles/cas-usage-emails-devis.html",
  "/articles/cas-usage-factures-comptabilite.html",
  "/articles/cas-usage-maintenance-production.html",
  "/articles/cas-usage-marketing-contenu.html",
  "/articles/cas-usage-planning-ressources.html",
  "/articles/cas-usage-qualite-conformite.html",
  "/articles/cas-usage-rh-recrutement-onboarding.html",
  "/articles/cas-usage-support-client.html",
  "/articles/ia-pme-aeronautique.html",
  "/articles/ia-pme-agroalimentaire.html",
  "/articles/ia-pme-sante-medtech.html",
  "/articles/ia-pme-toulouse.html",
  "/articles/ia-cabinets-conseil-expertise.html",
  "/articles/ia-open-source-entreprise.html",
  "/articles/chatgpt-claude-mistral-pme.html",
  "/articles/copilot-vs-chatgpt-team-pme.html",
  "/articles/premier-projet-ia-pme-exemple.html",
  "/articles/glossaire-ia-dirigeants.html",
  "/articles/roi-ia-pme-france.html",
]);
const datedResourceArticles = new Set([
  "/articles/comparatif-ia-cloud-locale-pme.html",
  "/articles/deployer-ia-locale-pme.html",
  "/articles/ai-act-pme-obligations.html",
  "/articles/evaluer-assistant-ia-pme.html",
]);
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function routeForFile(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) {
    return `/${relative.slice(0, -"index.html".length)}`;
  }
  return `/${relative}`;
}

function requireMatch(contents, pattern, label, file) {
  if (!pattern.test(contents)) {
    errors.push(`${path.relative(ROOT, file)}: ${label}`);
  }
}

const allFiles = await walk(ROOT);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const htmlByRoute = new Map(htmlFiles.map((file) => [routeForFile(file), file]));
const internalReferences = [];
const incomingFromIndexable = new Map(
  [...expectedIndexable].map((route) => [route, new Set()]),
);
const indexableMetadata = [];

if (htmlFiles.length !== 83) {
  errors.push(`83 pages HTML publiques attendues, ${htmlFiles.length} trouvées`);
}
for (const route of auxiliaryRoutes) {
  if (!htmlByRoute.has(route)) errors.push(`page auxiliaire manquante ${route}`);
}

const publicTextFiles = allFiles.filter((file) =>
  /\.(?:html|txt|xml|json|js|css|webmanifest)$/.test(file),
);
for (const file of publicTextFiles) {
  const contents = await readFile(file, "utf8");
  if (/(?:https?:\/\/)?[a-z0-9-]+\.access-ia\.pro/i.test(contents)) {
    errors.push(`${path.relative(ROOT, file)}: référence interdite à un sous-domaine`);
  }
}

const forbiddenClaims = [
  /ACCESSIA Pro accompagne/i,
  /missions? ACCESSIA Pro/i,
  /devis (?:personnalisé )?sous/i,
  /fondateur(?: & dirigeant)? d['’]ACCESSIA Pro/i,
  /clients? accompagnés?/i,
  /résultats? (?:réels?|mesurés?) en mission/i,
];
const forbiddenSchema = [
  /"@type"\s*:\s*"(?:LocalBusiness|ProfessionalService|Offer|OfferCatalog|Service|PriceSpecification|OpeningHoursSpecification)"/,
  /"(?:telephone|openingHours|foundingDate|priceRange)"\s*:/,
];

for (const file of htmlFiles) {
  const contents = await readFile(file, "utf8");
  const route = routeForFile(file);
  const isNoIndex = /<meta name="robots" content="noindex, follow">/.test(contents);
  const canonicalMatch = contents.match(
    /<link rel="canonical" href="https:\/\/access-ia\.pro([^"]*)">/,
  );
  const titleMatch = contents.match(/<title>([^<]+)<\/title>/);
  const descriptionMatch = contents.match(
    /<meta name="description" content="([^"]+)">/,
  );
  const h1Match = contents.match(/<h1(?:\s[^>]*)?>([\s\S]+?)<\/h1>/);

  requireMatch(contents, /<!doctype html>/i, "doctype absent", file);
  requireMatch(contents, /<html lang="fr">/, "langue HTML absente", file);
  requireMatch(contents, /<title>[^<]{15,}<\/title>/, "title absent ou trop court", file);
  requireMatch(
    contents,
    /<meta name="description" content="[^"]{50,}">/,
    "description absente ou trop courte",
    file,
  );
  requireMatch(
    contents,
    /<link rel="canonical" href="https:\/\/access-ia\.pro\//,
    "canonique absent",
    file,
  );
  requireMatch(contents, /<h1(?:\s[^>]*)?>[\s\S]+?<\/h1>/, "H1 absent", file);

  if (expectedIndexable.has(route) && isNoIndex) {
    errors.push(`${route}: page cible marquée noindex`);
  }
  if (!expectedIndexable.has(route) && !isNoIndex) {
    errors.push(`${route}: page hors cible encore indexable`);
  }
  if (isNoIndex && canonicalMatch?.[1] === route && !selfCanonicalNoindexAllowed.has(route)) {
    errors.push(`${route}: page noindex auto-canonique non autorisée`);
  }
  if (
    route === "/articles/integrer-ia-pme.html" &&
    canonicalMatch?.[1] !== "/guides/ia-pme/"
  ) {
    errors.push(`${route}: canonique de consolidation incorrecte`);
  }

  if (expectedIndexable.has(route)) {
    indexableMetadata.push({
      route,
      title: titleMatch?.[1],
      description: descriptionMatch?.[1],
      h1: h1Match?.[1].replace(/<[^>]+>/g, "").trim(),
    });
    if (route !== "/" && !/"@type":"BreadcrumbList"/.test(contents)) {
      errors.push(`${route}: BreadcrumbList absent`);
    }
    if (datedResourceArticles.has(route)) {
      if (!/"datePublished":"2026-07-29"/.test(contents)) {
        errors.push(`${route}: datePublished absente ou incorrecte`);
      }
      if (!/Prochaine revue :/.test(contents)) {
        errors.push(`${route}: prochaine date de revue absente`);
      }
      const sourceLinks = contents.match(
        /href="https:\/\/(?!access-ia\.pro)[^"]+"/g,
      ) ?? [];
      if (sourceLinks.length < 4) {
        errors.push(`${route}: moins de quatre liens vers des sources primaires`);
      }
    }
  }

  for (const pattern of [...forbiddenClaims, ...forbiddenSchema]) {
    if (pattern.test(contents)) errors.push(`${route}: motif interdit ${pattern}`);
  }

  for (const block of contents.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      errors.push(`${route}: JSON-LD invalide (${error.message})`);
    }
  }

  for (const link of contents.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = link[1];
    if (value.startsWith("/") && !value.startsWith("//")) {
      internalReferences.push({ sourceRoute: route, value });
    }
  }
}

for (const reference of internalReferences) {
  const pathname = reference.value.split(/[?#]/, 1)[0];
  if (!pathname) continue;
  const targetFile = pathname === "/"
    ? path.join(ROOT, "index.html")
    : pathname.endsWith("/")
      ? path.join(ROOT, pathname.slice(1), "index.html")
      : path.join(ROOT, pathname.slice(1));
  try {
    const info = await stat(targetFile);
    if (!info.isFile()) throw new Error("not a file");
  } catch {
    errors.push(`${reference.sourceRoute}: lien interne cassé ${reference.value}`);
  }

  const targetRoute = pathname.endsWith("/")
    ? pathname
    : htmlByRoute.has(pathname)
      ? pathname
      : null;
  if (
    expectedIndexable.has(reference.sourceRoute) &&
    targetRoute &&
    htmlByRoute.has(targetRoute) &&
    !expectedIndexable.has(targetRoute) &&
    !linkableAuxiliary.has(targetRoute)
  ) {
    errors.push(`${reference.sourceRoute}: lien vers une page noindex ${targetRoute}`);
  }
  if (
    expectedIndexable.has(reference.sourceRoute) &&
    expectedIndexable.has(targetRoute) &&
    targetRoute !== reference.sourceRoute
  ) {
    incomingFromIndexable.get(targetRoute).add(reference.sourceRoute);
  }
}

for (const route of expectedIndexable) {
  if (route !== "/" && incomingFromIndexable.get(route).size < 2) {
    errors.push(`${route}: moins de deux liens entrants depuis les pages indexables`);
  }
}

for (const field of ["title", "description", "h1"]) {
  const values = new Map();
  for (const metadata of indexableMetadata) {
    const routes = values.get(metadata[field]) ?? [];
    routes.push(metadata.route);
    values.set(metadata[field], routes);
  }
  for (const [value, routes] of values) {
    if (value && routes.length > 1) {
      errors.push(`métadonnée ${field} dupliquée: ${routes.join(", ")}`);
    }
  }
}

const sitemap = await readFile(path.join(ROOT, "sitemap.xml"), "utf8");
const sitemapRoutes = new Set(
  [...sitemap.matchAll(/<loc>https:\/\/access-ia\.pro([^<]*)<\/loc>/g)].map(
    (match) => match[1] || "/",
  ),
);
if (sitemapRoutes.size !== expectedIndexable.size) {
  errors.push(`sitemap: ${expectedIndexable.size} URL attendues, ${sitemapRoutes.size} trouvées`);
}
for (const route of expectedIndexable) {
  if (!sitemapRoutes.has(route)) errors.push(`sitemap: URL manquante ${route}`);
}
for (const route of sitemapRoutes) {
  if (!expectedIndexable.has(route)) errors.push(`sitemap: URL non canonique ${route}`);
}

const robots = await readFile(path.join(ROOT, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) {
  errors.push("robots.txt: sitemap canonique absent");
}
for (const crawler of ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider"]) {
  const block = new RegExp(`User-agent: ${crawler}\\s+Disallow: /`, "i");
  if (!block.test(robots)) errors.push(`robots.txt: blocage entraînement absent pour ${crawler}`);
}

const llms = await readFile(path.join(ROOT, "llms.txt"), "utf8");
if (llms.length > 4000) errors.push(`llms.txt trop long (${llms.length} caractères)`);
for (const pattern of forbiddenClaims) {
  if (pattern.test(llms)) errors.push(`llms.txt: motif interdit ${pattern}`);
}

for (const asset of [
  "assets/images/og-image.webp",
  "assets/images/og-image.jpg",
  "assets/css/style.css",
  "assets/css/seo-2026.css",
  "assets/js/calculateur-roi.js",
  "assets/js/autodiagnostic-maturite.js",
]) {
  try {
    const info = await stat(path.join(ROOT, asset));
    if (!info.isFile() || info.size === 0) errors.push(`${asset}: actif vide`);
  } catch {
    errors.push(`${asset}: actif absent`);
  }
}

const forbiddenPlaceholders =
  /unsplash|picsum|placeholder\.com|placehold\.co|via\.placeholder|lorem\.space|dummyimage/i;
for (const file of publicTextFiles) {
  const contents = await readFile(file, "utf8");
  if (forbiddenPlaceholders.test(contents)) {
    errors.push(`${path.relative(ROOT, file)}: URL placeholder interdite`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.length} erreur(s):\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(
  `Audit public OK: ${htmlFiles.length} pages, ${expectedIndexable.size} URL indexables, politiques SEO et IA conformes.\n`,
);
