# Snippets nginx serveur

## `seo-redirects.conf`

Redirections 301 pour les pages regroupées (URLs anciennes → canoniques actuelles).

**Cible de déploiement** : le répertoire d'includes app-scoped du domaine sur le serveur (fichier `seo-redirects.conf`).

**Procédure** (à exécuter en session admin, hors dépôt public) :

```bash
# 1. Copier le snippet vers le serveur (via alias SSH configuré)
scp ops/nginx/seo-redirects.conf <alias>:/tmp/seo-redirects.conf

# 2. Installer, tester et recharger nginx côté serveur
ssh <alias> 'sudo install -o root -g root -m 0640 /tmp/seo-redirects.conf \
    <target_include_dir>/seo-redirects.conf && \
    sudo nginx -t && sudo systemctl reload nginx && \
    rm /tmp/seo-redirects.conf'
```

Le fichier étant inclus depuis le bloc `location /` de l'app statique, les directives `location = /path { return 301 <canonical>; }` fonctionnent en priorité stricte sur les fichiers HTML sous-jacents.
