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
  "/tarifs-ia-pme.html",
  "/articles/rgpd-ia-entreprise.html",
  "/articles/securite-ia-pme-fuites-donnees.html",
  "/articles/calculateur-roi-ia-pme.html",
  "/articles/comparatif-ia-cloud-locale-pme.html",
  "/articles/top-10-ia-cloud-pme.html",
  "/articles/top-10-ia-locales-pme.html",
  "/articles/deployer-ia-locale-pme.html",
  "/articles/ai-act-pme-obligations.html",
  "/articles/evaluer-assistant-ia-pme.html",
  "/methodologie.html",
  "/articles/formation-equipe-ia.html",
  "/conseil-ia-toulouse.html",
  "/a-propos-quentin-devesa.html",
]);
const archivedAllowed = new Set([
  "/articles/facture-electronique-2026-pme-open-source.html",
]);
const datedResourceArticles = new Map([
  ["/articles/comparatif-ia-cloud-locale-pme.html", "2026-07-29"],
  ["/articles/top-10-ia-cloud-pme.html", "2026-08-01"],
  ["/articles/top-10-ia-locales-pme.html", "2026-08-01"],
  ["/articles/deployer-ia-locale-pme.html", "2026-07-29"],
  ["/articles/ai-act-pme-obligations.html", "2026-07-29"],
  ["/articles/evaluer-assistant-ia-pme.html", "2026-07-29"],
]);
const errors = [];
const selectionPages = new Map([
  [
    "/articles/top-10-ia-cloud-pme.html",
    {
      label: "sélection cloud",
      minimumSourceLinks: 20,
    },
  ],
  [
    "/articles/top-10-ia-locales-pme.html",
    {
      label: "sélection locale",
      minimumSourceLinks: 20,
    },
  ],
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git") {
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

function routeForFile(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  if (relative === "index.html") {
    return "/";
  }
  if (relative.endsWith("/index.html")) {
    return `/${relative.slice(0, -"index.html".length)}`;
  }
  return `/${relative}`;
}

function matchOne(contents, pattern, label, file) {
  if (!pattern.test(contents)) {
    errors.push(`${path.relative(ROOT, file)}: ${label}`);
  }
}

const allFiles = await walk(ROOT);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const htmlByRoute = new Map(
  htmlFiles.map((file) => [routeForFile(file), file]),
);
const internalReferences = [];
const incomingFromIndexable = new Map(
  [...expectedIndexable].map((route) => [route, new Set()]),
);
const indexableMetadata = [];

if (htmlFiles.length !== 46) {
  errors.push(`46 pages HTML attendues, ${htmlFiles.length} trouvées`);
}

const publicTextFiles = allFiles.filter((file) =>
  /\.(?:html|txt|xml|json|js|css|webmanifest)$/.test(file),
);

for (const file of publicTextFiles) {
  const contents = await readFile(file, "utf8");
  if (/(?:https?:\/\/)?[a-z0-9-]+\.access-ia\.pro/i.test(contents)) {
    errors.push(
      `${path.relative(ROOT, file)}: référence interdite à un sous-domaine`,
    );
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
  const isNoIndex = /<meta name="robots" content="noindex, follow">/.test(
    contents,
  );
  const canonicalMatch = contents.match(
    /<link rel="canonical" href="https:\/\/access-ia\.pro([^"]*)">/,
  );
  const titleMatch = contents.match(/<title>([^<]+)<\/title>/);
  const descriptionMatch = contents.match(
    /<meta name="description" content="([^"]+)">/,
  );
  const h1Match = contents.match(/<h1>([\s\S]+?)<\/h1>/);

  matchOne(contents, /<!doctype html>/i, "doctype absent", file);
  matchOne(contents, /<html lang="fr">/, "langue HTML absente", file);
  matchOne(contents, /<title>[^<]{15,}<\/title>/, "title absent ou trop court", file);
  matchOne(
    contents,
    /<meta name="description" content="[^"]{50,}">/,
    "description absente ou trop courte",
    file,
  );
  matchOne(contents, /<link rel="canonical" href="https:\/\/access-ia\.pro\//, "canonique absent", file);
  matchOne(contents, /<h1>[\s\S]+?<\/h1>/, "H1 absent", file);

  const forbiddenFrontendPatterns = [
    [/<script[^>]+src="https?:\/\//i, "script tiers interdit"],
    [/<link[^>]+href="https?:\/\/[^"]+"[^>]+rel="stylesheet"/i, "style tiers interdit"],
    [/\son[a-z]+\s*=/i, "gestionnaire d'événement HTML inline interdit"],
    [/(?:href|src)="(?:javascript:|data:text\/html)/i, "URL active interdite"],
  ];
  for (const [pattern, label] of forbiddenFrontendPatterns) {
    if (pattern.test(contents)) {
      errors.push(`${route}: ${label}`);
    }
  }

  for (const script of contents.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attributes = script[1];
    const body = script[2].trim();
    const isJsonLd = /type="application\/ld\+json"/.test(attributes);
    const isLocalExternal = /src="\/(?!\/)[^"]+"/.test(attributes) && !body;
    if (!isJsonLd && !isLocalExternal) {
      errors.push(`${route}: script inline exécutable interdit`);
    }
  }

  for (const anchor of contents.matchAll(/<a\b([^>]*)>/g)) {
    const attributes = anchor[1];
    if (
      /target="_blank"/.test(attributes) &&
      !/rel="[^"]*noopener[^"]*"/.test(attributes)
    ) {
      errors.push(`${route}: lien target=_blank sans noopener`);
    }
  }

  if (expectedIndexable.has(route) && isNoIndex) {
    errors.push(`${route}: page cible marquée noindex`);
  }
  if (!expectedIndexable.has(route) && !isNoIndex) {
    errors.push(`${route}: page hors cible encore indexable`);
  }
  if (
    isNoIndex &&
    canonicalMatch?.[1] === route &&
    !archivedAllowed.has(route)
  ) {
    errors.push(
      `${route}: page noindex auto-canonique non déclarée comme archive`,
    );
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
      const expectedPublished = datedResourceArticles.get(route);
      if (!contents.includes(`"datePublished":"${expectedPublished}"`)) {
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
    if (selectionPages.has(route)) {
      const requirements = selectionPages.get(route);
      const entries = contents.match(/data-selection-entry/g) ?? [];
      const sourceLinks = contents.match(
        /href="https:\/\/(?!access-ia\.pro)[^"]+"/g,
      ) ?? [];
      if (entries.length !== 10) {
        errors.push(
          `${route}: ${requirements.label} attendue avec 10 entrées, ${entries.length} trouvées`,
        );
      }
      if (!/Sélection non classée/i.test(contents)) {
        errors.push(`${route}: transparence sur la sélection non classée absente`);
      }
      if (!/sans partenariat commercial/i.test(contents)) {
        errors.push(`${route}: déclaration d'indépendance éditoriale absente`);
      }
      if (sourceLinks.length < requirements.minimumSourceLinks) {
        errors.push(
          `${route}: ${sourceLinks.length} liens de source, minimum ${requirements.minimumSourceLinks}`,
        );
      }
      if (!/"@type":"ItemList"/.test(contents)) {
        errors.push(`${route}: ItemList absent`);
      }
      if (!/"itemListOrder":"https:\/\/schema\.org\/ItemListUnordered"/.test(contents)) {
        errors.push(`${route}: ItemList doit rester non ordonné`);
      }
      if (!/"numberOfItems":10/.test(contents)) {
        errors.push(`${route}: ItemList doit déclarer 10 entrées`);
      }
      if (/"@type":"(?:Product|Review|AggregateRating)"/.test(contents)) {
        errors.push(`${route}: schéma de classement ou d'avis interdit`);
      }
    }
  }

  for (const pattern of [...forbiddenClaims, ...forbiddenSchema]) {
    if (pattern.test(contents)) {
      errors.push(`${route}: motif interdit ${pattern}`);
    }
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
    if (
      value.startsWith("/") &&
      !value.startsWith("//")
    ) {
      internalReferences.push({ sourceRoute: route, value });
    }
  }
}

for (const reference of internalReferences) {
  const pathname = reference.value.split(/[?#]/, 1)[0];
  if (!pathname) {
    continue;
  }

  let targetFile;
  if (pathname === "/") {
    targetFile = path.join(ROOT, "index.html");
  } else if (pathname.endsWith("/")) {
    targetFile = path.join(ROOT, pathname.slice(1), "index.html");
  } else {
    targetFile = path.join(ROOT, pathname.slice(1));
  }

  try {
    const info = await stat(targetFile);
    if (!info.isFile()) {
      errors.push(
        `${reference.sourceRoute}: lien interne sans fichier ${reference.value}`,
      );
    }
  } catch {
    errors.push(
      `${reference.sourceRoute}: lien interne cassé ${reference.value}`,
    );
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
    !expectedIndexable.has(targetRoute)
  ) {
    errors.push(
      `${reference.sourceRoute}: lien vers une page noindex ${targetRoute}`,
    );
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
  if (route === "/") {
    continue;
  }
  const incoming = incomingFromIndexable.get(route).size;
  if (incoming < 2) {
    errors.push(
      `${route}: ${incoming} lien(s) entrant(s) depuis les pages indexables, minimum 2`,
    );
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
      errors.push(
        `métadonnée ${field} dupliquée sur pages indexables: ${routes.join(", ")}`,
      );
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
  errors.push(
    `sitemap: ${expectedIndexable.size} URL attendues, ${sitemapRoutes.size} trouvées`,
  );
}
for (const route of expectedIndexable) {
  if (!sitemapRoutes.has(route)) {
    errors.push(`sitemap: URL manquante ${route}`);
  }
}
for (const route of sitemapRoutes) {
  if (!expectedIndexable.has(route)) {
    errors.push(`sitemap: URL non canonique ${route}`);
  }
}

const robots = await readFile(path.join(ROOT, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) {
  errors.push("robots.txt: sitemap canonique absent");
}

const llms = await readFile(path.join(ROOT, "llms.txt"), "utf8");
if (llms.length > 4000) {
  errors.push(`llms.txt trop long (${llms.length} caractères)`);
}
for (const pattern of forbiddenClaims) {
  if (pattern.test(llms)) {
    errors.push(`llms.txt: motif interdit ${pattern}`);
  }
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
    if (!info.isFile() || info.size === 0) {
      errors.push(`${asset}: actif vide`);
    }
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
  `Audit OK: ${htmlFiles.length} pages, ${expectedIndexable.size} URL indexables, aucun sous-domaine référencé.\n`,
);
