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
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { Api } from '../../services/api';
import { GameState } from '../../services/game-state';
import { Question, ReponseResult } from '../../models/interfaces';
// Composant fils dedie au mini-jeu 2 (produit -> contenant) : remplace
// les 4 boutons QCM par une interface drag and drop. Le composant
// parent Game ne fait que l'inclure dans son template via @if.
import { GameDnd, DndValiderPayload } from '../game-dnd/game-dnd';

@Component({
  selector: 'app-game',
  // Composant standalone : on declare ici les sous-composants utilises
  // dans le template. GameDnd est conditionnellement affiche pour le
  // mini-jeu 2, le reste du template (QCM) n'a pas besoin d'imports.
  imports: [GameDnd],
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

  /** Les questions du niveau actuel (sous-ensemble des questions du mini-jeu pour la difficulté courante). */
  questions = signal<Question[]>([]);

  /** Index de la question affichée dans le tableau questions() (commence à 0). */
  questionIndex = signal(0);

  /** Réponse cliquée par le joueur (null = rien sélectionné). */
  selectedChoice = signal<string | null>(null);

  /**
   * Résultat reçu du backend après validation.
   * null = pas encore validé pour cette question.
   */
  reponseResult = signal<ReponseResult | null>(null);

  /** Index du mini-jeu actuel dans le tableau gameState.miniJeux() (commence à 0). */
  miniJeuIndex = signal(0);

  /** Niveau de difficulté actuel : 1 = Facile, 2 = Moyen, 3 = Difficile. */
  difficulte = signal(1);

  /** true pendant qu'on attend la réponse du serveur. */
  isLoading = signal(false);

  /** Message d'erreur si un appel API échoue. */
  erreur = signal('');

  /**
   * true pendant l'envoi de la reponse au backend en mode drag and
   * drop. Sert a desactiver le drag dans le composant fils GameDnd
   * pour empecher un joueur impatient de drop plusieurs fois en
   * attendant la reponse du serveur. Inutilise en mode QCM.
   */
  enAttenteServeur = signal(false);

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
   * Nombre de questions pour lesquelles le joueur est passé à la suivante
   * depuis le début de la partie (toutes mini-jeux confondus).
   * Incrémenté au clic sur "Question suivante" (et non au clic sur "Valider"),
   * afin que les compteurs ne sautent pas pendant l'affichage du résultat.
   * Sert au compteur global et au remplissage de la barre de progression.
   */
  questionsRepondues = signal(0);

  /**
   * Nombre de questions pour lesquelles le joueur est passé à la suivante
   * dans le mini-jeu actuellement en cours. Réinitialisé à 0 au passage au
   * mini-jeu suivant. Incrémenté au clic sur "Question suivante" (même règle
   * de timing que le compteur global ci-dessus).
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

  /**
   * true si le mini-jeu courant est celui qui doit s'afficher en
   * drag and drop (produit_contenant), false sinon (QCM classique).
   * Le template utilise ce computed dans un @if pour basculer entre
   * les deux modes sans dupliquer la logique.
   */
  estDragAndDrop = computed(() => {
    const mj = this.currentMiniJeu();
    return mj?.type === 'produit_contenant';
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
   * Charge le groupe de questions du mini-jeu pour la difficulté actuelle.
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
        // Les compteurs de progression ne sont PAS incrémentés ici :
        // ils le seront uniquement quand le joueur cliquera sur
        // "Question suivante", pour qu'ils ne sautent pas pendant
        // qu'il regarde encore le résultat de la question validée.
      },
      error: () => {
        this.erreur.set('Erreur lors de la validation. Veuillez réessayer.');
      },
    });
  }

  // ------------------------------------------------------------------
  // AMÉLIORATION (ajoutée après la version de base) : bouton "Passer"
  //
  // Permet au joueur de passer une question dont il ne connait pas la
  // réponse, sans rester bloqué. La question est alors comptée comme
  // incorrecte (0 point) et la bonne réponse est révélée pour qu'il
  // puisse apprendre. Cette amélioration n'a pas demandé de modification
  // du backend : on envoie simplement une valeur spéciale qui ne pourra
  // jamais correspondre à une vraie bonne réponse (voir ci-dessous).
  // ------------------------------------------------------------------

  /**
   * Passe la question actuelle sans avoir choisi de réponse.
   * Enregistre une réponse incorrecte côté serveur et déclenche le même
   * affichage que pour une mauvaise réponse (feedback rouge + bonne
   * réponse révélée).
   */
  passer(): void {
    const question = this.currentQuestion();
    const partie   = this.gameState.partie();

    // Sécurités : on ne passe que si une question est affichée, une partie
    // est en cours et que la réponse n'a pas encore été validée.
    // Contrairement à valider(), on n'exige PAS qu'un choix soit
    // sélectionné : c'est justement le but de "Passer".
    if (!question || !partie || this.reponseResult()) return;

    // Calcul du temps passé sur la question (en secondes entières).
    // Date.now() renvoie le nombre de millisecondes depuis 1970, on
    // soustrait l'instant où la question a été affichée puis on divise
    // par 1000 pour obtenir des secondes, et Math.round pour arrondir.
    const tempsReponse = Math.round((Date.now() - this.questionStartTime) / 1000);

    // On envoie la chaîne spéciale "__SKIPPED__" comme réponse donnée.
    // Pourquoi cette valeur précise : aucune vraie bonne réponse en base
    // ne porte ce libellé (c'est une chaîne avec des underscores et des
    // majuscules très improbables dans une question de cosmétique).
    // Donc le backend la comparera à la bonne réponse, ne trouvera pas
    // de correspondance, et la marquera automatiquement comme incorrecte
    // (estCorrecte = false, scoreObtenu = 0). Aucune modification du
    // backend n'est nécessaire pour gérer le "skip".
    this.api.submitReponse(partie.id, question.id, '__SKIPPED__', tempsReponse).subscribe({
      next: (result) => {
        // Affiche le résultat exactement comme pour valider() : le
        // template HTML détectera reponseResult().correct === false et
        // affichera le feedback rouge avec la bonne réponse révélée.
        this.reponseResult.set(result);
        // Met à jour le score affiché dans l'en-tête (il restera identique
        // puisque la réponse est incorrecte, mais on reste cohérent).
        this.gameState.score.set(result.score_total_partie);
        // Pas d'incrémentation des compteurs de progression ici : elle
        // se fera au clic sur "Question suivante", comme dans valider().
      },
      error: () => {
        this.erreur.set('Erreur lors du passage de la question. Veuillez réessayer.');
      },
    });
  }

  /**
   * Passe à la question suivante, ou au niveau suivant, ou au mini-jeu suivant,
   * ou navigue vers /result si toutes les questions sont terminées.
   */
  questionSuivante(): void {
    // Le joueur passe à la suite (il a vu son résultat) : on incrémente
    // les compteurs de progression maintenant, et non au moment de la
    // validation. Les chiffres affichés pendant l'écran de résultat
    // restent ceux de la question qui vient d'être validée et ne sautent
    // qu'au moment du passage à la suivante.
    // Placé tout en haut pour couvrir tous les cas (question suivante,
    // niveau suivant, mini-jeu suivant, fin de partie) : ainsi le total
    // final reste cohérent même avant la navigation vers /result.
    this.questionsRepondues.update(n => n + 1);
    this.questionsRepondueDansMiniJeuCourant.update(n => n + 1);

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

  // ------------------------------------------------------------------
  // AMÉLIORATION (ajoutée après la version de base) : raccourcis clavier
  //
  // Permet au joueur de jouer entièrement au clavier sans toucher la
  // souris, ce qui rend le jeu plus rapide et plus accessible.
  //
  // Touches gérées :
  //   - 1, 2, 3, 4 : sélectionnent respectivement le 1er, 2e, 3e ou 4e
  //                  choix de réponse affiché
  //   - Entrée    : valide la réponse sélectionnée, ou passe à la
  //                 question suivante si le résultat est déjà affiché
  //   - P         : passe la question (initiale de "Passer", même effet
  //                 que le bouton Passer)
  //
  // Choix d'implémentation : @HostListener('window:keydown') au niveau
  // de la fenêtre du navigateur, plutôt que sur un élément précis. On
  // veut capter les touches même quand aucun bouton n'a le focus.
  // Comme ce composant est créé/détruit avec la route /game, le listener
  // est automatiquement inactif sur les autres pages (home, pseudo,
  // result) : pas besoin de gestion manuelle d'activation/désactivation.
  // ------------------------------------------------------------------

  /**
   * Méthode unique qui reçoit toutes les touches clavier et appelle
   * la bonne action selon la touche pressée.
   *
   * @param event - Évènement clavier émis par le navigateur. Sa propriété
   *                event.key contient le nom de la touche pressée sous
   *                forme de chaîne ("1", "Enter", "s", "ArrowDown"...).
   */
  // @HostListener est un décorateur Angular : il attache automatiquement
  // la méthode décorée à un évènement, sans avoir besoin d'écrire
  // addEventListener à la main. Le premier argument 'window:keydown'
  // précise la cible (l'objet window du navigateur) et le type
  // d'évènement (keydown = quand une touche est enfoncée). Le second
  // argument ['$event'] dit à Angular de passer l'objet évènement
  // en paramètre de notre méthode.
  @HostListener('window:keydown', ['$event'])
  gererTouche(event: KeyboardEvent): void {
    // Garde-fou drag and drop : en mode DnD, les boutons QCM ne sont
    // pas affiches, donc les raccourcis 1-4 / Entree / P n'ont aucun
    // effet visible. On retourne tot pour eviter des appels inutiles
    // a valider() ou passer() qui changeraient l'etat partage du
    // composant pendant qu'un drag and drop est en cours.
    if (this.estDragAndDrop()) {
      return;
    }

    // Sécurité : si le joueur est en train de taper dans un champ texte
    // (input ou textarea), on ignore les raccourcis pour ne pas perturber
    // sa saisie. Peu probable sur la page game (pas de champ texte ici),
    // mais c'est une bonne pratique générale.
    // instanceof HTMLInputElement est un test JavaScript qui vérifie
    // que l'élément ciblé par l'évènement est bien un <input> du HTML.
    // Pareil avec HTMLTextAreaElement pour les <textarea>.
    const cible = event.target;
    if (cible instanceof HTMLInputElement || cible instanceof HTMLTextAreaElement) {
      return;
    }

    // Sécurité : tant que les questions chargent ou qu'aucune question
    // n'est affichée, les raccourcis n'ont rien à faire.
    if (this.isLoading() || !this.currentQuestion()) {
      return;
    }

    // event.key est la chaîne qui contient le nom de la touche pressée :
    // "1", "2", "3", "4", "Enter", "s", "S", "Escape", "ArrowLeft", etc.
    // On la stocke dans une variable pour éviter de la relire à chaque test.
    const touche = event.key;

    // ---- Cas 1 : touches 1 à 4 → sélectionner le choix correspondant ----
    if (touche === '1' || touche === '2' || touche === '3' || touche === '4') {
      // peutSelectionner() vaut false après validation : on bloque alors
      // la sélection pour empêcher le joueur de changer d'avis.
      if (!this.peutSelectionner()) return;

      // parseInt(touche, 10) convertit la chaîne ("1", "2"...) en nombre
      // entier. Le second argument 10 précise qu'on travaille en base 10
      // (système décimal classique). Le " - 1" sert à passer d'un index
      // 1-based (vu par le joueur : "1" = premier choix) à un index
      // 0-based (utilisé par les tableaux JavaScript : 0 = premier élément).
      const index = parseInt(touche, 10) - 1;

      // On lit le choix à cet index. Si le tableau a moins de 4 éléments,
      // choix vaudra undefined et on n'appelle pas selectionnerChoix
      // (la touche est ignorée silencieusement).
      const choix = this.currentQuestion().choix_possibles[index];
      if (choix !== undefined) {
        this.selectionnerChoix(choix);
      }
      return;
    }

    // ---- Cas 2 : touche Entrée → valider ou passer à la suivante ----
    if (touche === 'Enter') {
      // event.preventDefault() bloque le comportement par défaut du
      // navigateur. Ici, sans cet appel, si un bouton avait gardé le
      // focus (par exemple le dernier choix cliqué), Entrée déclencherait
      // un clic sur ce bouton EN PLUS de notre action, créant un effet
      // double. preventDefault empêche cet effet indésirable.
      event.preventDefault();

      if (this.reponseResult() === null) {
        // Pas encore validé : on déclenche valider(), mais seulement si
        // un choix a déjà été sélectionné (sinon valider() ne fait rien
        // de toute façon, mais on évite un appel inutile).
        if (this.selectedChoice() !== null) {
          this.valider();
        }
      } else {
        // Réponse déjà validée et résultat affiché : Entrée fait passer
        // à la question suivante (équivalent du bouton "Question suivante").
        this.questionSuivante();
      }
      return;
    }

    // ---- Cas 3 : touche P (majuscule ou minuscule) → passer la question ----
    // P comme "Passer" : initiale du libellé du bouton, plus naturelle à
    // mémoriser pour le joueur. On accepte les deux casses pour que le
    // raccourci marche que CapsLock soit activé ou non.
    if (touche === 'p' || touche === 'P') {
      // On ne peut passer la question que tant qu'elle n'a pas été validée
      // (sinon le bouton "Passer" n'est plus visible non plus).
      if (this.reponseResult() === null) {
        this.passer();
      }
      return;
    }
  }

  // ------------------------------------------------------------------
  // PONT QCM <-> DRAG AND DROP
  //
  // Les deux methodes ci-dessous servent uniquement a brancher les
  // events emis par le composant fils GameDnd sur la logique deja
  // existante du parent. Elles ne dupliquent pas la logique du QCM :
  // elles se contentent d'encapsuler l'appel API (onValiderDnd) ou
  // de deleguer a la methode existante (onQuestionSuivanteDnd).
  // ------------------------------------------------------------------

  /**
   * Recoit l'evenement valider emis par GameDnd au moment du drop.
   * Effectue l'appel API submitReponse exactement comme le ferait
   * valider() en mode QCM, en utilisant le tempsReponseSec calcule
   * par le composant fils (timer interne du DnD, plus precis que
   * questionStartTime du parent dans ce contexte).
   *
   * Le signal enAttenteServeur passe a true pendant l'appel pour
   * que le DnD bloque le drag (cdkDragDisabled lie a peutDrag()).
   * Il repasse a false dans les deux cas (succes ou erreur) pour
   * que l'interface se debloque coute que coute.
   */
  onValiderDnd(payload: DndValiderPayload): void {
    const partie = this.gameState.partie();
    // Garde-fous : pas de partie en cours, ou reponse deja validee
    // (impossible normalement vu le cdkDragDisabled, mais on double).
    if (!partie || this.reponseResult()) {
      return;
    }

    this.enAttenteServeur.set(true);
    this.api
      .submitReponse(partie.id, payload.questionId, payload.reponse, payload.tempsReponseSec)
      .subscribe({
        next: (result) => {
          // Memorise le resultat pour que le DnD affiche la rétroaction.
          this.reponseResult.set(result);
          // Met a jour le score de l'en-tete (meme signal que le QCM).
          this.gameState.score.set(result.score_total_partie);
          this.enAttenteServeur.set(false);
        },
        error: () => {
          // En cas d'echec reseau, on debloque l'UI et on affiche
          // un message d'erreur (le DnD redonne la main au joueur).
          this.erreur.set('Erreur lors de la validation. Veuillez réessayer.');
          this.enAttenteServeur.set(false);
        },
      });
  }

  /**
   * Recoit l'evenement questionSuivante emis par GameDnd au clic
   * sur son bouton dedie. Delegue a la methode existante du parent
   * pour que la logique de transition (question / niveau / mini-jeu
   * / fin de partie) reste centralisee dans questionSuivante().
   */
  onQuestionSuivanteDnd(): void {
    this.questionSuivante();
  }
}
