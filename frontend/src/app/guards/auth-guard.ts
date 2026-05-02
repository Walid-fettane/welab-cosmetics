// Guard de route pour l'espace administrateur.
//
// Role : empecher un visiteur non connecte d'acceder a la route
// /admin/dashboard (et a d'eventuelles autres routes protegees a
// l'avenir). Si l'admin n'a pas de jeton stocke, il est redirige vers
// /admin/login automatiquement, ce qui evite d'afficher une page admin
// vide pour finalement rebondir manuellement.

import { inject } from '@angular/core';
// CanActivateFn : type Angular pour les guards de route fonctionnels.
// Une fonction de ce type est appelee par le routeur AVANT d'activer
// une route. Elle peut retourner :
//   - true             : autorisation accordee, la route s'affiche
//   - false            : refus, la navigation est annulee
//   - UrlTree          : refus + redirection vers l'URL representee par
//                        l'arbre (equivaut a "false" + Router.navigate)
//   - ou un Observable / Promise qui emet l'une des trois valeurs ci-dessus
// L'avantage de la version fonctionnelle (par opposition aux classes
// CanActivate de l'ancien style) : c'est une simple fonction, on peut
// utiliser inject() et la composer comme n'importe quelle valeur.
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

// authGuard : fonction reutilisable a brancher sur n'importe quelle
// route via "canActivate: [authGuard]" dans la definition de routes.
export const authGuard: CanActivateFn = () => {
  // inject(...) : recupere les services depuis le contexte d'injection
  // Angular. Disponible ici parce que le routeur appelle la fonction
  // avec un contexte d'injection actif. Equivalent fonctionnel d'un
  // constructor(private auth: AuthService, private router: Router).
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Cas heureux : un jeton est present cote client, on autorise l'acces.
  // Le serveur, lui, validera la signature et la duree de vie a chaque
  // requete : si le jeton est expire, l'intercepteur deconnectera
  // l'admin sur le premier 401 recu.
  if (auth.isLoggedIn()) {
    return true;
  }

  // Cas refuse : pas de jeton. On retourne un UrlTree qui equivaut a
  // la fois a "false" (refus de la route) et a une commande de
  // redirection vers /admin/login. C'est plus propre que de retourner
  // false puis d'appeler router.navigate(...) separement, car le
  // routeur gere la transition en une seule operation atomique.
  return router.createUrlTree(['/admin/login']);
};
