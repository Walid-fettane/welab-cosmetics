# We-Lab Cosmetics - Backend Symfony 7

API REST pour le jeu pedagogique interactif We-Lab Cosmetics.

## Architecture

```
backend/src/
├── Entity/                  # Les 6 entites (= tables en BDD)
│   ├── Joueur.php           # Un joueur du jeu (pseudo unique)
│   ├── Partie.php           # Une session de jeu (score, dates, joueur)
│   ├── MiniJeu.php          # Un type de jeu (3 types definis)
│   ├── Question.php         # Une question avec difficulte et choix
│   ├── Reponse.php          # La reponse d'un joueur a une question
│   └── Utilisateur.php      # Un administrateur (email + mot de passe)
├── Repository/              # Les requetes de lecture (SELECT)
│   ├── JoueurRepository.php
│   ├── PartieRepository.php
│   ├── MiniJeuRepository.php
│   ├── QuestionRepository.php
│   ├── ReponseRepository.php
│   └── UtilisateurRepository.php
├── Controller/Api/          # Les endpoints de l'API REST
│   ├── JoueurController.php       # Routes publiques /api/joueurs
│   ├── PartieController.php       # Routes publiques /api/parties
│   ├── MiniJeuController.php      # Route publique /api/mini-jeux
│   └── Admin/                     # Routes /api/admin (protegees par JWT)
│       ├── MeController.php       # GET /api/admin/me
│       └── QuestionAdminController.php  # CRUD /api/admin/questions
└── DataFixtures/            # Donnees de test (35 questions + 1 admin)
    └── AppFixtures.php
```

## Base de donnees

PostgreSQL 16 avec 6 tables + 1 table associative :

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

utilisateur (id, email UNIQUE, password, roles JSON)  <- compte administrateur
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

### Espace administrateur (routes protegees par JWT)

Toutes les routes ci-dessous (sauf le login) exigent un en-tete
`Authorization: Bearer <jeton>` valide. Le firewall Symfony rejette
les requetes sans jeton avec un code 401.

| Methode | URL | Description | Body |
|---------|-----|-------------|------|
| POST | /api/admin/login | Authentifier un admin (route publique) | `{"email": "admin@welab.fr", "password": "admin1234"}` |
| GET | /api/admin/me | Profil de l'admin connecte | - |
| GET | /api/admin/mini-jeux | Liste des mini-jeux (pour les selects) | - |
| GET | /api/admin/questions | Liste de toutes les questions | - |
| POST | /api/admin/questions | Creer une nouvelle question | voir ci-dessous |
| PUT | /api/admin/questions/{id} | Modifier une question existante | voir ci-dessous |
| DELETE | /api/admin/questions/{id} | Supprimer une question | - |

Format du body pour creer ou modifier une question :

```json
{
  "enonce": "Quel produit contient du Fluor ?",
  "elementADeviner": "Dentifrice",
  "difficulte": 1,
  "miniJeuId": 1,
  "choixPossibles": ["Dentifrice", "Shampoing", "Creme", "Parfum"]
}
```

La bonne reponse (`elementADeviner`) doit imperativement faire partie
des `choixPossibles`. Le backend rejette la requete avec un 400 sinon.

## Authentification JWT

Le backend utilise le bundle **LexikJWTAuthenticationBundle** pour
proteger les routes administrateur.

### Comment ca marche

1. **Generation des cles** : la commande `lexik:jwt:generate-keypair`
   genere une paire de cles RSA (`config/jwt/private.pem` et
   `config/jwt/public.pem`). La cle privee est chiffree par
   `JWT_PASSPHRASE`. Le script `start.sh` execute cette commande
   automatiquement au premier lancement.

2. **Connexion** : l'admin envoie son email et son mot de passe sur
   `POST /api/admin/login`. Le firewall Symfony delegue a Lexik qui :
   - verifie le mot de passe (compare le hash bcrypt en BDD),
   - genere un jeton JWT signe par la cle privee,
   - retourne `{ "token": "eyJ0eXAi..." }`.

3. **Requetes protegees** : pour chaque requete vers `/api/admin/*`,
   le client envoie l'en-tete `Authorization: Bearer <jeton>`. Le
   firewall verifie la signature avec la cle publique et autorise ou
   refuse la requete.

### Configuration cle (config/packages/security.yaml)

- Firewall `api_admin_login` (anonyme, accepte le POST de login)
- Firewall `api_admin` (verifie le JWT sur `/api/admin/*` sauf login)
- Encodeur de mots de passe : bcrypt
- Provider d'utilisateurs : `App\Entity\Utilisateur` avec champ `email`

### Compte administrateur cree par les fixtures

| Champ | Valeur |
|-------|--------|
| Email | `admin@welab.fr` |
| Mot de passe | `admin1234` |
| Roles | `["ROLE_ADMIN"]` |

Ce compte est insere par `App\DataFixtures\AppFixtures` lors du
chargement des fixtures (`make fixtures` ou `start.sh`). Le mot de
passe est hashe en bcrypt avant insertion.

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
- **LexikJWTAuthenticationBundle** : Generation et verification des
  jetons JWT pour proteger les routes administrateur (cles RSA chiffrees
  par une passphrase generee aleatoirement par `start.sh`)
