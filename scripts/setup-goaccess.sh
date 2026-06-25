#!/usr/bin/env bash
# ACCESSIA Pro — GoAccess server-side analytics (YunoHost / Debian / Nginx)
#
# Génère un rapport HTML statique à partir des logs d'accès Nginx, sans JS,
# sans cookie, sans tracking côté client. Compatible avec la posture
# "zéro cookie, zéro tracking" affichée en footer.
#
# À exécuter une seule fois sur le serveur, en root :
#   sudo bash scripts/setup-goaccess.sh
#
# Variables surchargeables :
#   DOMAIN, ACCESS_LOG, WEBROOT, ANALYTICS_USER, REPORT_DIR
set -euo pipefail

DOMAIN="${DOMAIN:-access-ia.pro}"
ACCESS_LOG="${ACCESS_LOG:-/var/log/nginx/${DOMAIN}-access.log}"
WEBROOT="${WEBROOT:-/var/www/access_ia_pro/www}"
REPORT_DIR="${REPORT_DIR:-${WEBROOT}/analytics}"
ANALYTICS_USER="${ANALYTICS_USER:-admin}"
HTPASSWD_FILE="/etc/nginx/.htpasswd-analytics"
CRON_FILE="/etc/cron.d/goaccess-${DOMAIN//./-}"
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
  echo "→ Création identifiant Basic Auth pour /analytics (user: ${ANALYTICS_USER})"
  htpasswd -c "$HTPASSWD_FILE" "$ANALYTICS_USER"
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

cat <<EOF

✅ Setup terminé.

Prochaines étapes manuelles :
  1. Ajouter le bloc location de scripts/goaccess.nginx.conf dans
     /etc/nginx/conf.d/${DOMAIN}.d/my_webapp.conf (avant la directive 'location /')
  2. nginx -t && systemctl reload nginx
  3. Tester: curl -u ${ANALYTICS_USER}:<password> https://${DOMAIN}/analytics/

Rapport stocké en clair (pas de PII grâce à --anonymize-ip).
IPs anonymisées, crawlers exclus, mise à jour toutes les heures.
EOF
