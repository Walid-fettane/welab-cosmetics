// Intercepteur HTTP pour l'espace administrateur.
//
// Role : a chaque requete HTTP qui part de l'application Angular, decider
// s'il faut y ajouter le header "Authorization: Bearer <token>" (necessaire
// pour acceder aux routes /api/admin/* protegees par JWT cote backend).
//
// Cas particulier : la requete /api/admin/login NE DOIT PAS embarquer de
// jeton, puisque c'est elle-meme qui sert a OBTENIR le jeton. Sans cette
// exception, on enverrait un en-tete inutile (vide ou perime) avec la
// requete de login, ce qui brouillerait les logs et pourrait perturber le
// firewall Symfony.
//
// Cas d'erreur : si le serveur repond 401 sur une route admin, cela signifie
// que le jeton est invalide ou expire. On force alors la deconnexion locale
// (suppression du jeton) et on renvoie l'admin vers la page de connexion.

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
// catchError = operateur RxJS qui intercepte une erreur dans le flux et
// permet de reagir (ici : deconnexion + redirection) avant de la propager.
// throwError = creer un Observable qui emet immediatement une erreur ; on
// l'utilise pour relancer l'erreur apres l'avoir traitee, afin que le
// composant appelant puisse aussi reagir.
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth';

// HttpInterceptorFn : type fourni par Angular pour les intercepteurs
// "fonctionnels" (par opposition aux intercepteurs de classe a l'ancienne).
// La fonction recoit la requete sortante (req) et un "next" qui represente
// la suite de la chaine d'intercepteurs (puis le HttpClient lui-meme). Elle
// doit retourner un Observable de l'evenement HTTP final. Angular appelle
// cette fonction AVANT chaque requete, ce qui en fait l'endroit ideal pour
// ajouter un en-tete commun a tout un groupe d'URLs.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // inject(...) doit etre appele AU SEIN de la fonction d'intercepteur,
  // car il a besoin du contexte d'injection Angular pour fonctionner.
  // En dehors d'une classe, c'est la seule maniere de recuperer un service.
  const auth   = inject(AuthService);
  const router = inject(Router);

  // On ne touche QUE les requetes qui ciblent /api/admin/* : tout le reste
  // (par exemple /api/joueurs ou /api/parties cote jeu) doit passer sans
  // header Authorization, sous peine de declencher des refus a tort.
  const cibleAdmin = req.url.startsWith('/api/admin');

  // L'endpoint de login lui-meme doit rester "anonyme" : il est public et
  // c'est lui qui PRODUIT le jeton. On l'exclut donc de l'ajout du header.
  const estLogin = req.url === '/api/admin/login';

  // Recupere le jeton actuellement stocke dans localStorage, ou null s'il
  // n'y en a pas (admin non connecte). Si null, on n'ajoute pas de header.
  const token = auth.getToken();

  // En Angular, les requetes HTTP sont IMMUTABLES : on ne peut pas modifier
  // une requete existante (ses proprietes sont readonly). On doit donc
  // creer une copie via req.clone({ ... }). L'option setHeaders ajoute (ou
  // remplace) un ou plusieurs en-tetes sans toucher au reste de la requete.
  //
  // L'expression ternaire "condition ? valeur1 : valeur2" est equivalente
  // a un if/else mais s'utilise comme une expression (elle renvoie une
  // valeur qu'on peut affecter directement a une variable).
  const requete = (cibleAdmin && !estLogin && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // next(requete) : transmet la requete (potentiellement modifiee) au
  // prochain maillon de la chaine d'intercepteurs, puis au HttpClient
  // lui-meme. Le retour est un Observable qui emettra tot ou tard
  // l'evenement de reponse HTTP (succes ou erreur).
  return next(requete).pipe(
    // catchError(...) capture une erreur du flux et permet de la traiter
    // avant de la propager. Tres pratique pour centraliser une reaction
    // commune (ici : la deconnexion sur 401) sans la dupliquer dans
    // chaque composant.
    catchError((err: HttpErrorResponse) => {
      // HttpErrorResponse est l'objet emis par Angular quand une requete
      // HTTP echoue. Sa propriete "status" contient le code HTTP renvoye
      // par le serveur (ex: 401, 404, 500), et "error" contient le corps
      // de la reponse decode (souvent un objet JSON).
      //
      // Un 401 sur une route admin (autre que /login) signifie "jeton
      // manquant ou invalide" : on deconnecte l'admin localement et on le
      // renvoie vers la page de connexion. On exclut /login pour que les
      // erreurs de credentials incorrects soient gerees par la page de
      // connexion elle-meme (et pas par une redirection silencieuse).
      if (err.status === 401 && cibleAdmin && !estLogin) {
        auth.logout();
        // Router.navigate([...]) : navigation programmatique. Le tableau
        // contient les segments de l'URL cible (ici "/admin/login"). On
        // n'attend pas le retour : la redirection peut se faire en
        // arriere-plan pendant qu'on relance l'erreur ci-dessous.
        router.navigate(['/admin/login']);
      }
      // throwError(() => err) : on relance l'erreur pour que le composant
      // appelant la voie aussi (afficher un message, arreter un loader,
      // etc.). Sans ca, l'erreur serait silencieusement avalee.
      return throwError(() => err);
    })
  );
};
