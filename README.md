# We-Lab Cosmetics - Jeu Pedagogique

Jeu pedagogique interactif pour le laboratoire We-Lab Cosmetics de l'Universite d'Orleans.

## Description du projet

Un jeu web educatif de 45 minutes comprenant 3 mini-jeux :
1. **Ingredients -> Produits** : Associer un ingredient a son produit cosmetique
2. **Produits -> Contenants** : Associer un produit a son packaging
3. **Actions -> Poles/Metiers** : Associer une action a un departement du laboratoire

## Stack technique

| Composant | Technologie | Port |
|-----------|-------------|------|
| Backend API | Symfony 7 | 8000 |
| Frontend | Angular 19 | 4200 |
| Base de donnees | PostgreSQL 16 | 5432 |
| Admin BDD | Adminer | 8080 |

## Equipe

- **Walid Fettane** - Backend Symfony
- **Erwan Goncalves** - Frontend Angular
- **Wissal Ouchen** - Base de donnees / Tests

---

## Installation rapide

### Prerequis

- Docker et Docker Compose installes
- Git
- OpenSSL (deja present sur la majorite des distributions Linux et macOS)

### Procedure (3 commandes)

```bash
git clone <url-du-repo>
cd welab-cosmetics
./start.sh
```

Le script `start.sh` s'occupe automatiquement de :

- Creer les fichiers de configuration (`.env` racine et `backend/.env`)
- Generer des secrets aleatoires (APP_SECRET et JWT_PASSPHRASE)
- Lancer les containers Docker (PHP, Node, PostgreSQL, Adminer)
- Generer les cles RSA pour les JWT
- Installer les dependances Composer et npm
- Executer les migrations Doctrine
- Charger les fixtures (35 questions du jeu + compte administrateur)

Le script est idempotent : on peut le relancer sans casser une installation
existante. Une fois termine, accedez aux URLs affichees dans le recapitulatif.

### URLs d'acces

| Service | URL |
|---------|-----|
| Jeu (page d'accueil) | http://localhost:4200 |
| Connexion administrateur | http://localhost:4200/admin/login |
| Tableau de bord administrateur | http://localhost:4200/admin/dashboard |
| API backend Symfony | http://localhost:8000 |
| Adminer (gestion BDD) | http://localhost:8080 |

### Identifiants par defaut

| Role | Identifiant | Mot de passe |
|------|-------------|--------------|
| Administrateur du jeu | admin@welab.fr | admin1234 |
| Adminer | welab | welab123 |

Le compte administrateur est cree automatiquement par les fixtures
(`make fixtures` ou directement par `start.sh` au premier lancement).

### Securite

- Aucun secret n'est stocke dans le depot Git
- Les fichiers `.env` (racine et `backend/`) sont ignores par `.gitignore`
- Les cles JWT (`backend/config/jwt/*.pem`) sont generees localement et
  ignorees par `.gitignore`
- Le script `start.sh` genere des secrets aleatoires (APP_SECRET sur
  32 caracteres, JWT_PASSPHRASE sur 64 caracteres) a chaque premiere
  installation

### Fonctionnalites principales

- **Jeu pedagogique** : 3 mini-jeux avec 35 questions au total
- **Difficulte progressive** : 5 questions faciles (1 point), 5 moyennes
  (2 points), 5 difficiles (3 points) par mini-jeu
- **Aides au joueur** : raccourcis clavier (touches 1 a 4 pour selectionner
  un choix, Entree pour valider, P pour passer), bouton Passer dedie,
  badges numerotes sur les choix, barre d'aide clavier en bas d'ecran
- **Double compteur de progression** : avancement dans le mini-jeu en cours
  et avancement global de la partie affiches en parallele
- **Espace administrateur** : authentification par JWT, CRUD complet sur
  les questions du jeu (ajout, modification, suppression), liste filtrable
  par mini-jeu et difficulte

---

## Commandes utiles

### Docker

```bash
make start          # Demarrer les containers
make stop           # Arreter les containers
make restart        # Redemarrer
make logs           # Voir tous les logs
make logs-php       # Logs Symfony uniquement
make logs-node      # Logs Angular uniquement
make status         # Etat des containers
```

### Acces aux shells

```bash
make shell-php      # Terminal dans le container Symfony
make shell-node     # Terminal dans le container Angular
make shell-db       # Console PostgreSQL
```

### Symfony

```bash
# Depuis le shell PHP (make shell-php) :
symfony console make:entity           # Creer une entite
symfony console make:controller       # Creer un controleur
symfony console make:migration        # Creer une migration
symfony console d:m:m                 # Executer les migrations
symfony console d:f:l                 # Charger les fixtures

# Ou directement depuis l'hote :
make migrate        # Migrations
make fixtures       # Fixtures
make sf-cache       # Vider le cache
```

### Angular

```bash
# Depuis le shell Node (make shell-node) :
ng generate component nom-composant
ng generate service nom-service
ng build

# Ou directement depuis l'hote :
make ng-generate CMD="component home"
make ng-build
```

---

## Base de donnees

### Connexion Adminer

- **URL** : http://localhost:8080
- **Systeme** : PostgreSQL
- **Serveur** : postgres
- **Utilisateur** : welab
- **Mot de passe** : welab123
- **Base** : welab_db

### Connexion depuis Symfony

Dans `backend/.env` :
```
DATABASE_URL="postgresql://welab:welab123@postgres:5432/welab_db?serverVersion=16&charset=utf8"
```

### Structure des tables

| Table | Description |
|-------|-------------|
| `joueur` | Joueurs du jeu (pseudo) |
| `partie` | Sessions de jeu |
| `mini_jeu` | Types de jeux (3 types) |
| `question` | Questions avec difficulte et choix possibles |
| `reponse` | Reponses donnees par les joueurs |
| `utilise` | Association partie <-> mini_jeu |
| `utilisateur` | Comptes administrateurs (email + mot de passe hashe) |

---

## Configuration Angular -> API Symfony

### Proxy de developpement

Creer `frontend/proxy.conf.json` :
```json
{
  "/api": {
    "target": "http://php:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Modifier `frontend/angular.json` :
```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

---

## Resolution de problemes

### Probleme de permissions

```bash
# Verifier que .env contient votre UID/GID
cat .env | grep -E "USERID|GROUPID"

# Votre UID/GID reel
id -u && id -g

# Reconstruire si necessaire
make build
make start
```

### Port deja utilise

```bash
# Voir ce qui utilise le port
sudo lsof -i :8000

# Changer le port dans .env
SYMFONY_PORT=8001
```

### Container qui ne demarre pas

```bash
# Voir les logs
make logs

# Reconstruire
make clean
make build
make start
```

### Erreur de connexion BDD

```bash
# Verifier que postgres est healthy
docker compose ps

# Tester la connexion
make shell-db
```

---

## Structure du projet

```
welab-cosmetics/
├── docker/
│   ├── php/
│   │   └── Dockerfile          # Image PHP/Symfony
│   ├── node/
│   │   └── Dockerfile          # Image Node/Angular
│   └── postgres/
│       └── init.sql            # Script init BDD
├── backend/                    # Projet Symfony
│   ├── src/
│   │   ├── Entity/             # 6 entites Doctrine
│   │   │   ├── Joueur.php
│   │   │   ├── Partie.php
│   │   │   ├── MiniJeu.php
│   │   │   ├── Question.php
│   │   │   ├── Reponse.php
│   │   │   └── Utilisateur.php (compte admin)
│   │   ├── Controller/Api/     # Controleurs API publics
│   │   │   ├── JoueurController.php
│   │   │   ├── PartieController.php
│   │   │   ├── MiniJeuController.php
│   │   │   └── Admin/          # Controleurs admin proteges par JWT
│   │   │       ├── MeController.php
│   │   │       └── QuestionAdminController.php
│   │   ├── Repository/         # Repositories Doctrine
│   │   ├── DataFixtures/       # Fixtures (35 questions + admin)
│   │   └── Security/           # Configuration JWT
│   ├── config/jwt/             # Cles RSA (generees localement, ignorees Git)
│   ├── .env.example            # Modele de configuration
│   └── .env                    # Configuration reelle (ignoree par Git)
├── frontend/                   # Projet Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/          # Pages de l'application
│   │   │   │   ├── home/
│   │   │   │   ├── pseudo/
│   │   │   │   ├── game/
│   │   │   │   ├── result/
│   │   │   │   ├── admin-login/      # Connexion admin
│   │   │   │   └── admin-dashboard/  # CRUD questions
│   │   │   ├── services/       # Services HTTP
│   │   │   │   ├── api.ts            # API publique du jeu
│   │   │   │   ├── api-admin.ts      # API admin (CRUD)
│   │   │   │   ├── auth.ts           # Gestion du jeton JWT
│   │   │   │   └── game-state.ts
│   │   │   ├── interceptors/   # Intercepteurs HTTP
│   │   │   │   └── auth-interceptor.ts (ajoute Authorization sur /api/admin/*)
│   │   │   ├── guards/         # Guards de route
│   │   │   │   └── auth-guard.ts (protege /admin/dashboard)
│   │   │   └── models/         # Interfaces TypeScript
│   │   │       ├── interfaces.ts
│   │   │       └── admin-interfaces.ts
│   │   └── ...
│   └── ...
├── docker-compose.yml
├── Makefile
├── start.sh                    # Script d'installation automatisee
├── .env.example
└── README.md
```
