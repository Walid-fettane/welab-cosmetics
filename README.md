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
| Frontend | Angular 18 | 4200 |
| Base de donnees | PostgreSQL 16 | 5432 |
| Admin BDD | Adminer | 8080 |

## Equipe

- **Walid Fettane** - Backend Symfony
- **Erwan Goncalves** - Frontend Angular
- **Wissal Ouchen** - Base de donnees / Tests

---

## Installation rapide

### Prerequis

- Docker & Docker Compose installes
- Git

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd welab-cosmetics
```

### 2. Configurer l'environnement

```bash
# Creer le fichier .env avec votre UID/GID
make env-setup

# OU manuellement :
cp .env.example .env
# Modifier USERID et GROUPID avec vos valeurs (id -u et id -g)
```

### 3. Demarrer les containers

```bash
make start
```

### 4. Creer les projets (premiere fois uniquement)

```bash
# Creer le projet Symfony
make init-symfony

# Creer le projet Angular
make init-angular
```

### 5. Acceder aux applications

| Application | URL |
|-------------|-----|
| **Symfony API** | http://localhost:8000 |
| **Angular** | http://localhost:4200 |
| **Adminer** | http://localhost:8080 |

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
| `joueur` | Utilisateurs du jeu (pseudo) |
| `partie` | Sessions de jeu |
| `mini_jeu` | Types de jeux (3 types) |
| `question` | Questions avec difficulte |
| `reponse` | Reponses donnees par les joueurs |
| `utilise` | Association partie <-> mini_jeu |

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
│   │   ├── Entity/             # Entites Doctrine
│   │   ├── Controller/         # Controleurs API
│   │   ├── Repository/         # Repositories
│   │   └── DataFixtures/       # Fixtures
│   └── ...
├── frontend/                   # Projet Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Composants
│   │   │   ├── services/       # Services HTTP
│   │   │   └── models/         # Interfaces TypeScript
│   │   └── ...
│   └── ...
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```
