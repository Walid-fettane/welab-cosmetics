// Page principale du jeu We-Lab Cosmetics.
//
// Cette page gère toute la progression du jeu :
//   - 3 mini-jeux (ingredient_produit, produit_contenant, action_pole)
//   - Pour chaque mini-jeu : 3 niveaux (Facile → Moyen → Difficile)
//   - Pour chaque niveau : 5 questions à répondre
//   - Total : 3 × 3 × 5 = 45 questions, score max = 3 × (5×1 + 5×2 + 5×3) = 90 points
//
// Flux :
//   ngOnInit → chargerQuestions() → afficher question → joueur clique choix
//   → joueur clique Valider → API → afficher résultat → Question suivante → ...
//   → quand tout est fini → naviguer vers /result

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
import { Question, ReponseResult } from '../../models/interfaces';

@Component({
  selector: 'app-game',
  templateUrl: './game.html',
  styleUrl: './game.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Game implements OnInit {
  private router    = inject(Router);
  private api       = inject(Api);
  // gameState est le service partagé qui contient joueur, partie, miniJeux, score
  gameState         = inject(GameState);

  // ------------------------------------------------------------------
  // État local de la page (signals réactifs)
  // ------------------------------------------------------------------

  /** Les questions du niveau actuel (ex: 5 questions faciles du mini-jeu 1). */
  questions = signal<Question[]>([]);

  /** Index de la question affichée (0 = 1ère question, 4 = 5ème). */
  questionIndex = signal(0);

  /** Réponse cliquée par le joueur (null = rien sélectionné). */
  selectedChoice = signal<string | null>(null);

  /**
   * Résultat reçu du backend après validation.
   * null = pas encore validé pour cette question.
   */
  reponseResult = signal<ReponseResult | null>(null);

  /** Index du mini-jeu actuel dans le tableau gameState.miniJeux() (0, 1, 2). */
  miniJeuIndex = signal(0);

  /** Niveau de difficulté actuel : 1 = Facile, 2 = Moyen, 3 = Difficile. */
  difficulte = signal(1);

  /** true pendant qu'on attend la réponse du serveur. */
  isLoading = signal(false);

  /** Message d'erreur si un appel API échoue. */
  erreur = signal('');

  /**
   * Moment exact où la question a été affichée (en millisecondes depuis 1970).
   * Sert à calculer le temps de réponse : (Date.now() - questionStartTime) / 1000.
   */
  private questionStartTime = 0;

  // ------------------------------------------------------------------
  // Propriétés calculées (computed) : recalculées automatiquement
  // quand les signals dont elles dépendent changent
  // ------------------------------------------------------------------

  /** La question actuellement affichée à l'écran. */
  currentQuestion = computed(() => this.questions()[this.questionIndex()]);

  /** Le mini-jeu en cours (objet complet avec nom, description...). */
  currentMiniJeu = computed(() => this.gameState.miniJeux()[this.miniJeuIndex()]);

  /** Libellé lisible du niveau (1→"Facile", 2→"Moyen", 3→"Difficile"). */
  difficulteLabel = computed(() => {
    const labels: Record<number, string> = {
      1: 'Facile',
      2: 'Moyen',
      3: 'Difficile',
    };
    return labels[this.difficulte()] ?? '';
  });

  /** Numéro de la question pour l'affichage (commence à 1, pas 0). */
  numeroQuestion = computed(() => this.questionIndex() + 1);

  /**
   * true si le joueur peut encore cliquer sur une réponse.
   * On bloque après validation pour empêcher de changer d'avis.
   */
  peutSelectionner = computed(() => this.reponseResult() === null);

  // ------------------------------------------------------------------
  // Cycle de vie Angular : ngOnInit est appelé automatiquement
  // quand Angular crée ce composant (= quand on arrive sur /game)
  // ------------------------------------------------------------------

  ngOnInit(): void {
    // Garde-fou : si on arrive sur /game sans avoir saisi de pseudo,
    // on renvoie vers /pseudo (évite les erreurs si l'URL est saisie manuellement)
    if (!this.gameState.partie()) {
      this.router.navigate(['/pseudo']);
      return;
    }
    // Tout est OK : on charge les premières questions
    this.chargerQuestions();
  }

  // ------------------------------------------------------------------
  // Méthodes privées (logique interne)
  // ------------------------------------------------------------------

  /**
   * Charge le groupe de 5 questions pour le mini-jeu et la difficulté actuels.
   * Appelée au démarrage et chaque fois qu'on passe au niveau/mini-jeu suivant.
   */
  private chargerQuestions(): void {
    const partie  = this.gameState.partie();
    const miniJeu = this.currentMiniJeu();
    if (!partie || !miniJeu) return;

    this.isLoading.set(true);
    this.erreur.set('');

    this.api.getQuestions(partie.id, miniJeu.id, this.difficulte()).subscribe({
      next: (questions) => {
        this.questions.set(questions);
        this.questionIndex.set(0);
        this.selectedChoice.set(null);
        this.reponseResult.set(null);
        this.isLoading.set(false);
        // Démarre le chrono pour mesurer le temps de réponse à cette question
        this.questionStartTime = Date.now();
      },
      error: () => {
        this.erreur.set('Impossible de charger les questions. Vérifiez la connexion.');
        this.isLoading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------
  // Méthodes publiques (appelées depuis le template HTML)
  // ------------------------------------------------------------------

  /**
   * Enregistre le choix cliqué par le joueur.
   * Ne fait rien si la réponse a déjà été validée.
   * @param choix - Le texte du choix cliqué
   */
  selectionnerChoix(choix: string): void {
    // Bloque si déjà validé (le joueur ne peut pas rechanger après avoir validé)
    if (!this.peutSelectionner()) return;
    this.selectedChoice.set(choix);
  }

  /**
   * Envoie la réponse du joueur au backend pour vérification.
   * Met à jour le score et affiche si c'était correct ou non.
   */
  valider(): void {
    const choix    = this.selectedChoice();
    const question = this.currentQuestion();
    const partie   = this.gameState.partie();

    // Sécurités : on ne valide que si tout est prêt et pas déjà validé
    if (!choix || !question || !partie || this.reponseResult()) return;

    // Calcul du temps passé à répondre à cette question (en secondes entières)
    const tempsReponse = Math.round((Date.now() - this.questionStartTime) / 1000);

    this.api.submitReponse(partie.id, question.id, choix, tempsReponse).subscribe({
      next: (result) => {
        // Affiche le résultat (correct/faux + bonne réponse)
        this.reponseResult.set(result);
        // Met à jour le score affiché dans l'en-tête en temps réel
        this.gameState.score.set(result.score_total_partie);
      },
      error: () => {
        this.erreur.set('Erreur lors de la validation. Réessaie.');
      },
    });
  }

  /**
   * Passe à la question suivante, ou au niveau suivant, ou au mini-jeu suivant,
   * ou navigue vers /result si toutes les questions sont terminées.
   */
  questionSuivante(): void {
    const index      = this.questionIndex();
    const total      = this.questions().length;
    const diff       = this.difficulte();
    const miniIdx    = this.miniJeuIndex();
    const nbMiniJeux = this.gameState.miniJeux().length;

    if (index < total - 1) {
      // Cas 1 : il reste des questions dans ce niveau → avancer d'une question
      this.questionIndex.set(index + 1);
      this.selectedChoice.set(null);
      this.reponseResult.set(null);
      // Réinitialise le chrono pour la nouvelle question
      this.questionStartTime = Date.now();

    } else if (diff < 3) {
      // Cas 2 : toutes les questions du niveau actuel jouées → passer au niveau suivant
      this.difficulte.update(d => d + 1);
      this.chargerQuestions();

    } else if (miniIdx < nbMiniJeux - 1) {
      // Cas 3 : tous les niveaux de ce mini-jeu joués → passer au mini-jeu suivant
      this.miniJeuIndex.update(i => i + 1);
      this.difficulte.set(1);       // On recommence au niveau Facile
      this.chargerQuestions();

    } else {
      // Cas 4 : tout le jeu est terminé → aller afficher les résultats
      this.router.navigate(['/result']);
    }
  }
}
