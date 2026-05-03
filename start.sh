#!/usr/bin/env bash
# =============================================================================
# We-Lab Cosmetics - Script d'installation et de demarrage automatise
# =============================================================================
# Role : permet a un nouveau developpeur (ou au jury de soutenance) de
# cloner le depot et de tout installer avec une seule commande, sans
# creer aucun fichier manuellement et sans qu'aucun secret ne soit
# stocke dans Git.
#
# Usage :
#   git clone <url-du-repo>
#   cd welab-cosmetics
#   ./start.sh
#
# Le script est idempotent : on peut le relancer plusieurs fois sans
# casser une installation existante. Chaque etape verifie si elle a
# deja ete effectuee avant d'agir.
# =============================================================================

# Le shebang ci-dessus utilise "env bash" : cela demande au systeme de
# chercher l'executable bash dans le PATH (plus portable que /bin/bash,
# car bash peut etre installe ailleurs sur certains systemes).

# set -e : arrete le script a la premiere commande qui echoue (code de
# retour non-zero). Evite d'enchainer sur des erreurs silencieuses.
set -e

# -----------------------------------------------------------------------------
# Couleurs ANSI pour l'affichage console
# -----------------------------------------------------------------------------
# Codes echappes interpretes par le terminal :
#   \033       : caractere ESC (debut d'une sequence de controle)
#   [0;32m     : couleur verte (0 = normal, 32 = vert)
#   [0m        : reinitialisation (retour a la couleur par defaut)
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# Fonctions d'affichage (rendent le code plus lisible plus bas)
# -----------------------------------------------------------------------------
# echo -e : active l'interpretation des sequences echappees (\033, \n)
# $* : tous les arguments passes a la fonction, concatenes
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
# >&2 : redirige la sortie vers stderr (canal d'erreurs standard).
# Utile pour les messages d'erreur : ils restent visibles meme si la
# sortie standard est redirigee vers un fichier.
error()   { echo -e "${RED}[ERREUR]${NC} $*" >&2; }
step()    { echo -e "\n${BLUE}[$1/12]${NC} $2"; }

# -----------------------------------------------------------------------------
# Banniere de demarrage
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}     WE-LAB COSMETICS - Installation automatisee            ${NC}"
echo -e "${BLUE}============================================================${NC}"

# =============================================================================
# [1/12] Verifier que Docker est installe
# =============================================================================
step 1 "Verification de Docker..."
# command -v <nom> : affiche le chemin de la commande si elle existe,
# sinon retourne un code d'erreur. >/dev/null 2>&1 silence la sortie.
# || { ... } : execute le bloc si la commande precedente a echoue.
command -v docker >/dev/null 2>&1 || {
    error "Docker n'est pas installe sur cette machine."
    error "Voir : https://docs.docker.com/engine/install/"
    exit 1
}
success "Docker trouve"

# =============================================================================
# [2/12] Verifier que docker compose v2 est disponible
# =============================================================================
step 2 "Verification de docker compose..."
docker compose version >/dev/null 2>&1 || {
    error "Docker Compose v2 (commande 'docker compose') n'est pas disponible."
    exit 1
}
success "Docker Compose disponible"

# =============================================================================
# [3/12] Creer le .env racine (UID/GID Docker) si absent
# =============================================================================
step 3 "Verification du fichier .env (racine)..."
# [ ! -f .env ] : test "le fichier .env n'existe PAS"
#   -f teste qu'un fichier regulier existe
#   ! inverse le resultat
if [ ! -f .env ]; then
    cp .env.example .env
    # sed -i : modifie le fichier "in-place" (directement, sans copie)
    # On utilise | comme delimiteur (au lieu de /) car les valeurs
    # remplacees ne contiendront jamais ce caractere.
    # $(id -u) : substitution de commande, recupere l'UID courant.
    # $(id -g) : recupere le GID courant.
    sed -i "s|USERID=1000|USERID=$(id -u)|" .env
    sed -i "s|GROUPID=1000|GROUPID=$(id -g)|" .env
    success ".env racine cree (UID=$(id -u), GID=$(id -g))"
else
    success ".env racine deja present (conserve)"
fi

# =============================================================================
# [4/12] Creer backend/.env avec des secrets aleatoires si absent
# =============================================================================
step 4 "Verification de backend/.env (secrets aleatoires)..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    # openssl rand -hex 16 : genere 16 octets aleatoires affiches en
    # hexadecimal. Comme chaque octet s'ecrit sur 2 caracteres hex,
    # on obtient 32 caracteres pour APP_SECRET.
    APP_SECRET_VALUE=$(openssl rand -hex 16)
    # 32 octets -> 64 caracteres hex pour la passphrase JWT.
    JWT_PASSPHRASE_VALUE=$(openssl rand -hex 32)

    # On utilise des placeholders DISTINCTS dans backend/.env.example,
    # ce qui rend le remplacement simple et lisible (pas besoin de gerer
    # la "Nieme occurrence d'une chaine repetee").
    sed -i "s|__APP_SECRET_PLACEHOLDER__|$APP_SECRET_VALUE|" backend/.env
    sed -i "s|__JWT_PASSPHRASE_PLACEHOLDER__|$JWT_PASSPHRASE_VALUE|" backend/.env

    success "backend/.env cree avec APP_SECRET et JWT_PASSPHRASE aleatoires"
else
    success "backend/.env deja present (les secrets existants sont conserves)"
fi

# =============================================================================
# [5/12] Lancer les containers Docker
# =============================================================================
step 5 "Demarrage des containers Docker (build si necessaire)..."
# -d : mode detache (les containers tournent en arriere-plan)
# --build : reconstruit les images si les Dockerfile ont change
docker compose up -d --build

# =============================================================================
# [6/12] Attendre que PostgreSQL soit pret a accepter des connexions
# =============================================================================
step 6 "Attente de PostgreSQL (max 60 secondes)..."
TIMEOUT=60
ELAPSED=0
# until <commande> ; do <bloc> ; done :
#   boucle qui s'execute TANT QUE la commande echoue (l'inverse de while).
#   Ideale pour attendre qu'un service devienne disponible.
# pg_isready : commande PostgreSQL qui retourne 0 si la BDD est prete.
# 2>/dev/null : silence stderr (les erreurs sont attendues tant que
#               le container ne repond pas encore).
until docker compose exec -T postgres pg_isready -U welab >/dev/null 2>&1; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        error "PostgreSQL n'est pas pret apres ${TIMEOUT}s"
        exit 1
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done
echo ""
success "PostgreSQL pret"

# =============================================================================
# [7/12] Attendre la fin du composer install (declenche par le container PHP)
# =============================================================================
step 7 "Attente de la fin de composer install (max 180 secondes)..."
# Le service php du docker-compose lance "composer install" automatiquement
# au demarrage. On attend que vendor/autoload.php existe pour etre sur
# que les dependances sont installees.
# docker compose exec -T : -T desactive l'allocation d'un pseudo-TTY
#                          (obligatoire en script non-interactif, sinon
#                          on a une erreur "the input device is not a TTY").
TIMEOUT=180
ELAPSED=0
until docker compose exec -T php test -f vendor/autoload.php >/dev/null 2>&1; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        error "composer install n'a pas fini apres ${TIMEOUT}s"
        error "Verifiez les logs avec : docker compose logs php"
        exit 1
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    echo -n "."
done
echo ""
success "Dependances PHP installees"

# Le container PHP a peut-etre demarre avant que backend/.env existe
# (premier lancement) : il faut le relancer pour qu'il recharge les
# variables d'environnement, en particulier JWT_PASSPHRASE qui sera
# lue par lexik lors de la generation des cles.
info "Redemarrage du container PHP pour recharger l'environnement..."
docker compose restart php >/dev/null
# On re-attend que vendor/autoload.php soit accessible apres le restart.
until docker compose exec -T php test -f vendor/autoload.php >/dev/null 2>&1; do
    sleep 1
done
success "Container PHP pret"

# =============================================================================
# [8/12] Generer les cles RSA pour les JWT si absentes
# =============================================================================
step 8 "Verification des cles JWT..."
if [ ! -f backend/config/jwt/private.pem ]; then
    info "Generation des cles JWT (RSA 4096 bits)..."
    docker compose exec -T php php bin/console lexik:jwt:generate-keypair --no-interaction
    success "Cles JWT generees (config/jwt/private.pem + public.pem)"
else
    success "Cles JWT deja presentes (conservees)"
fi

# =============================================================================
# [9/12] Attendre la fin de npm install dans le container Node
# =============================================================================
step 9 "Attente de la fin de npm install (max 240 secondes)..."
TIMEOUT=240
ELAPSED=0
until docker compose exec -T node test -d node_modules >/dev/null 2>&1; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        warn "npm install n'a pas fini apres ${TIMEOUT}s"
        warn "Le frontend continuera l'installation en arriere-plan."
        break
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo -n "."
done
echo ""
success "Dependances Node verifiees"

# =============================================================================
# [10/12] Appliquer les migrations Doctrine (creer les tables)
# =============================================================================
step 10 "Application des migrations Doctrine..."
# --no-interaction : ne pose aucune question (mode automatique)
# --allow-no-migration : ne plante pas s'il n'y a aucune migration
docker compose exec -T php php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
success "Migrations appliquees"

# =============================================================================
# [11/12] Charger les fixtures (35 questions + compte admin)
# =============================================================================
step 11 "Chargement des fixtures (35 questions + compte admin)..."
docker compose exec -T php php bin/console doctrine:fixtures:load --no-interaction
success "Fixtures chargees"

# =============================================================================
# [12/12] Preparer la base de donnees de test pour PHPUnit
# =============================================================================
# On cree (si necessaire) une base de donnees separee "welab_db_test" pour
# les tests automatises, et on y applique les migrations. Cela evite que
# les tests fonctionnels polluent la base de developpement.
# Les deux commandes utilisent --if-not-exists et --no-interaction pour
# rester idempotentes : relancer start.sh ne cassera jamais ces etapes.
step 12 "Preparation de la base de donnees de test (PHPUnit)..."
docker compose exec -T php php bin/console --env=test \
    doctrine:database:create --if-not-exists --quiet
docker compose exec -T php php bin/console --env=test \
    doctrine:migrations:migrate --no-interaction --quiet
success "Base de donnees de test prete (welab_db_test)"

# =============================================================================
# Recapitulatif final
# =============================================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}    Installation terminee avec succes !                     ${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${BLUE}URLs d'acces :${NC}"
echo "  Jeu (page d'accueil) : http://localhost:4200"
echo "  Connexion admin      : http://localhost:4200/admin/login"
echo "  Tableau admin        : http://localhost:4200/admin/dashboard"
echo "  API backend          : http://localhost:8000"
echo "  Adminer (BDD)        : http://localhost:8080"
echo ""
echo -e "${BLUE}Identifiants par defaut :${NC}"
echo "  Admin du jeu : admin@welab.fr / admin1234"
echo "  Adminer      : welab / welab123 (base : welab_db, hote : postgres)"
echo ""
echo -e "${YELLOW}Securite :${NC}"
echo "  Les secrets (APP_SECRET, JWT_PASSPHRASE) ont ete generes"
echo "  aleatoirement et stockes dans backend/.env (ignore par Git)."
echo "  Les cles JWT (config/jwt/*.pem) sont generees localement et"
echo "  ne sont jamais commit."
echo ""
echo -e "${BLUE}Commandes utiles :${NC}"
echo "  make logs        : voir les logs des containers"
echo "  make shell-php   : terminal dans le container Symfony"
echo "  make shell-node  : terminal dans le container Angular"
echo "  make stop        : arreter les containers"
echo ""
echo -e "${BLUE}Tests automatises :${NC}"
echo "  Pour lancer les tests : docker compose exec php php bin/phpunit"
echo ""
