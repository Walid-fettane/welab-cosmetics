# We-Lab Cosmetics - Frontend Angular 19

Application web du jeu pedagogique interactif We-Lab Cosmetics.
Ce frontend communique avec l'API REST Symfony pour gerer les parties, questions et reponses.

---

## Partie 1 - Architecture technique

### Stack

- **Angular 19** avec standalone components
- **TypeScript** pour le typage statique
- **SCSS** pour les styles
- **HttpClient** pour les appels API REST

### Structure du projet

```
frontend/src/app/
├── models/                    # Interfaces TypeScript (typage des donnees)
│   └── interfaces.ts
├── services/                  # Services (communication avec l'API)
│   └── api.service.ts
├── pages/                     # Pages de l'application (une par ecran)
│   ├── home/                  # Page d'accueil ("Bienvenue dans le jeu We Lab")
│   │   ├── home.ts
│   │   ├── home.html
│   │   └── home.scss
│   ├── pseudo/                # Saisie du pseudo du joueur
│   │   ├── pseudo.ts
│   │   ├── pseudo.html
│   │   └── pseudo.scss
│   ├── game/                  # Ecran de jeu (questions + choix)
│   │   ├── game.ts
│   │   ├── game.html
│   │   └── game.scss
│   └── result/                # Ecran de fin (score + bilan)
│       ├── result.ts
│       ├── result.html
│       └── result.scss
├── app.routes.ts              # Definition des routes
├── app.config.ts              # Configuration globale (HttpClient, etc.)
├── app.ts                     # Composant racine
└── app.html                   # Template racine (router-outlet)
```

### Routing

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | HomeComponent | Page d'accueil avec bouton "Commencer" |
| `/pseudo` | PseudoComponent | Formulaire de saisie du pseudo |
| `/game` | GameComponent | Ecran de jeu (questions, choix, score en direct) |
| `/result` | ResultComponent | Ecran de fin avec score final et bilan |

### Communication avec l'API

Le service `ApiService` centralise tous les appels HTTP vers le backend Symfony.
Chaque methode retourne un `Observable` (concept RxJS) que le composant souscrit.

| Methode ApiService | Methode HTTP | Endpoint API | Utilisation |
|-------------------|--------------|--------------|-------------|
| `createJoueur(pseudo)` | POST | /api/joueurs | Creer ou retrouver un joueur |
| `createPartie(joueurId)` | POST | /api/parties | Demarrer une nouvelle partie |
| `getPartie(id)` | GET | /api/parties/{id} | Recuperer l'etat d'une partie |
| `getQuestions(partieId, miniJeuId, difficulte)` | GET | /api/parties/{id}/questions | Charger les questions |
| `submitReponse(partieId, questionId, reponse, temps)` | POST | /api/parties/{id}/reponses | Soumettre une reponse |
| `terminerPartie(id)` | PATCH | /api/parties/{id}/terminer | Terminer une partie |
| `getMiniJeux()` | GET | /api/mini-jeux | Lister les mini-jeux |

### Proxy de developpement

En developpement, Angular tourne sur le port 4200 et Symfony sur le port 8000.
Pour eviter les erreurs CORS, un fichier `proxy.conf.json` redirige les appels `/api/*`
vers le backend Symfony automatiquement.

### Commandes

```bash
# Demarrer le serveur de developpement
ng serve --host 0.0.0.0 --poll 2000

# Generer un nouveau composant
ng generate component pages/nom-composant

# Generer un service
ng generate service services/nom-service

# Build pour production
ng build --configuration production
```

---

## Partie 2 - Fonctionnement detaille

Cette section explique comment l'application fonctionne, ecran par ecran, 
de maniere simple et accessible.

### Comment le jeu fonctionne

Le jeu We-Lab Cosmetics est un site web qui fonctionne sur un navigateur (Chrome, Firefox, etc.).
Quand un visiteur du laboratoire ouvre le site, voici ce qui se passe :

### Ecran 1 : Page d'accueil

L'ecran affiche le titre "Bienvenue dans le jeu We Lab !" avec un bouton "Commencer".
Aucune donnee n'est chargee a ce stade. C'est une simple page d'introduction.
Quand le visiteur clique sur "Commencer", il est redirige vers l'ecran suivant.

### Ecran 2 : Saisie du pseudo

L'ecran affiche un champ de texte ou le visiteur tape son pseudo (par exemple "Wu-Zi").
Quand il clique sur "Jouer !", l'application envoie le pseudo au serveur.
Le serveur cree le joueur en base de donnees (ou le retrouve si le pseudo existe deja),
puis cree une nouvelle partie de jeu avec les 3 mini-jeux.
Le visiteur est ensuite redirige vers l'ecran de jeu.

### Ecran 3 : Le jeu

C'est l'ecran principal. Il affiche une question avec 4 choix de reponse.
Le visiteur clique sur un choix puis valide. L'application envoie sa reponse au serveur.
Le serveur verifie si la reponse est correcte et calcule le score.
L'ecran affiche immediatement si la reponse etait bonne (en vert) ou mauvaise (en rouge),
et montre la bonne reponse.

Le jeu enchaine 3 mini-jeux dans cet ordre :
1. **Ingredients et Produits** : "Quel produit contient du Fluor ?" -> Dentifrice
2. **Produits et Contenants** : "Dans quel contenant met-on du Shampoing ?" -> Bouteille
3. **Actions et Poles** : "Ou se fait la mise en bouteille ?" -> Unite de production

Pour chaque mini-jeu, les questions suivent une difficulte progressive :
- D'abord 5 questions faciles (1 point chacune si correcte)
- Puis les questions moyennes (2 points chacune)
- Puis les questions difficiles (3 points chacune)

Le score est affiche en haut de l'ecran et se met a jour en temps reel.

### Ecran 4 : Resultats

Quand toutes les questions sont terminees, l'application envoie une demande
au serveur pour terminer la partie. Le serveur enregistre la date de fin
et retourne le score total.

L'ecran affiche :
- Le score total sur le maximum possible
- Le temps total de la partie
- Un bouton "Rejouer" pour recommencer

### Comment l'application communique avec le serveur

L'application Angular (ce qui tourne dans le navigateur) ne contient PAS les questions
ni les reponses. Tout est stocke sur le serveur (Symfony + PostgreSQL).

A chaque action du joueur, Angular envoie une requete HTTP au serveur :
- Quand on entre un pseudo -> le serveur cree le joueur
- Quand on demarre -> le serveur cree la partie
- Quand on a besoin de questions -> le serveur les envoie (sans la bonne reponse)
- Quand on repond -> le serveur verifie et calcule le score
- Quand on termine -> le serveur enregistre la fin

Ce fonctionnement empeche la triche : le navigateur ne connait jamais
la bonne reponse avant que le joueur ait repondu.
