// Ce fichier definit les routes de l'application : quel composant afficher selon l'URL.
// Angular lit ce tableau au demarrage et redirige l'utilisateur vers la bonne page.
// Chaque route lie une URL (path) a un composant Angular (component).

import { Routes } from '@angular/router';

// On importe les 4 composants de page du jeu
import { Home }   from './pages/home/home';     // Page d'accueil
import { Pseudo } from './pages/pseudo/pseudo'; // Page de saisie du pseudo
import { Game }   from './pages/game/game';     // Page principale du jeu
import { Result } from './pages/result/result'; // Page des resultats finaux

// On importe les 2 composants de l'espace administrateur
import { AdminLogin }     from './pages/admin-login/admin-login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';

// On importe le guard qui protege les routes admin (redirige vers /admin/login
// si aucun jeton JWT n'est present cote client).
import { authGuard } from './guards/auth-guard';

// Le tableau "routes" est lu par provideRouter() dans app.config.ts
export const routes: Routes = [
  // '' = racine du site (http://localhost:4200/) -> affiche la page d'accueil
  { path: '',       component: Home },

  // '/pseudo' -> affiche le formulaire de saisie du nom du joueur
  { path: 'pseudo', component: Pseudo },

  // '/game' -> affiche l'interface du jeu (questions, timer, score)
  { path: 'game',   component: Game },

  // '/result' -> affiche le score final et les statistiques de la partie
  { path: 'result', component: Result },

  // ---------- Espace administrateur ----------

  // '/admin/login' -> page de connexion (publique, pas de guard).
  { path: 'admin/login',     component: AdminLogin },

  // '/admin/dashboard' -> tableau de bord d'administration.
  // canActivate: [authGuard] : Angular appelle authGuard avant d'activer
  // cette route. Si la fonction renvoie false ou un UrlTree vers
  // /admin/login, l'admin est redirige sans voir le dashboard.
  { path: 'admin/dashboard', component: AdminDashboard, canActivate: [authGuard] },
];
