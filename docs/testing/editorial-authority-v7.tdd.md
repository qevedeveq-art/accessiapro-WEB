# Preuves de validation — catalogue éditorial v7

Date : 1er août 2026.

## Contrat éditorial

La v7 doit publier quatre dossiers distincts et 39 pages documentées :

| Dossier | Pages | Finalité |
|---|---:|---|
| Facturation électronique | 6 | Préparer les échéances 2026–2027, les plateformes agréées, les flux et les formats. |
| Cybersécurité | 7 | Prévenir, réagir et orienter une PME vers les dispositifs officiels. |
| Automatisation | 15 | Relier un dossier méthode à quatorze cas d'usage contrôlés par l'humain. |
| Entrepreneuriat et Occitanie | 11 | Cartographier les acteurs, secteurs et méthodes sans inventer de partenariat. |

## Résultats

| Contrôle | Commande ou méthode | Résultat |
|---|---|---|
| Contrat des quatre modules, métadonnées, sources et routes | `node --test tests/*.test.mjs` | 12/12 PASS |
| Canonicals, indexabilité, liens internes, JSON-LD et hôtes interdits | `node tests/audit-site.mjs .` | 66 pages, 57 URL indexables, PASS |
| Allowlist et rejet des liens symboliques | suite du packageur racine | 3/3 PASS |
| Paquet public | packageur racine | 91 fichiers, dont 66 HTML |
| Sources externes | 169 URL distinctes, HEAD puis GET pour les réponses ambiguës | aucune URL cassée confirmée |
| Sécurité frontend | scan des sinks DOM, scripts tiers, stockage et secrets | aucun constat |
| Mobile réel | Chromium, 390 × 844 px, sept parcours | aucun débordement ni erreur console |

Les réponses 403 et 429 rencontrées sur certains domaines commerciaux ou
institutionnels correspondent à leurs protections anti-robot. Les quatre
réponses HEAD initialement ambiguës ont été retestées en GET et ont répondu en
200.

## Garde-fous de publication

- le site reste présenté comme un projet en pré-lancement ;
- aucune page n'affirme client, mission, partenariat, certification,
  financement acquis ou résultat garanti ;
- les contenus juridiques, fiscaux et cyber indiquent leurs limites ;
- les sources officielles sont reliées au point de décision concerné ;
- aucun sous-domaine Access IA ni chemin d'administration ne figure dans le
  corpus public ;
- `contact.php`, `analytics/`, le challenge ACME, `404.html` et `security/`
  restent hors du paquet et protégés par le déployeur.

## Limites

La validation confirme la cohérence technique et documentaire au 1er août
2026. Elle ne remplace pas une consultation juridique, fiscale ou de sécurité,
ni une mesure Search Console. Les dates réglementaires et les offres cloud ou
locales doivent conserver leur cycle de revue explicite.
