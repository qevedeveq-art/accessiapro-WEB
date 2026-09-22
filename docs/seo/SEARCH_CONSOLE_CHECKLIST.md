# Checklist Search Console + IndexNow + Bing

Objectif : accélérer l'indexation Google et Bing après la mise en ligne
de la refonte SEO 2026-09 (redirects, FAQ, landings sectorielles Toulouse).

## 1. Google Search Console

### Validation propriété

1. Ouvrir https://search.google.com/search-console
2. Ajouter la propriété **domaine** `access-ia.pro` (préféré) ou l'URL exacte `https://access-ia.pro/`
3. Choisir la validation DNS (enregistrement TXT). Ajouter l'enregistrement dans la zone DNS OVH.
4. Attendre la propagation puis valider.

### Sitemap

1. Menu `Sitemaps` → soumettre `https://access-ia.pro/sitemap.xml`
2. Vérifier que le statut passe à `Réussi` et que la colonne "URL découvertes" affiche 53.

### Inspection des URL 301

Les 28 URL regroupées via `seo-redirects.conf` doivent être inspectées pour que Google mette à jour son index :

1. Menu `Inspection de l'URL`
2. Coller successivement chaque URL source (ancien slug) puis chaque URL cible.
3. Cliquer `Demander une indexation` pour la cible si elle n'apparaît pas déjà en `URL présente sur Google`.
4. Vérifier dans le rapport `Redirections avec erreur` sous 7 jours.

### Priorités d'inspection immédiates

Les 3 nouvelles pages sectorielles ne sont dans aucun index tant qu'elles n'ont pas été demandées :

- `/ia-aeronautique-toulouse.html`
- `/cybersecurite-pme-toulouse.html`
- `/ia-sante-toulouse.html`

Les 5 guides avec FAQPage schema doivent être re-parcourus pour que la FAQ soit reconnue :

- `/guides/ia-pme/`
- `/guides/cybersecurite-pme/`
- `/guides/facturation-electronique-pme/`
- `/guides/automatisation-pme/`
- `/guides/ia-entreprise-occitanie/`

### Test rich results

Après indexation, tester chaque guide FAQ via :

- https://search.google.com/test/rich-results
- Vérifier la présence du bloc `FAQPage` détecté.

## 2. Bing Webmaster Tools

1. Ouvrir https://www.bing.com/webmasters
2. Se connecter avec un compte Microsoft dédié.
3. Ajouter le site `https://access-ia.pro/`
4. Choisir l'import depuis Google Search Console (récupère automatiquement la propriété validée).
5. Soumettre le sitemap : `https://access-ia.pro/sitemap.xml`

## 3. IndexNow (Bing, Yandex, Seznam)

Protocole ouvert de notification d'URL modifiées.

### Génération de la clé

1. Générer une clé aléatoire hex 32 caractères (par exemple via `openssl rand -hex 16`).
2. Créer un fichier `KEY.txt` à la racine du site contenant exactement la clé.
3. Publier `https://access-ia.pro/KEY.txt` accessible en HTTP 200.

### Notification manuelle

Après chaque publication majeure, exécuter depuis un poste client :

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "access-ia.pro",
    "key": "VOTRE_CLE",
    "keyLocation": "https://access-ia.pro/VOTRE_CLE.txt",
    "urlList": [
      "https://access-ia.pro/ia-aeronautique-toulouse.html",
      "https://access-ia.pro/cybersecurite-pme-toulouse.html",
      "https://access-ia.pro/ia-sante-toulouse.html"
    ]
  }'
```

Une réponse HTTP 200 ou 202 confirme la prise en compte.

### Ne PAS committer

- La clé IndexNow ne doit pas être committée en clair.
- Le fichier `KEY.txt` est déposé côté serveur uniquement.
- Ajouter le fichier au `.gitignore` si l'on souhaite conserver une trace nominale.

## 4. Suivi hebdomadaire

Toutes les semaines pendant 4 semaines :

- Rapport `Couverture` Search Console : vérifier qu'aucune URL n'est en erreur.
- Rapport `Performances` : suivre les impressions sur "IA PME Toulouse", "IA aéronautique Toulouse", "cybersécurité PME Toulouse", "facturation électronique PME 2026-2027".
- Rapport `Ergonomie mobile` : zéro erreur attendue.
- Rapport `Core Web Vitals` : objectif LCP < 2.5s, INP < 200ms, CLS < 0.1 sur toutes les URL indexables.

## 5. Journal de vérifications

Tenir dans un fichier local (hors dépôt) :

- Date de soumission du sitemap
- Nombre d'URL découvertes / indexées
- URLs demandées manuellement en inspection
- Retours d'erreurs éventuels

Reprise mensuelle pour identifier les URLs qui restent hors index.
