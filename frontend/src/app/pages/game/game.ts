// Page principale du jeu We-Lab Cosmetics.
//
// Cette page gère toute la progression du jeu :
//   - 3 mini-jeux (ingredient_produit, produit_contenant, action_pole)
//   - Pour chaque mini-jeu : 3 niveaux (Facile → Moyen → Difficile)
//   - Pour chaque niveau : un sous-ensemble des questions du mini-jeu (selon la base)
//   - Total : variable selon le contenu de la base (somme des nb_questions de chaque mini-jeu)
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
  OnDestroy,
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
export class Game implements OnInit, OnDestroy {
  private router    = inject(Router);
  private api       = inject(Api);
  // gameState est le service partagé qui contient joueur, partie, miniJeux, score
  gameState         = inject(GameState);

  // ------------------------------------------------------------------
  // État local de la page (signals réactifs)
  // ------------------------------------------------------------------

  /** Les questions du niveau actuel (ex: 3 questions faciles du mini-jeu 1). */
  questions = signal<Question[]>([]);

  /** Index de la question affichée (0 = 1ère question, 2 = 3ème). */
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

  /**
   * Nombre de secondes écoulées depuis l'arrivée sur la page de jeu.
   * Mis à jour toutes les secondes par un setInterval lancé dans ngOnInit.
   */
  tempsEcouleSecondes = signal(0);

  /**
   * Nombre de questions auxquelles le joueur a déjà répondu (validées) depuis
   * le début de la partie (toutes mini-jeux confondus).
   * Sert au compteur global et au remplissage de la barre de progression.
   */
  questionsRepondues = signal(0);

  /**
   * Nombre de questions auxquelles le joueur a déjà répondu dans le mini-jeu
   * actuellement en cours. Réinitialisé à 0 au passage au mini-jeu suivant.
   * Sert à afficher le compteur local "Question X / total du mini-jeu".
   */
  questionsRepondueDansMiniJeuCourant = signal(0);

  /**
   * Identifiant renvoyé par setInterval pour le chronomètre.
   * Conservé afin de pouvoir l'arrêter dans ngOnDestroy avec clearInterval.
   */
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // ------------------------------------------------------------------
  // Propriétés calculées (computed) : recalculées automatiquement
  // quand les signals dont elles dépendent changent
  // ------------------------------------------------------------------

  /** La question actuellement affichée à l'écran. */
  currentQuestion = computed(() => this.questions()[this.questionIndex()]);

  /** Le mini-jeu en cours (objet complet avec nom, description...). */
  currentMiniJeu = computed(() => this.gameState.miniJeux()[this.miniJeuIndex()]);

  /**
   * Nombre total de questions du mini-jeu actuellement en cours.
   * Lu dynamiquement sur miniJeux() pour refléter les vraies valeurs
   * envoyées par le backend (champ nb_questions).
   */
  totalQuestionsLocale = computed(() => {
    const mj = this.gameState.miniJeux()[this.miniJeuIndex()];
    return mj?.nb_questions ?? 0;
  });

  /**
   * Nombre total de questions sur l'ensemble de la partie.
   * Somme des nb_questions de tous les mini-jeux : varie selon le contenu de la base.
   */
  totalQuestionsPartie = computed(() => {
    return this.gameState.miniJeux().reduce((total, mj) => total + mj.nb_questions, 0);
  });

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

  /**
   * Chronomètre formaté en MM:SS pour l'affichage à l'écran.
   * Exemple : 75 secondes devient "01:15".
   */
  tempsFormate = computed(() => {
    const total    = this.tempsEcouleSecondes();
    const minutes  = Math.floor(total / 60);
    const secondes = total % 60;
    // padStart ajoute un zéro devant si le nombre est inférieur à 10
    const mm = minutes.toString().padStart(2, '0');
    const ss = secondes.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  });

  /**
   * Pourcentage de remplissage de la barre de progression (entre 0 et 100).
   * Calculé sur le total dynamique de la partie pour que la barre progresse
   * de 0 à 100% sans redescendre entre les mini-jeux.
   * Garde-fous : retourne 0 si le total n'est pas encore connu (miniJeux vide
   * au démarrage), et plafonne à 100 par sécurité.
   */
  pourcentageProgression = computed(() => {
    const total = this.totalQuestionsPartie();
    if (total === 0) return 0;
    return Math.min((this.questionsRepondues() / total) * 100, 100);
  });

  /**
   * Numéro de la question affichée à l'écran, compté depuis le début de la partie.
   * Règle simple et stable :
   *   - Si une question est affichée : numéro = nombre de réponses validées + 1,
   *     borné par le total dynamique de la partie pour ne jamais dépasser le maximum.
   *   - Si aucune question n'est affichée (cas extrême en fin de partie) :
   *     on montre simplement le nombre de réponses données.
   */
  numeroQuestionGlobale = computed(() => {
    const repondues = this.questionsRepondues();
    const total     = this.totalQuestionsPartie();
    // Aucune question à l'écran : on affiche simplement le nombre de réponses
    if (this.currentQuestion() == null) {
      return Math.min(repondues, total);
    }
    // Une question est affichée : son numéro est le nombre de réponses + 1
    // Borné supérieurement par le total de la partie (jamais de dépassement)
    // Borné inférieurement à 1 (jamais "0 / total" tant qu'une question est visible)
    const numero = Math.min(repondues + 1, total);
    return Math.max(numero, 1);
  });

  /**
   * Numéro de la question affichée à l'écran, compté dans le mini-jeu courant
   * uniquement (de 1 jusqu'au total de questions du mini-jeu). Même logique
   * de bornage que numeroQuestionGlobale, mais sur le compteur local qui
   * repart à 0 à chaque nouveau mini-jeu.
   */
  numeroQuestionLocale = computed(() => {
    const repondues = this.questionsRepondueDansMiniJeuCourant();
    const total     = this.totalQuestionsLocale();
    // Aucune question à l'écran : on affiche simplement le nombre de réponses locales
    if (this.currentQuestion() == null) {
      return Math.min(repondues, total);
    }
    // Une question est affichée : numéro = réponses locales + 1, borné dans [1 ; total]
    const numero = Math.min(repondues + 1, total);
    return Math.max(numero, 1);
  });

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
    // Lance le chronomètre : la fonction passée à setInterval est appelée
    // toutes les 1000 millisecondes (= 1 seconde) et incrémente le compteur
    this.intervalId = setInterval(() => {
      this.tempsEcouleSecondes.update(s => s + 1);
    }, 1000);
    // Tout est OK : on charge les premières questions
    this.chargerQuestions();
  }

  /**
   * Méthode appelée par Angular juste avant de détruire le composant
   * (par exemple lors de la navigation vers /result en fin de partie).
   * On y arrête proprement le chronomètre pour éviter une fuite mémoire.
   */
  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ------------------------------------------------------------------
  // Méthodes privées (logique interne)
  // ------------------------------------------------------------------

  /**
   * Charge le groupe de 3 questions pour le mini-jeu et la difficulté actuels.
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
        // Une question vient d'être validée : on incrémente le compteur global
        // (utilisé pour la barre de progression et le compteur "Total X / total partie")
        this.questionsRepondues.update(n => n + 1);
        // On incrémente aussi le compteur local du mini-jeu courant
        // (utilisé pour le compteur "Question X / total du mini-jeu")
        this.questionsRepondueDansMiniJeuCourant.update(n => n + 1);
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
      // On remet à zéro le compteur local pour que l'affichage redémarre à "1 / total"
      this.questionsRepondueDansMiniJeuCourant.set(0);
      this.chargerQuestions();

    } else {
      // Cas 4 : tout le jeu est terminé → aller afficher les résultats
      this.router.navigate(['/result']);
    }
  }
}
