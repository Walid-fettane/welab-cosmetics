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
│   ├── interfaces.ts
│   └── admin-interfaces.ts    # Interfaces pour l'espace administrateur
├── services/                  # Services (communication avec l'API)
│   ├── api.ts                 # Appels API du jeu (joueurs, parties, questions)
│   ├── api-admin.ts           # Appels API admin (CRUD questions)
│   └── auth.ts                # Gestion du jeton JWT (login, logout)
├── interceptors/              # Intercepteurs HTTP globaux
│   └── auth-interceptor.ts    # Ajoute Authorization sur /api/admin/*
├── guards/                    # Guards de route
│   └── auth-guard.ts          # Protege /admin/dashboard
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
│   ├── result/                # Ecran de fin (score + bilan)
│   │   ├── result.ts
│   │   ├── result.html
│   │   └── result.scss
│   ├── admin-login/           # Connexion administrateur
│   │   ├── admin-login.ts
│   │   ├── admin-login.html
│   │   └── admin-login.scss
│   └── admin-dashboard/       # Tableau de bord administrateur (CRUD questions)
│       ├── admin-dashboard.ts
│       ├── admin-dashboard.html
│       └── admin-dashboard.scss
├── app.routes.ts              # Definition des routes
├── app.config.ts              # Configuration globale (HttpClient + intercepteur)
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
| `/admin/login` | AdminLogin | Page de connexion administrateur (publique) |
| `/admin/dashboard` | AdminDashboard | Tableau de bord admin (protege par authGuard) |

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

---

## Partie 3 - Espace administrateur

L'application dispose d'un espace dedie aux administrateurs du laboratoire,
qui leur permet de gerer la base des questions du jeu.

### Acces et identifiants

| Element | Valeur |
|---------|--------|
| URL de connexion | `http://localhost:4200/admin/login` |
| Email par defaut | `admin@welab.fr` |
| Mot de passe par defaut | `admin1234` |

Le compte administrateur est cree automatiquement par les fixtures
Doctrine (`make fixtures` cote backend). Il peut etre modifie ensuite
en base de donnees via Adminer.

### Que peut faire un administrateur ?

Une fois connecte, l'admin arrive sur le tableau de bord
(`/admin/dashboard`) qui propose :

- **Lister** toutes les questions enregistrees, triees par mini-jeu puis
  par difficulte. Chaque ligne affiche l'enonce, le mini-jeu (badge
  rose), la difficulte (badge vert / jaune / rouge), la bonne reponse
  et deux boutons d'action.
- **Ajouter** une nouvelle question via un formulaire qui demande
  l'enonce, la bonne reponse, la difficulte (Facile / Moyen / Difficile),
  le mini-jeu (selectionne dans une liste deroulante) et les 4 choix
  proposes au joueur. La bonne reponse doit obligatoirement faire
  partie des 4 choix : un message d'erreur s'affiche sinon.
- **Modifier** une question existante via le meme formulaire,
  prerempli avec les valeurs actuelles.
- **Supprimer** une question apres confirmation (popup native du
  navigateur). Les reponses qui referencaient cette question sont
  supprimees automatiquement par le backend (cascade Doctrine).
- **Se deconnecter** via un bouton dans l'en-tete : le jeton JWT
  est supprime du localStorage et l'admin est renvoye au login.

### Fonctionnement technique

L'authentification repose sur un JSON Web Token (JWT) signe par le
backend Symfony. Voici la chaine de bout en bout :

1. **Connexion (`POST /api/admin/login`)** : l'admin envoie son email
   et son mot de passe ; le backend verifie les identifiants et
   renvoie `{ token: "eyJhbGc..." }`. Cette route est publique (pas
   de jeton attendu en entree).

2. **Stockage du jeton** : `AuthService.login()` utilise l'operateur
   RxJS `tap` pour ecrire le jeton dans `localStorage` sous la cle
   `welab_admin_token`. Le jeton survit a la fermeture de l'onglet.

3. **Intercepteur HTTP (`auth-interceptor.ts`)** : pour chaque requete
   sortante, l'intercepteur regarde l'URL :
   - Si elle commence par `/api/admin/` ET ce n'est pas la route de
     login ET un jeton est stocke -> il clone la requete et lui ajoute
     l'en-tete `Authorization: Bearer <token>`.
   - Sinon -> il laisse passer la requete telle quelle.

4. **Guard de route (`auth-guard.ts`)** : la route `/admin/dashboard`
   est decoree par `canActivate: [authGuard]`. Avant chaque
   activation, le guard verifie qu'un jeton est present cote client.
   Sinon il retourne un `UrlTree` qui equivaut a une redirection vers
   `/admin/login`. Le dashboard ne peut donc jamais s'afficher en
   etant deconnecte.

5. **Expiration / 401** : si le serveur repond `401 Unauthorized` sur
   une route admin (jeton expire, signature invalide, etc.),
   l'intercepteur capture l'erreur, supprime le jeton local et
   redirige l'admin vers `/admin/login`. La gestion est centralisee
   dans l'intercepteur, donc aucun composant n'a besoin de la
   reproduire.

### Pourquoi localStorage et pas un cookie ?

Le projet utilise `localStorage` pour la simplicite : aucune
configuration cote serveur n'est necessaire (pas de SameSite, pas de
httpOnly, pas de domaine partage), et l'envoi du jeton se fait via un
en-tete explicite gere par l'intercepteur. En production avec un
deploiement public, un cookie `httpOnly` serait plus sur (resistant
au XSS) ; ici le jeu est pedagogique et tourne en local au laboratoire.
