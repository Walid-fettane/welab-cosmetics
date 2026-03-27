// Page de saisie du pseudo (nom du joueur).
// Quand le joueur valide son pseudo, cette page :
//   1. Crée ou récupère le joueur dans la base de données via l'API
//   2. Crée une nouvelle partie liée à ce joueur
//   3. Charge la liste des mini-jeux disponibles
//   4. Stocke tout dans GameState (service partagé)
//   5. Navigue vers la page de jeu (/game)

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
// FormsModule contient la directive ngModel pour lier un champ HTML à une variable
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// switchMap = opérateur RxJS pour chaîner des appels HTTP (un après l'autre)
// forkJoin  = opérateur RxJS pour lancer plusieurs appels en parallèle
import { forkJoin, switchMap } from 'rxjs';

import { Api } from '../../services/api';
import { GameState } from '../../services/game-state';

@Component({
  selector: 'app-pseudo',
  // FormsModule est déclaré ici (pas globalement) car c'est un composant standalone
  imports: [FormsModule],
  templateUrl: './pseudo.html',
  styleUrl: './pseudo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pseudo {
  private router     = inject(Router);
  private api        = inject(Api);
  // GameState = le "sac à dos" partagé entre toutes les pages
  gameState          = inject(GameState);

  // signal() crée une variable réactive : Angular met à jour le HTML quand elle change.
  // pseudo = ce que le joueur tape dans le champ texte
  pseudo   = signal('');
  // Message d'erreur affiché si le pseudo est vide ou si l'API échoue
  erreur   = signal('');
  // true pendant qu'on attend la réponse du serveur (pour désactiver le bouton)
  loading  = signal(false);

  /**
   * Lance la séquence de démarrage quand le joueur clique "Jouer !".
   * Étapes : createJoueur → createPartie + getMiniJeux → navigate /game
   */
  jouer(): void {
    // Nettoie les espaces au début et à la fin du pseudo saisi
    const pseudoValue = this.pseudo().trim();

    // Validation : refuse un pseudo vide
    if (!pseudoValue) {
      this.erreur.set('Le pseudo ne peut pas être vide.');
      return;
    }

    // Lance le chargement et efface l'éventuelle ancienne erreur
    this.loading.set(true);
    this.erreur.set('');

    // ---------------------------------------------------------------
    // Appels API chaînés avec RxJS
    //
    // pipe() = "tuyau" : les données passent d'une étape à l'autre
    // switchMap() = quand createJoueur répond, on passe au switchMap
    //   qui reçoit le joueur et lance deux appels en parallèle (forkJoin)
    // forkJoin() = attend que createPartie ET getMiniJeux soient terminés,
    //   puis livre les deux résultats en même temps
    // ---------------------------------------------------------------
    this.api.createJoueur(pseudoValue).pipe(
      switchMap(joueur => {
        // On stocke le joueur dès réception (avant même d'avoir la partie)
        this.gameState.joueur.set(joueur);

        // On lance les deux appels suivants EN PARALLÈLE pour gagner du temps
        return forkJoin({
          partie:   this.api.createPartie(joueur.id),  // Crée la partie
          miniJeux: this.api.getMiniJeux(),             // Charge les mini-jeux
        });
      })
    ).subscribe({
      // Succès : on reçoit { partie, miniJeux } en même temps
      next: ({ partie, miniJeux }) => {
        this.gameState.partie.set(partie);
        this.gameState.miniJeux.set(miniJeux);
        this.gameState.score.set(0);  // Repart à 0 pour cette partie
        this.loading.set(false);
        // Navigation vers la page de jeu
        this.router.navigate(['/game']);
      },
      // Erreur réseau ou serveur arrêté
      error: () => {
        this.erreur.set('Erreur de connexion. Vérifiez que le serveur est bien démarré.');
        this.loading.set(false);
      },
    });
  }
}
