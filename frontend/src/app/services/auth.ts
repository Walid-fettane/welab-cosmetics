// Service d'authentification de l'espace administrateur.
//
// Role : se connecter au backend avec un email + mot de passe, conserver
// le jeton JWT recu, le fournir aux autres parties du code (interceptor,
// guard, composants), et permettre la deconnexion.
//
// Le jeton JWT est stocke dans le localStorage du navigateur, ce qui
// permet a l'admin de rester connecte meme apres avoir ferme et rouvert
// l'onglet. Aucune session n'est tenue cote serveur : avec un JWT, le
// jeton lui-meme contient (de maniere signee) toutes les informations
// necessaires a l'authentification.

import { inject, Injectable } from '@angular/core';
// HttpClient = service Angular qui execute les requetes HTTP (GET/POST/...).
// Il s'occupe lui-meme de la (de)serialisation JSON et expose les reponses
// sous forme d'Observable RxJS.
import { HttpClient } from '@angular/common/http';
// Observable = flux de donnees asynchrone. Different d'une Promise : il
// peut emettre plusieurs valeurs au cours du temps et n'est execute qu'au
// moment ou un consommateur "subscribe" dessus. Sans abonnement, l'appel
// HTTP n'est meme pas envoye sur le reseau.
//
// tap = operateur RxJS qui execute un effet de bord (ici : stocker le
// jeton dans localStorage) sans modifier la valeur emise par l'Observable.
// Parfait pour observer une reponse au passage sans la transformer.
import { Observable, tap } from 'rxjs';

import { LoginResponse } from '../models/admin-interfaces';

// providedIn: 'root' : Angular cree une seule instance partagee de ce
// service pour toute l'application (singleton). Le meme objet AuthService
// est injecte dans tous les composants qui en ont besoin, ce qui garantit
// la coherence de l'etat de connexion d'un endroit a l'autre.
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // inject(HttpClient) : nouvelle syntaxe Angular 14+ pour recuperer un
  // service. C'est un appel de fonction, contrairement a l'ancienne
  // syntaxe "constructor(private http: HttpClient)". Le resultat est
  // identique, mais inject() est plus concis et utilisable hors classe
  // (par exemple dans une fonction de guard ou d'intercepteur).
  private http = inject(HttpClient);

  // URL de base pour les routes d'admin. Le proxy Angular
  // (proxy.conf.json) redirige tout chemin commencant par "/api" vers
  // http://localhost:8000 (le serveur Symfony) en developpement, ce qui
  // evite les soucis de CORS entre les deux ports.
  private readonly apiUrl = '/api/admin';

  // Cle utilisee dans le localStorage pour stocker le jeton JWT.
  // Definie en constante pour eviter une faute de frappe entre les
  // differentes methodes qui lisent et ecrivent.
  private readonly TOKEN_KEY = 'welab_admin_token';

  /**
   * Tente de se connecter au backend avec un email et un mot de passe.
   * En cas de succes, le jeton JWT recu est automatiquement stocke dans
   * le localStorage avant que l'Observable n'emette la reponse complete
   * vers le composant appelant.
   * En cas d'echec (par exemple 401), l'Observable emet l'erreur HTTP et
   * le composant peut alors afficher un message a l'admin.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    // post<LoginResponse>(...) declare le type attendu de la reponse.
    // Angular convertit automatiquement le JSON recu en objet TypeScript
    // typee, ce qui permet l'autocompletion des champs (response.token).
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      // pipe(...) chaine des operateurs RxJS sur l'Observable initial.
      // tap(...) execute son callback a chaque valeur emise SANS la
      // modifier ; ideal pour un effet de bord comme ecrire dans le
      // localStorage.
      tap(response => {
        // localStorage.setItem(cle, valeur) : ecrit une chaine dans le
        // stockage persistant du navigateur. Le contenu y reste meme
        // apres fermeture du navigateur, est specifique au domaine
        // courant (ici localhost:4200) et est limite a environ 5 Mo
        // au total. La valeur doit etre une chaine ; les objets doivent
        // etre serialises en JSON avant d'etre stockes.
        localStorage.setItem(this.TOKEN_KEY, response.token);
      })
    );
  }

  /**
   * Deconnecte l'admin en supprimant le jeton du localStorage.
   * Aucun appel reseau n'est emis : avec un JWT, la deconnexion est
   * purement cote client. Le serveur, lui, n'a pas de session a
   * invalider (le jeton expirera tout seul a son echeance).
   */
  logout(): void {
    // localStorage.removeItem(cle) : supprime l'entree associee a la
    // cle indiquee. Si la cle n'existait pas, l'appel ne fait rien et
    // ne leve aucune erreur.
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Renvoie le jeton JWT actuellement stocke, ou null si aucun.
   * Utilisee par l'intercepteur HTTP pour ajouter le header
   * Authorization aux requetes admin, et indirectement par la methode
   * isLoggedIn() ci-dessous.
   */
  getToken(): string | null {
    // localStorage.getItem(cle) : retourne la chaine stockee, ou null
    // si la cle n'existe pas dans le stockage. Toujours typer le retour
    // avec le "null" possible pour eviter un faux sentiment de securite
    // cote TypeScript.
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Indique si un admin est actuellement connecte (au sens : un jeton
   * est present cote client). Note : ce booleen ne garantit pas que le
   * jeton soit ENCORE valide cote serveur ; le backend repondra 401 si
   * le JWT a expire, et l'intercepteur s'occupera alors de la
   * deconnexion forcee + redirection vers /admin/login.
   */
  isLoggedIn(): boolean {
    // L'operateur "!!" convertit n'importe quelle valeur en booleen :
    //   !!null      => false
    //   !!''        => false (chaine vide)
    //   !!'xxx'     => true  (chaine non vide)
    // C'est un raccourci frequent en TypeScript pour transformer une
    // valeur potentiellement nullable en true / false.
    return !!this.getToken();
  }
}
