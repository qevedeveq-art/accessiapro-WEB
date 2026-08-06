// Contract checked from the generated public artefact. Keep this file inside the
// public repository so CI never depends on the private workspace or generator.
export const CONTENT_PILLARS = Object.freeze([
  { route: "/guides/ia-entreprise-occitanie/" },
  { route: "/guides/facturation-electronique-pme/" },
  { route: "/guides/cybersecurite-pme/" },
  { route: "/guides/automatisation-pme/" },
]);

export const BASE_INDEXABLE_ROUTES = Object.freeze([
  "/",
  "/articles/",
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
  // Pages legales. Indexables volontairement : la LCEN impose leur
  // accessibilite et leur presence est un signal de confiance verifiable.
  "/mentions-legales.html",
  "/politique-de-confidentialite.html",
]);

export const V7_EDITORIAL_GROUPS = Object.freeze({
  facturation: Object.freeze([
    "/guides/facturation-electronique-pme/",
    "/articles/facture-electronique-2026-pme-open-source.html",
    "/articles/choisir-plateforme-agreee-facturation-electronique-pme.html",
    "/articles/e-invoicing-e-reporting-pme.html",
    "/articles/formats-facture-electronique-factur-x-ubl-cii.html",
    "/articles/automatiser-rapprochement-facture-commande-pme.html",
  ]),
  cyber: Object.freeze([
    "/guides/cybersecurite-pme/",
    "/articles/cyberattaque-pme-occitanie-premiers-reflexes.html",
    "/articles/plan-cybersecurite-pme-30-jours.html",
    "/articles/shadow-ai-charte-pme.html",
    "/articles/fraude-facture-iban-pme.html",
    "/articles/ransomware-continuite-activite-pme.html",
    "/articles/monaidecyber-diagnostic-pme.html",
  ]),
  automatisation: Object.freeze([
    "/guides/automatisation-pme/",
    "/articles/cas-usage-assistant-documentaire.html",
    "/articles/cas-usage-emails-devis.html",
    "/articles/cas-usage-support-client.html",
    "/articles/cas-usage-controle-gestion.html",
    "/articles/cas-usage-rh-recrutement-onboarding.html",
    "/articles/cas-usage-achats-fournisseurs.html",
    "/articles/cas-usage-factures-comptabilite.html",
    "/articles/cas-usage-crm-prospection.html",
    "/articles/cas-usage-marketing-contenu.html",
    "/articles/cas-usage-qualite-conformite.html",
    "/articles/cas-usage-maintenance-production.html",
    "/articles/cas-usage-planning-ressources.html",
    "/articles/cas-usage-appels-offres.html",
    "/articles/cas-usage-contrats-juridique.html",
  ]),
  occitanie: Object.freeze([
    "/guides/ia-entreprise-occitanie/",
    "/articles/aides-accompagnement-ia-entreprise-occitanie.html",
    "/articles/entrepreneur-ia-occitanie-lancer-projet.html",
    "/articles/financer-projet-ia-pme-occitanie.html",
    "/articles/ia-pme-aeronautique.html",
    "/articles/ia-pme-agroalimentaire.html",
    "/articles/ia-pme-sante-medtech.html",
    "/articles/ia-cabinets-conseil-expertise.html",
    "/articles/ia-pmi-industrie-occitanie.html",
    "/articles/ia-batiment-artisanat-occitanie.html",
    "/articles/ia-tourisme-occitanie.html",
  ]),
});

export const V7_EDITORIAL_ROUTES = Object.freeze(
  Object.values(V7_EDITORIAL_GROUPS).flat(),
);

export const BRIDGE_ROUTES = Object.freeze([
  "/articles/diag-data-ia-pme-occitanie.html",
  "/articles/facturation-electronique-cybersecurite-pme.html",
  "/articles/gouvernance-acces-ia-pme.html",
  "/articles/automatisation-no-code-rpa-api-agent-ia-pme.html",
]);

export const V8_EXTERNAL_ROUTES = Object.freeze([
  ...V7_EDITORIAL_ROUTES,
  ...BRIDGE_ROUTES,
]);

export const AUTOMATION_CASE_ROUTES = Object.freeze(
  V7_EDITORIAL_GROUPS.automatisation.filter((route) =>
    route.includes("/cas-usage-"),
  ),
);

export const INDEXABLE_ROUTES = Object.freeze([
  ...BASE_INDEXABLE_ROUTES,
  ...V8_EXTERNAL_ROUTES,
]);

export const STUB_ROUTES = Object.freeze([
  "/ressources.html",
  "/plan-du-site.html",
  "/articles/roi-ia-pme-france.html",
  "/articles/premier-projet-ia-pme-exemple.html",
  "/articles/ia-pme-toulouse.html",
  "/articles/chatgpt-claude-mistral-pme.html",
  "/articles/copilot-vs-chatgpt-team-pme.html",
  "/articles/ia-open-source-entreprise.html",
  "/articles/glossaire-ia-dirigeants.html",
]);

// Pages generees mais volontairement hors sitemap. La page d'erreur doit
// exister dans le paquet : sans elle, le serveur sert un vestige non maitrise.
export const NON_INDEXED_GENERATED_ROUTES = Object.freeze([
  "/404.html",
  "/contact.html",
  "/contact-envoye.html",
]);

// Sous-ensemble des pages non indexees vers lesquelles une page indexable a le
// droit de pointer.
//
// La regle generale — une page indexable ne lie pas une page noindex — vise les
// stubs de transition : y renvoyer serait un defaut de consolidation. Une page
// de service n'entre pas dans cette categorie. Elle est une destination
// legitime, marquee `noindex, follow` pour deux raisons cumulatives :
//   - elle ne repond a aucune intention de recherche informationnelle et n'a
//     donc pas a diluer la surface indexable ni la carte des intentions ;
//   - tant qu'aucune entite n'est immatriculee, une page de contact ne porte
//     aucune identite legale : l'indexer maintenant n'apporte aucun signal.
// A l'immatriculation, `/contact.html` a vocation a redevenir indexable et a
// porter l'identification legale — c'est un basculement d'un seul drapeau.
//
// `/404.html` reste volontairement hors de cette liste : rien ne doit y lier.
export const LINKABLE_NON_INDEXED_ROUTES = Object.freeze([
  "/contact.html",
  "/contact-envoye.html",
]);

export const EXPECTED_GENERATED_ROUTES = Object.freeze([
  ...INDEXABLE_ROUTES,
  ...STUB_ROUTES,
  ...NON_INDEXED_GENERATED_ROUTES,
]);

export const DATED_RESOURCE_ROUTES = Object.freeze([
  "/articles/comparatif-ia-cloud-locale-pme.html",
  "/articles/top-10-ia-cloud-pme.html",
  "/articles/top-10-ia-locales-pme.html",
  "/articles/deployer-ia-locale-pme.html",
  "/articles/ai-act-pme-obligations.html",
  "/articles/evaluer-assistant-ia-pme.html",
  ...V8_EXTERNAL_ROUTES,
]);
