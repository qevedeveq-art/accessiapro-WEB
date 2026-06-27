#!/usr/bin/env bash
# ACCESSIA Pro — Script d'installation assisté Google Search Console & MCP
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0;m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}          ACCESSIA Pro — Assistant de configuration GSC MCP            ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo

echo -e "${YELLOW}[1/4] Préparation des répertoires locaux...${NC}"
mkdir -p "$HOME/.config/accessia"
echo -e "${GREEN}✓ Répertoire ~/.config/accessia prêt.${NC}"
echo

echo -e "${YELLOW}[2/4] Ouverture de Google Cloud Console...${NC}"
echo -e "Je vais ouvrir votre navigateur sur la page des identifiants Google Cloud."
echo -e "Veuillez suivre ces 3 étapes simples :"
echo -e "  1. Sélectionnez votre projet (ex: ${BLUE}accessia-pro${NC})."
echo -e "  2. Cliquez sur ${GREEN}Créer des identifiants${NC} -> ${GREEN}ID client OAuth${NC}."
echo -e "  3. Choisissez le type d'application ${BLUE}Application de bureau${NC}, nommez-la et validez."
echo -e "  4. ${YELLOW}Téléchargez le fichier JSON${NC} d'identifiants généré."
echo
read -p "Appuyez sur Entrée pour ouvrir le navigateur..."
open "https://console.cloud.google.com/apis/credentials"

echo
echo -e "${YELLOW}[3/4] En attente du fichier téléchargé...${NC}"
echo -e "Je surveille votre dossier Téléchargements en attente du fichier ${BLUE}client_secret_*.json${NC}."
echo -e "Dès que vous l'aurez téléchargé, je le déplacerai et le configurerai automatiquement."
echo -e "En attente (Ctrl+C pour annuler)..."

FOUND=false
for i in {1..120}; do
    # Trouver le fichier le plus récent correspondant à la clé secrète
    FILE=$(find "$HOME/Downloads" -maxdepth 1 -name "client_secret_*.json" -print -quit)
    if [ -n "$FILE" ]; then
        echo
        echo -e "${GREEN}✓ Fichier détecté : $(basename "$FILE")${NC}"
        mv "$FILE" "$HOME/.config/accessia/gsc-oauth.json"
        chmod 600 "$HOME/.config/accessia/gsc-oauth.json"
        echo -e "${GREEN}✓ Fichier sécurisé et installé dans ~/.config/accessia/gsc-oauth.json${NC}"
        FOUND=true
        break
    fi
    echo -n "."
    sleep 2
done

if [ "$FOUND" = false ]; then
    echo
    echo -e "${RED}✗ Délai d'attente dépassé (2 minutes).${NC}"
    echo -e "Une fois le fichier téléchargé, vous pourrez exécuter manuellement :"
    echo -e "  ${BLUE}mv ~/Downloads/client_secret_*.json ~/.config/accessia/gsc-oauth.json${NC}"
    exit 1
fi

echo
echo -e "${YELLOW}[4/4] Liaison avec le serveur MCP...${NC}"
if command -v claude &> /dev/null; then
    echo -e "Lancement de la configuration MCP pour Claude Code..."
    claude mcp add gsc \
      --scope user \
      --env GSC_OAUTH_CLIENT_SECRETS_FILE="$HOME/.config/accessia/gsc-oauth.json" \
      -- "$HOME/.local/bin/uvx" mcp-search-console
    echo -e "${GREEN}✓ Serveur MCP configuré avec succès !${NC}"
else
    echo -e "${YELLOW}Claude Code n'est pas détecté. Vos dépendances Python mcp-search-console sont néanmoins prêtes.${NC}"
    echo -e "Pour l'ajouter plus tard sur votre outil IA favori, utilisez la commande suivante :"
    echo -e "  ${BLUE}uvx mcp-search-console${NC}"
    echo -e "Avec la variable d'environnement : ${BLUE}GSC_OAUTH_CLIENT_SECRETS_FILE=$HOME/.config/accessia/gsc-oauth.json${NC}"
fi

echo
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}          Configuration terminée ! Search Console est connectée.      ${NC}"
echo -e "${GREEN}======================================================================${NC}"
