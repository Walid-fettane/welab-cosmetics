// Page de connexion de l'espace administrateur.
//
// Affiche un formulaire email + mot de passe. A la soumission :
//   - appelle AuthService.login(...) qui fait POST /api/admin/login
//   - en cas de succes : le service stocke automatiquement le jeton
//     dans localStorage, puis on redirige vers /admin/dashboard
//   - en cas d'echec 401 : message "email ou mot de passe incorrect"
//   - en cas d'autre erreur : message generique de probleme reseau

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
// FormsModule fournit la directive ngModel permettant le binding
// bidirectionnel entre un champ HTML et une variable TypeScript. Sans
// ce module importe, ngModel declencherait une erreur de compilation
// dans le template.
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// HttpErrorResponse : objet emis par Angular quand une requete HTTP
// echoue. On s'en sert pour distinguer 401 (credentials incorrects)
// des autres erreurs (reseau, serveur arrete, ...) via la propriete
// .status qui contient le code HTTP renvoye.
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-login',
  // imports : liste des modules / composants standalones utilises dans
  // le template. FormsModule est obligatoire ici pour pouvoir ecrire
  // [ngModel] et (ngModelChange) dans le HTML.
  imports: [FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
  // OnPush : strategie de detection de changements optimisee. Angular
  // ne re-evaluera le template que lorsqu'un signal qui y est lu est
  // mis a jour, ou quand un Input du composant change. Plus performant
  // que la strategie Default qui revalide a chaque tick du navigateur.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  // inject() : recupere les services depuis le contexte d'injection
  // Angular sans passer par un constructeur explicite.
  private auth   = inject(AuthService);
  private router = inject(Router);

  // signal(valeurInitiale) cree une variable reactive Angular. On la
  // lit en ECRIVANT "email()" (appel de fonction) et on la modifie via
  // "email.set(nouvelleValeur)". Toute modification declenche un re-
  // render OnPush du template qui la lit, sans qu'on ait a notifier
  // Angular manuellement.
  email    = signal('');
  password = signal('');
  erreur   = signal('');
  // loading : vrai pendant l'appel HTTP en cours. Utilise pour griser
  // le bouton et empecher les doubles clics.
  loading  = signal(false);

  /**
   * Methode appelee par l'evenement (ngSubmit) du formulaire HTML.
   * Valide la saisie cote client puis declenche AuthService.login(...).
   * En cas de succes, redirige vers /admin/dashboard ; en cas d'erreur,
   * met a jour le signal "erreur" pour afficher un message a l'admin.
   */
  connecter(): void {
    // .trim() retire les espaces en debut et fin de chaine (par exemple
    // si l'admin a colle son email en y incluant un espace involontaire).
    const email    = this.email().trim();
    const password = this.password();

    // Validation simple cote client : refuser un formulaire vide pour
    // eviter un aller-retour reseau inutile vers le serveur.
    if (!email || !password) {
      this.erreur.set('Veuillez renseigner un email et un mot de passe.');
      return;
    }

    this.loading.set(true);
    this.erreur.set('');

    // subscribe({ next, error }) : declenche reellement l'execution de
    // l'Observable retourne par auth.login(). "next" recoit la valeur
    // emise en cas de succes (ici { token: "..." }) ; "error" est appele
    // en cas d'echec (HttpErrorResponse). Sans subscribe, l'Observable
    // ne fait rien et l'appel HTTP n'est meme pas envoye.
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        // Router.navigate([...]) : navigation programmatique. Le tableau
        // contient les segments de l'URL cible (ici "/admin/dashboard").
        // L'authGuard verifiera la presence du jeton avant d'activer la
        // route, mais comme le service vient de le stocker, ca passera.
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // err.status contient le code HTTP renvoye par le serveur.
        // 401 = identifiants incorrects.
        // Tout autre code (0, 500, ...) = probleme technique (reseau,
        // serveur arrete, etc.).
        if (err.status === 401) {
          this.erreur.set('Email ou mot de passe incorrect.');
        } else {
          this.erreur.set('Erreur de connexion. Verifiez que le serveur est demarre.');
        }
      },
    });
  }
}
