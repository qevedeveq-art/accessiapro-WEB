#!/usr/bin/env bash
# Deploy the built site to the production target.
# Usage: SITE_DIR=/path/to/build DEPLOY_TARGET=ssh_alias:/site/root ./scripts/deploy-to-yunohost.sh
# Defaults: SITE_DIR=current directory, DEPLOY_TARGET must be provided.

set -euo pipefail

: "${SITE_DIR:=$(pwd)}"
: "${DEPLOY_TARGET:?set DEPLOY_TARGET=<ssh_alias>:<absolute_path> (e.g. host:/site/root)}"

if [ ! -f "$SITE_DIR/index.html" ] || [ ! -f "$SITE_DIR/sitemap.xml" ]; then
  echo "ERROR: $SITE_DIR does not look like a built site (index.html or sitemap.xml missing)"
  exit 1
fi

rsync -avz --delete \
  --include='*.html' --include='*.txt' --include='*.xml' \
  --include='*.ico' --include='*.webmanifest' \
  --include='.well-known/***' --include='assets/***' \
  --include='articles/***' --include='guides/***' --include='ressources/***' \
  --exclude='*' \
  "$SITE_DIR/" "$DEPLOY_TARGET"

echo ""
echo "Post-deploy verification:"
curl -sI https://access-ia.pro/articles/menaces-ia-2026.html | head -3
echo "Sitemap URLs: $(curl -s https://access-ia.pro/sitemap.xml | grep -c '<loc>')"
