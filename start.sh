#!/bin/bash

# =============================================================================
# WE-LAB COSMETICS - Script de demarrage rapide
# =============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}          WE-LAB COSMETICS - Demarrage                      ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Verifier Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERREUR] Docker n'est pas installe!${NC}"
    echo "   Installez Docker : https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}[ERREUR] Docker Compose n'est pas installe!${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Docker trouve${NC}"

# Creer .env si necessaire
if [ ! -f .env ]; then
    echo -e "${YELLOW}[INFO] Creation du fichier .env...${NC}"
    cp .env.example .env

    # Mettre a jour avec l'UID/GID de l'utilisateur
    CURRENT_UID=$(id -u)
    CURRENT_GID=$(id -g)

    sed -i "s/USERID=1000/USERID=$CURRENT_UID/" .env
    sed -i "s/GROUPID=1000/GROUPID=$CURRENT_GID/" .env

    echo -e "${GREEN}[OK] Fichier .env cree avec UID=$CURRENT_UID, GID=$CURRENT_GID${NC}"
fi

# Demarrer les containers
echo ""
echo -e "${BLUE}[INFO] Demarrage des containers Docker...${NC}"
docker compose up -d --build

# Attendre que les services soient prets
echo ""
echo -e "${YELLOW}[INFO] Attente du demarrage des services...${NC}"
sleep 5

# Afficher le statut
echo ""
docker compose ps

# Afficher les URLs
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}[OK] Environnement pret!${NC}"
echo ""
echo -e "   ${BLUE}Symfony API${NC}  : http://localhost:8000"
echo -e "   ${BLUE}Angular${NC}      : http://localhost:4200"
echo -e "   ${BLUE}Adminer${NC}      : http://localhost:8080"
echo ""
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Commandes utiles :"
echo "  make shell-php   -> Terminal Symfony"
echo "  make shell-node  -> Terminal Angular"
echo "  make logs        -> Voir les logs"
echo "  make stop        -> Arreter"
echo ""
