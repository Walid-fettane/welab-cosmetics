# We-Lab Cosmetics - Backend Symfony 7

API REST pour le jeu pedagogique interactif We-Lab Cosmetics.

## Architecture

```
backend/src/
├── Entity/              # Les 5 entites (= tables en BDD)
│   ├── Joueur.php       # Un utilisateur du jeu (pseudo unique)
│   ├── Partie.php       # Une session de jeu (score, dates, joueur)
│   ├── MiniJeu.php      # Un type de jeu (3 types definis)
│   ├── Question.php     # Une question avec difficulte et choix
│   └── Reponse.php      # La reponse d'un joueur a une question
├── Repository/          # Les requetes de lecture (SELECT)
│   ├── JoueurRepository.php
│   ├── PartieRepository.php
│   ├── MiniJeuRepository.php
│   ├── QuestionRepository.php
│   └── ReponseRepository.php
├── Controller/Api/      # Les endpoints de l'API REST
│   ├── JoueurController.php
│   ├── PartieController.php
│   └── MiniJeuController.php
└── DataFixtures/        # Donnees de test (35 questions cosmetiques)
    └── AppFixtures.php
```

## Base de donnees

PostgreSQL 16 avec 5 tables + 1 table associative :

```
joueur (id, pseudo)
   |
   | 1 joueur -> N parties
   v
partie (id, nb_reponse, date_heure_debut, date_heure_fin, score_total, joueur_id)
   |                    |
   | 1 partie ->        | N parties <-> N mini-jeux
   | N reponses         v
   v                  utilise (partie_id, mini_jeu_id)  <- table generee par Doctrine
reponse                 |
   |                    v
   | 1 reponse ->     mini_jeu (id, type, nom, description)
   | 1 question         |
   v                    | 1 mini-jeu -> N questions
question (id, enonce, element_a_deviner, difficulte, choix_possibles, mini_jeu_id)
```

### Les 3 types de mini-jeux

| Type | Nom | Description |
|------|-----|-------------|
| ingredient_produit | Ingredients et Produits | Quel produit contient cet ingredient ? |
| produit_contenant | Produits et Contenants | Dans quel contenant met-on ce produit ? |
| action_pole | Actions et Poles | Ou se fait cette action dans l'industrie ? |

### Difficulte progressive

Chaque question a un niveau de difficulte (1, 2 ou 3).
Le jeu enchaine : 5 questions faciles, puis moyennes, puis difficiles.
Le score obtenu = le niveau de difficulte si la reponse est correcte, 0 sinon.

## API REST - Endpoints

### Joueurs

| Methode | URL | Description | Body |
|---------|-----|-------------|------|
| POST | /api/joueurs | Creer un joueur | `{"pseudo": "Wu-Zi"}` |

### Parties

| Methode | URL | Description | Body |
|---------|-----|-------------|------|
| POST | /api/parties | Demarrer une partie | `{"joueur_id": 1}` |
| GET | /api/parties/{id} | Voir une partie | - |
| GET | /api/parties/{id}/questions?mini_jeu_id=1&difficulte=1 | Questions filtrees | - |
| POST | /api/parties/{id}/reponses | Soumettre une reponse | `{"question_id": 1, "reponse": "Dentifrice", "temps_reponse_sec": 5}` |
| PATCH | /api/parties/{id}/terminer | Terminer une partie | - |

### Mini-jeux

| Methode | URL | Description |
|---------|-----|-------------|
| GET | /api/mini-jeux | Liste des 3 mini-jeux |

## Flux du jeu (comment le frontend utilise l'API)

```
1. Le joueur entre son pseudo
   -> POST /api/joueurs {"pseudo": "Wu-Zi"}
   <- Retourne {id: 1, pseudo: "Wu-Zi"}

2. Le joueur clique "Commencer"
   -> POST /api/parties {"joueur_id": 1}
   <- Retourne la partie avec les 3 mini-jeux

3. Le frontend demande les questions du premier mini-jeu (facile)
   -> GET /api/parties/1/questions?mini_jeu_id=1&difficulte=1
   <- Retourne 5 questions avec leurs choix (SANS la bonne reponse)

4. Le joueur repond a une question
   -> POST /api/parties/1/reponses {"question_id": 3, "reponse": "Dentifrice", "temps_reponse_sec": 8}
   <- Retourne {correct: true, score_obtenu: 1, bonne_reponse: "Dentifrice"}

5. Apres toutes les questions, le frontend passe a difficulte=2, puis 3

6. A la fin
   -> PATCH /api/parties/1/terminer
   <- Retourne le score final
```

## Commandes utiles

```bash
# Lancer les migrations (creer/modifier les tables)
docker compose exec php bash -c "cd /var/www/html && symfony console make:migration"
docker compose exec php bash -c "cd /var/www/html && symfony console d:m:m --no-interaction"

# Recharger les fixtures (remet la BDD a zero avec les donnees de test)
docker compose exec php bash -c "cd /var/www/html && symfony console d:f:l --no-interaction"

# Vider le cache Symfony
docker compose exec php bash -c "cd /var/www/html && symfony console cache:clear"

# Voir les routes disponibles
docker compose exec php bash -c "cd /var/www/html && symfony console debug:router"

# Tester l'API avec curl
curl http://localhost:8000/api/mini-jeux
curl -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":"TestJoueur"}'
```

## Technologies

- **Symfony 7.4** : Framework PHP (MVC)
- **Doctrine ORM** : Mapping objet-relationnel (classes PHP <-> tables SQL)
- **PostgreSQL 16** : Base de donnees relationnelle
- **PHP 8.3** : Langage backend
