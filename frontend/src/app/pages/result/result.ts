// Page de résultats, affichée à la fin du jeu.
// Quand le joueur arrive sur cette page, elle :
//   1. Appelle l'API pour "terminer" officiellement la partie (PATCH /api/parties/{id}/terminer)
//   2. Affiche le score final, un message de félicitation adapté, et les statistiques
//   3. Propose un bouton "Rejouer" pour recommencer une nouvelle partie

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { Api } from '../../services/api';
import { GameState } from '../../services/game-state';

// Score maximum possible : 3 mini-jeux × (5×1 + 5×2 + 5×3) = 3 × 30 = 90 points
const SCORE_MAX = 90;

@Component({
  selector: 'app-result',
  templateUrl: './result.html',
  styleUrl: './result.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Result implements OnInit {
  private router    = inject(Router);
  private api       = inject(Api);
  gameState         = inject(GameState);

  // ------------------------------------------------------------------
  // État local
  // ------------------------------------------------------------------

  /** true pendant l'appel à terminerPartie (affiche un indicateur de chargement). */
  isLoading = signal(true);

  /** Message d'erreur si l'appel API échoue. */
  erreur = signal('');

  /** Nombre total de réponses soumises dans la partie. */
  nbReponses = signal(0);

  // ------------------------------------------------------------------
  // Propriétés calculées
  // ------------------------------------------------------------------

  /** Score final récupéré depuis le service partagé (mis à jour par terminerPartie). */
  scoreFinal = computed(() => this.gameState.scoreFinal());

  /** Pourcentage du score obtenu sur le score maximum (0–100). */
  pourcentage = computed(() => Math.round((this.scoreFinal() / SCORE_MAX) * 100));

  /** Score maximum atteignable (constant : 90). */
  scoreMax = SCORE_MAX;

  /**
   * Message de félicitation adapté au score obtenu.
   * Calculé automatiquement quand scoreFinal change.
   */
  messageFelicitation = computed(() => {
    const pct = this.pourcentage();
    if (pct >= 90) return '🏆 Exceptionnel ! Tu es un expert en cosmétique !';
    if (pct >= 70) return '🌟 Très bien ! Tu maîtrises bien le sujet !';
    if (pct >= 50) return '👍 Pas mal ! Continue à apprendre !';
    if (pct >= 30) return '📚 C\'est un bon début, revise et recommence !';
    return '💪 Ne te décourage pas, la prochaine fois sera meilleure !';
  });

  /**
   * Emoji représentant le niveau de performance (trophée, étoile, etc.).
   */
  emojiNiveau = computed(() => {
    const pct = this.pourcentage();
    if (pct >= 90) return '🏆';
    if (pct >= 70) return '🌟';
    if (pct >= 50) return '🥈';
    if (pct >= 30) return '🥉';
    return '🎯';
  });

  // ------------------------------------------------------------------
  // Cycle de vie
  // ------------------------------------------------------------------

  ngOnInit(): void {
    const partie = this.gameState.partie();

    // Garde-fou : si on arrive ici sans partie en cours, renvoyer au pseudo
    if (!partie) {
      this.router.navigate(['/pseudo']);
      return;
    }

    // Appel API : termine officiellement la partie et récupère le score final officiel
    this.api.terminerPartie(partie.id).subscribe({
      next: (partieResult) => {
        // On stocke le score final dans le service partagé pour le rendre accessible
        this.gameState.scoreFinal.set(partieResult.score_total);
        this.nbReponses.set(partieResult.nb_reponse);
        this.isLoading.set(false);
      },
      error: () => {
        // En cas d'erreur API, on utilise le score déjà mémorisé en temps réel
        // (moins précis mais permet quand même d'afficher quelque chose)
        this.gameState.scoreFinal.set(this.gameState.score());
        this.erreur.set('La connexion au serveur a été perdue, le score peut être approximatif.');
        this.isLoading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------
  // Actions utilisateur
  // ------------------------------------------------------------------

  /**
   * Remet le jeu à zéro et renvoie le joueur vers la page de saisie du pseudo.
   * Appelé quand le joueur clique "Rejouer".
   */
  rejouer(): void {
    // On remet tous les signals du service partagé à leur valeur initiale
    this.gameState.reset();
    this.router.navigate(['/pseudo']);
  }
}
