# Google Search Console — accès Claude Code via MCP

Ce guide installe un serveur MCP qui donne à Claude Code un accès lecture à
Google Search Console (couverture d'index, performances, sitemaps, URL
inspection). Aucune donnée n'est envoyée à un tiers : le MCP tourne en local
sur ta machine et appelle directement l'API Google avec ton OAuth.

## 0. Pré-requis

- macOS ou Linux
- Claude Code installé (`claude --version`)
- `uv` (gestionnaire Python ultra-rapide d'Astral)

```bash
# Installer uv si absent
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
uv --version    # doit afficher uv 0.5+
which uvx       # mémorise ce chemin, ex: /Users/quentin/.local/bin/uvx
```

## 1. Créer les credentials OAuth Google

1. Ouvrir https://console.cloud.google.com/
2. Créer un projet (ou réutiliser le projet existant `accessia-pro`).
3. **APIs & Services → Library** → activer **Google Search Console API**.
4. **APIs & Services → OAuth consent screen** :
   - Type : *External*
   - Nom app : `accessia-gsc-mcp`
   - Scopes : ajouter `.../auth/webmasters.readonly`
   - Test users : ajouter `qevedeveq@gmail.com`
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID** :
   - Application type : **Desktop app**
   - Nom : `accessia-gsc-mcp-desktop`
   - Télécharger le JSON, le renommer et le placer à un emplacement stable :

```bash
mkdir -p ~/.config/accessia
mv ~/Downloads/client_secret_*.json ~/.config/accessia/gsc-oauth.json
chmod 600 ~/.config/accessia/gsc-oauth.json
```

## 2. Brancher le serveur MCP dans Claude Code

```bash
claude mcp add gsc \
  --scope user \
  --env GSC_OAUTH_CLIENT_SECRETS_FILE=/Users/quentin/.config/accessia/gsc-oauth.json \
  -- /Users/quentin/.local/bin/uvx mcp-search-console
```

Vérifier :

```bash
claude mcp list
# attendu : gsc  ✓ Connected
```

Si l'install renvoie un statut `connecting…` au premier appel, c'est normal :
le serveur ouvrira un onglet navigateur pour l'autorisation OAuth la 1ère fois.

## 3. Première utilisation

Dans une session Claude Code :

```
demande à GSC le rapport d'indexation pour access-ia.pro sur les 28 derniers jours
```

Au 1er appel, un onglet navigateur s'ouvre :
- Se connecter avec `qevedeveq@gmail.com`
- Accepter le scope `webmasters.readonly`
- Le token est mis en cache (~/.cache/mcp-search-console/) : pas de relogin ensuite.

## 4. Commandes utiles côté Claude Code

```
# Couverture d'index
liste les pages d'access-ia.pro avec leur statut d'indexation

# Performance
top 20 requêtes Google sur access-ia.pro pour la France, 28 derniers jours

# Sitemap
status du sitemap https://access-ia.pro/sitemap.xml dans Search Console

# Inspection URL
inspecte l'URL https://access-ia.pro/tarifs-ia-pme.html

# Demander indexation
soumets pour indexation https://access-ia.pro/tarifs-ia-pme.html
```

## 5. Sécurité

- Le fichier OAuth est en `chmod 600` — lui seul peut lire le secret.
- Le scope est `readonly` sauf pour `urlInspection` (lecture aussi).
- Aucune écriture sur ton GSC n'est possible avec ce scope.
- Pour révoquer : https://myaccount.google.com/permissions → supprimer
  `accessia-gsc-mcp`.

## 6. Désinstaller

```bash
claude mcp remove gsc
rm -rf ~/.cache/mcp-search-console
rm ~/.config/accessia/gsc-oauth.json
```

## Sources

- mcp-search-console (uvx, auto-update) : https://pypi.org/project/mcp-search-console
- Search Console API : https://developers.google.com/webmaster-tools
- Claude Code MCP docs : https://docs.claude.com/en/docs/claude-code/mcp
