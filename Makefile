# =============================================================================
# WE-LAB COSMETICS - Makefile
# Commandes raccourcies pour le developpement
# =============================================================================

.PHONY: help start stop restart build logs shell-php shell-node shell-db clean init-symfony init-angular migrate fixtures

# Couleurs
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

help: ## Afficher cette aide
	@echo ""
	@echo "$(BLUE)============================================================$(NC)"
	@echo "$(BLUE)          WE-LAB COSMETICS - Commandes disponibles          $(NC)"
	@echo "$(BLUE)============================================================$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# DOCKER - Commandes principales
# =============================================================================

start: ## Demarrer tous les containers
	@echo "$(GREEN)Demarrage des containers...$(NC)"
	docker compose up -d
	@echo ""
	@echo "$(GREEN)Containers demarres!$(NC)"
	@echo "   Symfony API  : http://localhost:8000"
	@echo "   Angular      : http://localhost:4200"
	@echo "   Adminer      : http://localhost:8080"
	@echo ""

stop: ## Arreter tous les containers
	@echo "$(YELLOW)Arret des containers...$(NC)"
	docker compose down

restart: stop start ## Redemarrer tous les containers

build: ## Reconstruire les images Docker
	@echo "$(BLUE)Construction des images...$(NC)"
	docker compose build --no-cache

logs: ## Voir les logs de tous les containers
	docker compose logs -f

logs-php: ## Voir les logs Symfony
	docker compose logs -f php

logs-node: ## Voir les logs Angular
	docker compose logs -f node

logs-db: ## Voir les logs PostgreSQL
	docker compose logs -f postgres

# =============================================================================
# SHELL - Acces aux containers
# =============================================================================

shell-php: ## Ouvrir un shell dans le container PHP/Symfony
	docker compose exec php bash

shell-node: ## Ouvrir un shell dans le container Node/Angular
	docker compose exec node bash

shell-db: ## Ouvrir psql dans le container PostgreSQL
	docker compose exec postgres psql -U welab -d welab_db

# =============================================================================
# SYMFONY - Commandes
# =============================================================================

init-symfony: ## Creer un nouveau projet Symfony
	@echo "$(GREEN)Creation du projet Symfony...$(NC)"
	docker compose exec php symfony new . --webapp --no-git
	@echo "$(GREEN)Projet Symfony cree!$(NC)"

sf-console: ## Acceder a la console Symfony (usage: make sf-console CMD="make:entity")
	docker compose exec php symfony console $(CMD)

migrate: ## Creer et executer les migrations
	docker compose exec php symfony console make:migration --no-interaction
	docker compose exec php symfony console doctrine:migrations:migrate --no-interaction

fixtures: ## Charger les fixtures
	docker compose exec php symfony console doctrine:fixtures:load --no-interaction

sf-cache: ## Vider le cache Symfony
	docker compose exec php symfony console cache:clear

# =============================================================================
# ANGULAR - Commandes
# =============================================================================

init-angular: ## Creer un nouveau projet Angular
	@echo "$(GREEN)Creation du projet Angular...$(NC)"
	docker compose exec node ng new welab-frontend --directory . --routing --style scss --skip-git
	@echo "$(GREEN)Projet Angular cree!$(NC)"

ng-generate: ## Generer un composant Angular (usage: make ng-generate CMD="component home")
	docker compose exec node ng generate $(CMD)

ng-build: ## Build Angular pour production
	docker compose exec node ng build --configuration production

# =============================================================================
# UTILITAIRES
# =============================================================================

clean: ## Supprimer tous les containers et volumes
	@echo "$(YELLOW)Nettoyage complet...$(NC)"
	docker compose down -v --remove-orphans
	@echo "$(GREEN)Nettoyage termine!$(NC)"

status: ## Voir le statut des containers
	docker compose ps

env-setup: ## Creer le fichier .env depuis .env.example
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		sed -i "s/USERID=1000/USERID=$$(id -u)/" .env; \
		sed -i "s/GROUPID=1000/GROUPID=$$(id -g)/" .env; \
		echo "$(GREEN)Fichier .env cree avec votre UID/GID$(NC)"; \
	else \
		echo "$(YELLOW)Le fichier .env existe deja$(NC)"; \
	fi
