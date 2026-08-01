# Preuves TDD — benchmark, cache et navigation mobile v6

## Source du travail

Parcours dérivés du lot d'amélioration SEO et sécurité validé le 1er août 2026. Aucun fichier de plan externe n'a été utilisé.

## Parcours utilisateur

1. En tant que visiteur, je reçois immédiatement les actifs correspondant à la version HTML consultée, même lorsque le serveur applique un cache long.
2. En tant que responsable de PME, je peux télécharger trente cas synthétiques documentés pour préparer un benchmark sans confondre protocole, résultats et classement.
3. En tant que visiteur utilisant un clavier ou un lecteur d'écran, je peux utiliser les deux outils interactifs et être informé de leur résultat.
4. En tant que visiteur mobile, je vois et peux atteindre les cinq entrées de navigation sans contenu tronqué.
5. En tant que mainteneur, je peux valider le site en CI sans secret ni capacité de déploiement, et aucun export accidentel ou lien symbolique ne peut entrer dans le paquet public.

## Rapport des tâches

| Comportement | RED | GREEN | Garantie obtenue |
|---|---|---|---|
| Empreinte de contenu sur les actifs et dataset téléchargeable | `node --test tests/versioned-assets-and-dataset.test.mjs` — 3 échecs attendus : URL CSS non versionnée, JSON absent, lien/JSON-LD absents | même commande — 3/3 tests réussis | Les deux CSS utilisent leur SHA-256 court ; le dataset contient 30 cas synthétiques pondérés ; l'article expose le fichier et un schéma `Dataset` honnête. |
| CI de validation et invariants d'accessibilité | `node --test tests/accessibility-and-ci.test.mjs` — workflow absent, 2 tests existants réussis et contrat CI en échec | même commande — 3/3 tests réussis au checkpoint GREEN | Les contrôles restent libellés/bornés, les résultats sont annoncés et la CI n'a ni secret ni étape de publication. |
| Allowlist du paquet public | `node --test "../SEO access-ia/tests/package-apex-release.test.mjs"` depuis le contexte racine — 2 échecs attendus : trois exports privés inclus et lien symbolique suivi | `node --test "10_WEB/SEO access-ia/tests/package-apex-release.test.mjs"` — 2/2 tests réussis | Seuls les 71 chemins publics explicites peuvent être copiés ; tout lien symbolique bloque la construction. |
| Navigation à 390 px | `node --test tests/accessibility-and-ci.test.mjs` — test mobile en échec ; reproduction Playwright montrant « Resso » tronqué | même commande — 4/4 tests réussis ; Playwright : 5 liens avec `fullyVisible: true`, aucun débordement | Sous 520 px, l'en-tête n'est plus collant et la navigation passe en grille de trois colonnes. |

## Spécification de test

| # | Ce qui est garanti | Test ou commande | Type | Résultat |
|---|---|---|---|---|
| 1 | Chaque page HTML référence les deux CSS par une empreinte conforme à leur contenu | `tests/versioned-assets-and-dataset.test.mjs` | intégration | PASS |
| 2 | Le corpus contient exactement 30 identifiants uniques et la distribution 12/5/4/4/3/2 | `tests/versioned-assets-and-dataset.test.mjs` | contrat de données | PASS |
| 3 | Chaque cas est synthétique, possède des signaux attendus, un échec critique et des poids totalisant 100 | `tests/versioned-assets-and-dataset.test.mjs` | contrat de données | PASS |
| 4 | L'article ne présente pas le corpus comme un classement ou un résultat et déclare une distribution JSON | `tests/versioned-assets-and-dataset.test.mjs` | SEO structuré | PASS |
| 5 | Les formulaires ont des contrôles libellés/bornés et des résultats focalisables avec `aria-live` | `tests/accessibility-and-ci.test.mjs` | accessibilité statique | PASS |
| 6 | Les scripts interactifs sont versionnés et la réduction de mouvement est respectée | `tests/accessibility-and-ci.test.mjs` | intégration | PASS |
| 7 | Les cinq liens de navigation restent visibles au breakpoint étroit | `tests/accessibility-and-ci.test.mjs` et Playwright à 390 × 844 | régression + navigateur | PASS |
| 8 | La CI a seulement `contents: read` et n'utilise ni secret, SSH, copie distante ni publication | `tests/accessibility-and-ci.test.mjs` | sécurité CI | PASS |
| 9 | Le paquet exclut les rapports HTML, exports JSON non autorisés et refuse les liens symboliques | `10_WEB/SEO access-ia/tests/package-apex-release.test.mjs` | sécurité du build | PASS |
| 10 | Les 46 pages, 17 URL indexables, liens, canonicals, JSON-LD et sous-domaines interdits sont contrôlés | `node tests/audit-site.mjs` | audit SEO | PASS |

## Couverture et limites connues

- Suite finale source : 7 tests réussis, aucun test ignoré.
- Suite du packageur : 2 tests réussis, aucun test ignoré.
- Audit final : 46 pages, 17 URL indexables, aucune référence à un sous-domaine.
- Aucune instrumentation de couverture de lignes n'est installée dans ce site statique sans dépendance ; la couverture de comportement est documentée ci-dessus plutôt qu'un pourcentage inventé.
- Le formulaire serveur `contact.php` reste volontairement hors de ce dépôt et de ce lot : sa source privée auditable n'a pas été retrouvée.
- Les décisions de redirection des 29 pages `noindex` restent suspendues aux exports Google Search Console et Bing Webmaster Tools.

## Preuves Git

- RED actifs/dataset : `aea8bcd`; GREEN : `e27521b`.
- RED CI/accessibilité : `db190d6`; GREEN : `3aa48ea`.
- RED navigation mobile : `ccb732d`; GREEN : `aa72aa9`.
- Couverture des empreintes étendue à tous les actifs partagés : `ce38c41`.
- RED allowlist du packageur (repo racine) : `b11b808`; GREEN : `4aa6897`.
