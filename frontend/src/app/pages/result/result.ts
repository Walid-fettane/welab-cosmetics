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

// ------------------------------------------------------------------
// AMÉLIORATION (ajoutée après la version de base) : score max dynamique.
//
// Auparavant, ce fichier déclarait une constante SCORE_MAX = 90 qui
// supposait 3 mini-jeux × (5×1 + 5×2 + 5×3) = 90 points. Cette valeur
// devenait fausse dès que l'administrateur ajoutait ou supprimait une
// question via l'interface CRUD. Désormais, le backend calcule lui-même
// le score maximum atteignable pour CHAQUE partie (en additionnant la
// difficulté des questions réellement posées) et l'envoie dans la
// réponse de fin de partie. Le frontend se contente de l'afficher, ce
// qui garantit un pourcentage juste en toutes circonstances.
// ------------------------------------------------------------------

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

  /**
   * Score maximum atteignable pour cette partie, lu depuis le service partagé.
   * Cette valeur est renvoyée par le backend dans la réponse de terminerPartie
   * (champ score_max_partie). Elle dépend des questions réellement posées :
   * elle s'adapte automatiquement quand l'administrateur ajoute ou supprime
   * une question dans l'interface d'administration.
   */
  scoreMax = computed(() => this.gameState.scoreMaxFinal());

  /**
   * Pourcentage du score obtenu sur le score maximum (entier de 0 à 100).
   * Math.round() arrondit à l'entier le plus proche : par exemple 67.5 -> 68.
   * On protège la division contre le cas (rare) où scoreMax vaudrait 0,
   * ce qui produirait une valeur invalide (NaN) à l'affichage.
   */
  pourcentage = computed(() => {
    const max = this.scoreMax();
    if (max === 0) {
      return 0;
    }
    return Math.round((this.scoreFinal() / max) * 100);
  });

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
        // On stocke aussi le score maximum atteignable, calculé par le backend.
        // C'est cette valeur qui sert de dénominateur dans le calcul du pourcentage.
        this.gameState.scoreMaxFinal.set(partieResult.score_max_partie);
        this.nbReponses.set(partieResult.nb_reponse);
        this.isLoading.set(false);
      },
      error: () => {
        // En cas d'erreur API, on utilise le score déjà mémorisé en temps réel
        // (moins précis mais permet quand même d'afficher quelque chose).
        // On laisse scoreMaxFinal à 0 : le pourcentage affichera 0 % et le
        // joueur verra le message d'avertissement ci-dessous.
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
