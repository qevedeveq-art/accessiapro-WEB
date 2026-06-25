#!/usr/bin/env bash
# ACCESSIA Pro — GoAccess server-side analytics (YunoHost / Debian / Nginx)
#
# Génère un rapport HTML statique à partir des logs d'accès Nginx, sans JS,
# sans cookie, sans tracking côté client. Compatible avec la posture
# "zéro cookie, zéro tracking" affichée en footer.
#
# Exécution en root :
#   sudo bash scripts/setup-goaccess.sh
#
# Mode non-interactif (CI) — exporter avant :
#   ANALYTICS_USER=admin ANALYTICS_PASSWORD='changeme' \
#   sudo -E bash scripts/setup-goaccess.sh
#
# Variables surchargeables :
#   DOMAIN, ACCESS_LOG, WEBROOT, ANALYTICS_USER, ANALYTICS_PASSWORD,
#   REPORT_DIR, NGINX_CONF_DIR
set -euo pipefail

DOMAIN="${DOMAIN:-access-ia.pro}"
ACCESS_LOG="${ACCESS_LOG:-/var/log/nginx/${DOMAIN}-access.log}"
WEBROOT="${WEBROOT:-/var/www/my_webapp/www}"
REPORT_DIR="${REPORT_DIR:-${WEBROOT}/analytics}"
ANALYTICS_USER="${ANALYTICS_USER:-admin}"
ANALYTICS_PASSWORD="${ANALYTICS_PASSWORD:-}"
HTPASSWD_FILE="/etc/nginx/.htpasswd-analytics"
CRON_FILE="/etc/cron.d/goaccess-${DOMAIN//./-}"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d/${DOMAIN}.d}"
NGINX_SNIPPET="${NGINX_CONF_DIR}/analytics-goaccess.conf"
GEO_DB="/var/lib/GeoIP/GeoLite2-City.mmdb"

if [[ "$EUID" -ne 0 ]]; then
  echo "::error::Doit être exécuté en root (sudo)."
  exit 1
fi

echo "→ Installation de GoAccess + apache2-utils (htpasswd)…"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y goaccess apache2-utils

if [[ ! -r "$ACCESS_LOG" ]]; then
  echo "::error::Log Nginx introuvable: $ACCESS_LOG"
  echo "Lister les logs disponibles : ls /var/log/nginx/"
  exit 1
fi

echo "→ Création du dossier rapport: $REPORT_DIR"
mkdir -p "$REPORT_DIR"
chown www-data:www-data "$REPORT_DIR"
chmod 755 "$REPORT_DIR"

if [[ ! -f "$HTPASSWD_FILE" ]]; then
  if [[ -n "$ANALYTICS_PASSWORD" ]]; then
    echo "→ Création htpasswd non-interactive (user: ${ANALYTICS_USER})"
    htpasswd -bc "$HTPASSWD_FILE" "$ANALYTICS_USER" "$ANALYTICS_PASSWORD"
  else
    echo "→ Création htpasswd interactive (user: ${ANALYTICS_USER})"
    htpasswd -c "$HTPASSWD_FILE" "$ANALYTICS_USER"
  fi
  chmod 640 "$HTPASSWD_FILE"
  chown root:www-data "$HTPASSWD_FILE"
else
  echo "→ htpasswd existe déjà: $HTPASSWD_FILE (skip)"
fi

GEO_FLAG=""
if [[ -f "$GEO_DB" ]]; then
  GEO_FLAG="--geoip-database=${GEO_DB}"
  echo "→ GeoIP activé (${GEO_DB})"
else
  echo "→ GeoIP désactivé (installer geoipupdate + clé MaxMind pour l'activer)"
fi

CMD="/usr/bin/goaccess ${ACCESS_LOG} \
  --log-format=COMBINED \
  --ignore-crawlers \
  --anonymize-ip \
  --hour-spec=hr \
  --html-prefs='{\"theme\":\"darkPure\"}' \
  ${GEO_FLAG} \
  -o ${REPORT_DIR}/index.html"

echo "→ Génération immédiate du rapport (test)…"
eval "$CMD" || { echo "::error::GoAccess a échoué (cf. ci-dessus)"; exit 1; }
chown www-data:www-data "${REPORT_DIR}/index.html"

echo "→ Cron horaire: $CRON_FILE"
cat > "$CRON_FILE" <<EOF
# ACCESSIA Pro — Régénère le rapport GoAccess toutes les heures
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 * * * * www-data ${CMD} 2>/dev/null
EOF
chmod 644 "$CRON_FILE"

# Installation du snippet Nginx (auto-include via .d/*.conf)
if [[ -d "$NGINX_CONF_DIR" ]]; then
  echo "→ Installation du snippet Nginx: $NGINX_SNIPPET"
  cat > "$NGINX_SNIPPET" <<'EOF'
# ACCESSIA Pro — Protection du rapport GoAccess (généré par setup-goaccess.sh)
location ^~ /analytics/ {
    auth_basic           "ACCESSIA Pro — Analytics";
    auth_basic_user_file /etc/nginx/.htpasswd-analytics;

    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    add_header Cache-Control "private, no-store, no-cache, must-revalidate" always;

    limit_except GET HEAD {
        deny all;
    }

    try_files $uri $uri/ =404;
}
EOF
  chmod 644 "$NGINX_SNIPPET"

  if nginx -t 2>&1; then
    systemctl reload nginx
    echo "→ Nginx rechargé."
  else
    echo "::error::nginx -t a échoué. Snippet retiré pour ne pas casser le site."
    rm -f "$NGINX_SNIPPET"
    exit 1
  fi
else
  echo "::warning::Dossier de conf Nginx introuvable: $NGINX_CONF_DIR"
  echo "Copie manuellement scripts/goaccess.nginx.conf dans la conf du domaine, puis reload nginx."
fi

cat <<EOF

✅ Setup terminé.

Rapport: https://${DOMAIN}/analytics/
User:    ${ANALYTICS_USER}
Cron:    ${CRON_FILE} (horaire)

IPs anonymisées, crawlers exclus, X-Robots-Tag noindex, Basic Auth obligatoire.
EOF
