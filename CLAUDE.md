# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**We-Lab Cosmetics** is a 45-minute educational web game for the University of Orleans teaching cosmetics science through 3 mini-games. The stack is Symfony 7.4 (backend API) + Angular 21 (frontend) + PostgreSQL 16, fully containerized with Docker.

## Common Commands

All development happens inside Docker containers. Run these from the project root:

```bash
# Environment setup (first time)
make env-setup          # Creates .env with your UID/GID
make start              # Start all containers

# Access containers for development
make shell-php          # PHP/Symfony container shell
make shell-node         # Node/Angular container shell
make shell-db           # PostgreSQL shell (psql)

# Database
make migrate            # Run Doctrine migrations
make fixtures           # Load test data (35 cosmetics questions)
make sf-cache           # Clear Symfony cache

# Logs
make logs               # All containers
make logs-php           # Symfony only
make logs-node          # Angular only
```

**Inside the PHP container** (`make shell-php`):
```bash
symfony console <command>     # Any Symfony console command
symfony console doctrine:migrations:diff   # Generate new migration
./vendor/bin/phpunit          # Run PHPUnit tests
```

**Inside the Node container** (`make shell-node`):
```bash
ng generate component pages/foo   # Generate Angular component
ng generate service services/bar  # Generate Angular service
ng build                          # Production build
npx vitest                        # Run frontend tests
```

## Architecture

### Services & URLs
| Service   | URL                          | Purpose              |
|-----------|------------------------------|----------------------|
| Angular   | http://localhost:4200        | Frontend SPA         |
| Symfony   | http://localhost:8000        | REST API             |
| Adminer   | http://localhost:8080        | DB admin UI          |
| PostgreSQL | localhost:5432              | Database             |

### Backend (`backend/src/`)

**Entity model** (Doctrine ORM):
- `Joueur` — player with unique `pseudo` (username)
- `Partie` — game session linked to a `Joueur`; tracks score, start/end times
- `MiniJeu` — one of 3 game types (ingredient_produit / produit_contenant / action_pole)
- `Question` — belongs to a `MiniJeu`; has `enonce`, `element_a_deviner`, `difficulte` (1-3), and `choix_possibles` (JSON array)
- `Reponse` — player answer for a `Question` within a `Partie`; records correctness and response time

**REST API** (`Controller/Api/`):
- `POST /api/joueurs` — create/get player by pseudo
- `POST /api/parties` — start a game session
- `GET /api/parties/{id}/questions?mini_jeu_id=X&difficulte=Y` — fetch questions (correct answers are never returned by this endpoint — only sent after a response is submitted)
- `POST /api/parties/{id}/reponses` — submit an answer
- `PATCH /api/parties/{id}/terminer` — end the session
- `GET /api/mini-jeux` — list all mini-games

**Game flow**: 5 easy → 5 medium → 5 hard questions per mini-game. Score = difficulty level if correct, 0 if wrong.

### Frontend (`frontend/src/app/`)

Currently a skeleton. The planned structure (per `frontend/README-frontend.md`):
- `models/interfaces.ts` — TypeScript interfaces mirroring backend entities
- `services/api.service.ts` — Observable-based HttpClient calls to the Symfony API
- `pages/home/` — welcome screen (`/`)
- `pages/pseudo/` — username input (`/pseudo`)
- `pages/game/` — main game interface (`/game`)
- `pages/result/` — final results (`/result`)

Uses Angular standalone components (no NgModules), SCSS, RxJS Observables, and a dev proxy (`proxy.conf.json`) that forwards `/api/*` calls to `http://localhost:8000`.

### Database credentials (local dev)
- Host: `postgres`, User: `welab`, Password: `welab123`, DB: `welab_db`
- Configured via `backend/.env` (already set for Docker networking)

## Key Documentation
- `backend/README-backend.md` — full API documentation with request/response examples (French)
- `backend/TESTS-backend.md` — manual test procedures with curl examples
- `frontend/README-frontend.md` — planned frontend architecture guide

---------------------******************************-----------------------------
## personal recap (by user)
# We-Lab Cosmetics - Contexte projet

## Projet
Jeu pedagogique interactif pour le laboratoire We-Lab Cosmetics, Universite d'Orleans.
Projet MIAGE L3 - Deadline 10 avril 2026.

## Stack
- Backend : Symfony 7 + PostgreSQL 16 (dans Docker)
- Frontend : Angular 19 (dans Docker)
- Docker Compose avec 4 services : php, node, postgres, adminer

## Conventions
- Chaque fichier cree ou modifie doit avoir un commentaire en haut expliquant son role
- Chaque fonction doit avoir un commentaire expliquant ce qu'elle fait et pourquoi
- Les commentaires doivent etre simples (comprehensibles par un non-developpeur)
- Style du prof Loulergue : final class pour controllers, pas de final pour entities, chainage des setters
- Mettre a jour le README correspondant (backend/README.md ou frontend/README.md) si un fichier est ajoute ou modifie

## Structure
- backend/src/Entity/ : 5 entites (Joueur, MiniJeu, Partie, Question, Reponse)
- backend/src/Controller/Api/ : 3 controllers API REST
- backend/src/Repository/ : 5 repositories
- backend/src/DataFixtures/ : fixtures avec 35 questions cosmetiques
- frontend/src/app/pages/ : 4 pages (home, pseudo, game, result)
- frontend/src/app/services/ : ApiService pour appels HTTP

## Commandes Docker
- Les commandes Angular passent par : docker compose exec node bash -c "cd /app && ..."
- Les commandes Symfony passent par : docker compose exec php bash -c "cd /var/www/html && ..."
