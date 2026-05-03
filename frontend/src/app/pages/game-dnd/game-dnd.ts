// ------------------------------------------------------------------
// Composant fils dedie au mini-jeu 2 (produit -> contenant).
//
// Il remplace l'affichage des 4 boutons QCM par une interface drag
// and drop : un produit affiche en haut de l'ecran, 4 zones de
// contenants en bas. Le joueur fait glisser le produit dans la zone
// qu'il pense correcte ; le drop declenche immediatement l'envoi
// de la reponse au backend.
//
// Architecture : ce composant n'est qu'une couche de presentation.
// Le composant parent (Game) reste maitre de la logique (signals,
// chargement des questions, score, transition de niveau). Le DnD
// recoit la question via un input, calcule son propre temps de
// reponse interne, et emet vers le parent l'action choisie.
//
// Gestes geres : souris ET tactile (le module @angular/cdk/drag-drop
// reconnait nativement les deux types d'evenements pointer).
// ------------------------------------------------------------------

import {
  // ChangeDetectionStrategy.OnPush : Angular ne re-rend que si un
  // signal lu dans le template change ; meilleure performance.
  ChangeDetectionStrategy,
  Component,
  // computed : valeur derivee qui se recalcule automatiquement
  // quand les signals dont elle depend changent.
  computed,
  // effect : code declenche automatiquement quand un signal lu a
  // l'interieur change. On s'en sert pour reinitialiser l'etat
  // interne quand une nouvelle question arrive.
  effect,
  // HostListener : decorateur qui branche une methode du composant
  // sur un evenement DOM (ici 'window:keydown' pour ecouter le
  // clavier au niveau de la fenetre du navigateur).
  HostListener,
  // inject : recupere un service Angular sans passer par le
  // constructeur. Utilise pour AdminImagesStore.
  inject,
  // input : nouvelle facon Angular 17+ de declarer une entree de
  // composant sous forme de signal (remplace @Input).
  input,
  // output : equivalent signal-based de @Output pour emettre des
  // evenements vers le parent.
  output,
  // signal : variable reactive locale au composant.
  signal,
} from '@angular/core';

// Module CDK officiel d'Angular qui fournit les directives cdkDrag
// et cdkDropList ainsi que le type CdkDragDrop pour le drop event.
import {
  CdkDrag,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';

// Interfaces partagees avec le reste de l'application : structure
// d'une Question (avec ses choix possibles) et resultat d'une reponse.
import { Question, ReponseResult } from '../../models/interfaces';

// Helpers de mapping question -> images SVG. ECHEC_IMAGE est
// l'image generique affichee en cas de mauvaise reponse.
import {
  ECHEC_IMAGE,
  getContenantImage,
  getImagesForQuestion,
} from '../../data/question-images-mapping';

// Store des images choisies par l'admin via le dashboard. Lu ici
// pour avoir la priorite sur le mapping en dur des questions
// historiques et pouvoir afficher des images sur les questions
// DnD ajoutees dynamiquement depuis le CRUD.
import { AdminImagesStore } from '../../services/admin-images-store';

// ------------------------------------------------------------------
// Forme du payload envoye au parent quand le joueur drop le produit
// sur un contenant. Le parent l'utilise pour appeler l'API exactement
// comme le ferait le QCM (memes 3 champs : id question, reponse texte,
// temps de reponse en secondes).
// ------------------------------------------------------------------
export interface DndValiderPayload {
  questionId:      number;
  reponse:         string;
  tempsReponseSec: number;
}

// ------------------------------------------------------------------
// Constantes du composant.
// ------------------------------------------------------------------

// Valeur speciale envoyee comme reponse quand le joueur passe la
// question. Le backend ne trouvera aucune correspondance avec la
// bonne reponse en base, donc verifierReponse() la marquera comme
// incorrecte (estCorrecte=false, scoreObtenu=0). Strictement la
// meme convention que le QCM (game.ts), pour rester coherent.
const VALEUR_PASSER = '__SKIPPED__';

// Duree (en ms) de l'effet visuel declenche au clavier avant que
// le drop programmatique ne soit emis. Trop court : le joueur ne
// voit pas la reaction visuelle. Trop long : le jeu parait lent.
// 300 ms est le sweet spot teste empiriquement.
const DELAI_ANIMATION_CLAVIER_MS = 300;

@Component({
  selector: 'app-game-dnd',
  // imports : on declare les directives CDK qu'on utilise dans le
  // template (composant standalone, pas de NgModule).
  imports: [CdkDrag, CdkDragPreview, CdkDropList],
  templateUrl: './game-dnd.html',
  styleUrl: './game-dnd.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDnd {
  // Service injecte qui lit le mapping admin dans localStorage.
  // On l'expose en private car seul ce composant a besoin de
  // consulter le store (le parent n'a aucun usage du DnD admin).
  private adminImagesStore = inject(AdminImagesStore);

  // ----------------------------------------------------------------
  // Inputs : donnees recues du parent.
  // input.required<T>() declare que cet input est obligatoire ;
  // Angular leve une erreur de compilation si le parent l'oublie.
  // ----------------------------------------------------------------

  // La question actuellement affichee (objet complet avec enonce
  // et choix possibles). Change a chaque transition de question.
  question = input.required<Question>();

  // Resultat recu du backend apres soumission. null = pas encore
  // de reponse soumise (joueur peut encore drag).
  reponseResult = input<ReponseResult | null>(null);

  // True pendant l'appel HTTP au backend : on bloque le drag pour
  // eviter qu'un joueur impatient lance plusieurs requetes.
  enAttenteServeur = input<boolean>(false);

  // Numero affiche de la question (1-based), pour la rétroaction
  // textuelle dans le template au-dessus de la zone DnD.
  numeroQuestion = input<number>(1);

  // Total de questions du niveau, meme usage qu'au-dessus.
  totalQuestions = input<number>(0);

  // ----------------------------------------------------------------
  // Outputs : evenements emis vers le parent.
  // output<T>() expose un .emit(value) typique des EventEmitter.
  // ----------------------------------------------------------------

  // Emis au moment du drop : transmet au parent les donnees
  // necessaires pour appeler l'API submitReponse.
  valider = output<DndValiderPayload>();

  // Emis au clic sur le bouton "Question suivante" affiche apres
  // la rétroaction. Le parent appelle son propre questionSuivante().
  questionSuivante = output<void>();

  // ----------------------------------------------------------------
  // Etat interne du composant (signals locaux, non partages).
  // ----------------------------------------------------------------

  // Nom du contenant sur lequel le joueur a deja drop le produit.
  // null = pas encore de drop. Sert a savoir quelle zone afficher
  // en succes ou echec apres reponse du serveur.
  contenantChoisi = signal<string | null>(null);

  // Nom du contenant sur lequel le pointeur survole pendant un drag.
  // Sert a appliquer une classe CSS de mise en valeur visuelle.
  contenantSurvole = signal<string | null>(null);

  // Nom du contenant pre-selectionne par le clavier. Pendant le bref
  // delai d'animation (cf DELAI_ANIMATION_CLAVIER_MS), la zone est
  // mise en surbrillance pour donner un retour visuel au joueur ;
  // le drop programmatique est ensuite declenche automatiquement.
  contenantPreSelectionne = signal<string | null>(null);

  // True quand le joueur a clique "Passer" ou appuye sur P. Sert a
  // distinguer (au moment de l'affichage du feedback) un vrai
  // drop sur la mauvaise zone d'un saut volontaire de la question :
  //   - Vrai drop faux : la zone choisie est en rouge, message
  //     "Mauvaise reponse".
  //   - Question passee : aucune zone en rouge (rien n'a ete drop),
  //     message "Question passee".
  aPasseQuestion = signal(false);

  // Instant precis (timestamp en ms depuis 1970) ou la question
  // courante a ete affichee. Sert a calculer tempsReponseSec lors
  // du drop. Reinitialise a chaque changement de question.
  private tempsDebutQuestion = Date.now();

  // ----------------------------------------------------------------
  // Constructeur : on y declare un effect() qui surveille la
  // question courante et reinitialise tout l'etat interne du DnD
  // chaque fois qu'une nouvelle question arrive (transition de
  // question, de niveau ou de mini-jeu).
  // ----------------------------------------------------------------
  constructor() {
    effect(() => {
      // Lecture du signal pour declarer la dependance ; on observe
      // l'id pour ne pas redeclencher si Angular reutilise par
      // hasard le meme objet question avec des champs modifies.
      const _id = this.question().id;

      // Reset de tous les signals d'etat pour repartir sur une
      // question fraiche (produit a nouveau en zone de depart, drag
      // possible, plus aucune zone marquee correcte ou fausse, plus
      // aucune pre-selection clavier en cours, plus aucun flag de
      // "question passee").
      this.contenantChoisi.set(null);
      this.contenantSurvole.set(null);
      this.contenantPreSelectionne.set(null);
      this.aPasseQuestion.set(false);
      // Redemarrage du chrono de la question : la duree de drag
      // sera calculee a partir de cet instant precis.
      this.tempsDebutQuestion = Date.now();
    });
  }

  // ----------------------------------------------------------------
  // Proprietes calculees : recalculees automatiquement quand un
  // signal lu a l'interieur change.
  // ----------------------------------------------------------------

  // Chemin du SVG du produit a faire glisser. Renvoie une chaine
  // vide si la question n'est pas dans le mapping (placeholder
  // texte affiche cote template via @if).
  // L'eventuel mapping enregistre par l'admin via le dashboard
  // (lu dans localStorage) est prioritaire sur la table en dur.
  produitImage = computed(() => {
    const q       = this.question();
    const apercu  = this.adminImagesStore.getImagesPourQuestion(q.id);
    const images  = getImagesForQuestion(q.enonce, q.id, apercu);
    return images?.produit ?? '';
  });

  // Nom textuel court du produit, extrait de l'enonce :
  // "Dans quel contenant met-on du Dentifrice ?" -> "Dentifrice".
  // On affiche ce label sous le SVG pour les lecteurs d'ecran et
  // pour les questions dont le SVG ne s'est pas charge.
  produitNom = computed(() => {
    // L'enonce suit toujours le meme schema : on coupe entre "met-on"
    // et le " ?" final pour extraire le nom du produit. Si jamais
    // le format change, on retombe sur l'enonce complet en fallback.
    const enonce = this.question().enonce;
    const match  = enonce.match(/met-on\s+(?:du |un |de la |de l['’]|une )?(.+?)\s*\?/i);
    return match ? match[1].trim() : enonce;
  });

  // True si le joueur peut encore drag : pas de resultat affiche
  // (sinon la question est figee) ET pas d'attente serveur en cours
  // ET la question n'a pas deja ete passee (cas Passer).
  peutDrag = computed(() =>
    this.reponseResult() === null
    && !this.enAttenteServeur()
    && !this.aPasseQuestion()
  );

  // True si le joueur peut encore interagir avec le DnD via N'IMPORTE
  // QUEL canal d'entree (souris, doigt OU clavier). Sert de garde-fou
  // unique pour les handlers passer(), preSelectionnerEtValider() et
  // les raccourcis clavier afin d'eviter une double action si une
  // entree est deja en cours de traitement.
  peutInteragir = computed(() =>
    this.reponseResult() === null
    && !this.enAttenteServeur()
    && !this.aPasseQuestion()
    && this.contenantChoisi() === null
    && this.contenantPreSelectionne() === null
  );

  // Message a afficher dans le bandeau de feedback apres reponse.
  // Calcule en fonction des trois cas possibles :
  //   1. Bonne reponse : on affiche le nombre de points gagnes.
  //   2. Question passee : on revele la bonne reponse, sans pointer
  //      du doigt une mauvaise reponse choisie.
  //   3. Mauvaise reponse classique : on revele la bonne reponse en
  //      indiquant qu'il y a eu erreur.
  messageFeedback = computed(() => {
    const result = this.reponseResult();
    if (result === null) return '';
    if (result.correct) {
      return `Bonne réponse. +${result.score_obtenu} point(s)`;
    }
    if (this.aPasseQuestion()) {
      return `Question passée. La bonne réponse était : ${result.bonne_reponse}`;
    }
    return `Mauvaise réponse. La bonne réponse était : ${result.bonne_reponse}`;
  });

  // Liste des ids des 4 zones cibles, recalculee depuis les choix
  // possibles. Sert a connecter la liste source aux 4 listes cibles
  // via cdkDropListConnectedTo (sinon le drop ne serait pas autorise).
  idsCibles = computed(() =>
    this.question().choix_possibles.map((_, index) => `dnd-zone-${index}`)
  );

  // ----------------------------------------------------------------
  // Helpers utilises depuis le template pour decider quelle image
  // afficher dans une zone donnee selon l'etat (avant drop, apres
  // bonne reponse, apres mauvaise reponse).
  // ----------------------------------------------------------------

  // Retourne le chemin du SVG a afficher pour une zone donnee.
  // - Avant drop : SVG normal du contenant.
  // - Apres bonne reponse, sur la zone choisie : SVG de succes
  //   (produit dans le contenant + coche).
  // - Apres mauvaise reponse, sur la zone choisie : SVG d'echec.
  // - Sur les autres zones : toujours le SVG normal du contenant.
  imageDeZone(nomContenant: string): string {
    const result = this.reponseResult();
    // Cas particuliers uniquement si on a deja un resultat ET que
    // c'est la zone qui a recu le drop.
    if (result !== null && this.contenantChoisi() === nomContenant) {
      if (result.correct) {
        // Bonne reponse : on prend l'image de succes specifique a
        // la question (produit + contenant + coche verte). On
        // consulte d'abord le store admin pour eviter d'afficher
        // l'image standard si l'admin a defini un visuel specifique.
        const q       = this.question();
        const apercu  = this.adminImagesStore.getImagesPourQuestion(q.id);
        const images  = getImagesForQuestion(q.enonce, q.id, apercu);
        return images?.succes ?? this.imageContenantSeul(nomContenant);
      }
      // Mauvaise reponse : image generique d'echec (croix rouge).
      return ECHEC_IMAGE;
    }
    // Cas par defaut (avant drop ou zone non choisie) : SVG normal.
    return this.imageContenantSeul(nomContenant);
  }

  // Helper interne : SVG neutre du contenant. Retourne une chaine
  // vide si le mapping n'a pas d'entree pour ce nom (placeholder
  // texte cote template via @if).
  private imageContenantSeul(nomContenant: string): string {
    return getContenantImage(nomContenant) ?? '';
  }

  // True si la zone passee en parametre est celle de la bonne
  // reponse, et qu'on a deja recu le resultat. Sert a appliquer
  // la bordure verte sur la bonne zone (a la fois pour valoriser
  // un succes et pour reveler la bonne reponse en cas d'echec).
  estBonneReponse(nomContenant: string): boolean {
    const result = this.reponseResult();
    if (result === null) return false;
    return nomContenant === result.bonne_reponse;
  }

  // True uniquement pour la zone choisie en cas de mauvaise
  // reponse : sert a appliquer la bordure rouge specifique.
  estMauvaiseReponseChoisie(nomContenant: string): boolean {
    const result = this.reponseResult();
    if (result === null) return false;
    return this.contenantChoisi() === nomContenant && !result.correct;
  }

  // ----------------------------------------------------------------
  // Handler du drop : appele par cdkDropListDropped sur la zone
  // qui a recu le produit. Calcule le temps de reponse et emet
  // l'evenement valider vers le parent.
  // ----------------------------------------------------------------
  onDrop(nomContenant: string): void {
    // Garde-fou : si on a deja drop ou si on attend le serveur,
    // on ignore (impossible normalement car cdkDragDisabled=true,
    // mais on double la securite cote logique).
    if (this.contenantChoisi() !== null || this.enAttenteServeur()) {
      return;
    }
    // Memorise la zone choisie pour l'affichage de la rétroaction.
    this.contenantChoisi.set(nomContenant);
    this.contenantSurvole.set(null);
    // Calcule la duree en secondes entre l'affichage de la question
    // et le moment du drop (Math.round pour arrondir au plus proche).
    const tempsReponseSec = Math.round(
      (Date.now() - this.tempsDebutQuestion) / 1000
    );
    // Emet l'evenement vers le parent avec les 3 champs attendus
    // par l'API submitReponse, exactement comme le QCM.
    this.valider.emit({
      questionId:      this.question().id,
      reponse:         nomContenant,
      tempsReponseSec,
    });
  }

  // ----------------------------------------------------------------
  // Handler du clic sur "Question suivante", visible uniquement
  // apres affichage de la rétroaction. Delegue au parent qui
  // gere la logique de transition (question/niveau/mini-jeu).
  // ----------------------------------------------------------------
  surQuestionSuivante(): void {
    this.questionSuivante.emit();
  }

  // ----------------------------------------------------------------
  // Handlers de survol (drag passant au-dessus d'une zone). Servent
  // uniquement a appliquer une classe CSS de mise en valeur, pour
  // que le joueur sache visuellement qu'il survole une zone valide.
  // ----------------------------------------------------------------
  surEntreeZone(nomContenant: string): void {
    this.contenantSurvole.set(nomContenant);
  }

  surSortieZone(): void {
    this.contenantSurvole.set(null);
  }

  // ================================================================
  // BOUTON / RACCOURCI "PASSER"
  //
  // Equivalent fonctionnel du bouton Passer du QCM : envoie au backend
  // la valeur speciale __SKIPPED__, ce qui marque la question comme
  // incorrecte (0 point) et revele la bonne reponse pour apprendre,
  // sans bloquer le joueur sur une question dont il n'a aucune idee.
  // ================================================================

  /**
   * Soumet la reponse speciale __SKIPPED__ pour passer la question
   * en cours. Calcule le temps de reponse comme un drop normal et
   * positionne le flag aPasseQuestion pour que le rendu du feedback
   * n'affiche aucune zone en rouge (rien n'a vraiment ete drop).
   */
  passer(): void {
    // Garde-fou unique : on n'agit que si toutes les conditions
    // d'interaction sont reunies (pas en cours de drop, pas en
    // attente serveur, pas deja en cours d'animation clavier...).
    if (!this.peutInteragir()) return;

    // Memorise qu'on est dans le cas "question passee" : utilise par
    // le computed messageFeedback() pour adapter le texte affiche.
    this.aPasseQuestion.set(true);

    // Calcule la duree depuis l'affichage de la question (cohesion
    // avec le calcul fait dans onDrop pour un drop normal).
    const tempsReponseSec = Math.round(
      (Date.now() - this.tempsDebutQuestion) / 1000
    );

    // Emet l'evenement vers le parent qui appellera l'API. Le backend
    // marquera la reponse comme incorrecte (cf verifierReponse dans
    // Reponse.php) sans qu'on ait a coder un endpoint dedie au "skip".
    this.valider.emit({
      questionId:      this.question().id,
      reponse:         VALEUR_PASSER,
      tempsReponseSec,
    });
  }

  // ================================================================
  // RACCOURCIS CLAVIER 1-4 : ANIMATION + DROP PROGRAMMATIQUE
  //
  // Quand le joueur appuie sur 1, 2, 3 ou 4 : on declenche une mini
  // animation visuelle de pre-selection sur la zone correspondante
  // (highlight rose, leger scale up). Au bout de la duree d'animation
  // on appelle onDrop() qui se comporte exactement comme si l'utilisa-
  // teur avait drop le produit a la souris ou au doigt.
  //
  // Avantage : un parcours "tout clavier" reste possible (accessibilite
  // et joueurs rapides) tout en conservant la coherence visuelle d'un
  // veritable drag and drop.
  // ================================================================

  /**
   * Pre-selectionne une zone via clavier puis declenche le drop
   * programmatique apres une courte animation visuelle.
   *
   * @param index Position 0-based dans choix_possibles (touche 1 -> 0,
   *              touche 2 -> 1, etc.). Une valeur hors plage est
   *              ignoree silencieusement (cas peu probable, mais on
   *              evite de faire planter le composant).
   */
  preSelectionnerEtValider(index: number): void {
    // Garde-fou interaction (memes conditions que pour passer()).
    if (!this.peutInteragir()) return;

    // Lit le nom du contenant correspondant a la touche pressee.
    // L'operateur d'acces tableau renvoie undefined si l'index est
    // hors plage (par exemple si une question avait moins de 4 choix,
    // ce qui n'arrive pas dans le fixture mais reste possible apres
    // ajout par l'admin).
    const choix = this.question().choix_possibles[index];
    if (choix === undefined) return;

    // Active la mise en surbrillance de la zone cible : le template
    // applique la classe .pre-selectionnee qui declenche l'animation
    // CSS (scale up + bordure rose) le temps de l'animation.
    this.contenantPreSelectionne.set(choix);

    // setTimeout : differe l'execution de la fonction donnee de N ms.
    // On declenche le drop programmatique apres l'animation pour que
    // le joueur ait le temps de voir la mise en surbrillance avant
    // que la rétroaction n'apparaisse.
    setTimeout(() => {
      // Verification de coherence : si entre-temps une autre touche
      // a ete pressee (cas peu probable mais possible si le joueur
      // tape vite), la pre-selection a deja change. On n'execute le
      // drop que si la pre-selection courante correspond toujours.
      if (this.contenantPreSelectionne() === choix) {
        // onDrop reset contenantPreSelectionne via contenantChoisi.set,
        // donc pas besoin de reinitialiser explicitement ici.
        this.onDrop(choix);
      }
    }, DELAI_ANIMATION_CLAVIER_MS);
  }

  // ================================================================
  // ECOUTE GLOBALE DU CLAVIER POUR LE DnD
  //
  // @HostListener('window:keydown') : Angular branche cette methode
  // sur l'evenement keydown au niveau de la fenetre du navigateur.
  // Comme le composant n'est instancie qu'en mode DnD, l'ecouteur
  // est automatiquement actif/inactif au bon moment (Angular le
  // detache quand le composant est detruit).
  //
  // Le parent (Game) court-circuite deja sa propre methode
  // gererTouche() en mode DnD via son garde-fou estDragAndDrop(),
  // donc il n'y a pas de double interception possible.
  // ================================================================

  /**
   * Methode unique appelee a chaque appui de touche au niveau de la
   * fenetre. Aiguille vers le bon comportement selon la touche :
   *   - 1, 2, 3, 4 : pre-selectionne et valide la zone correspondante.
   *   - Entree    : declenche "Question suivante" si la rétroaction
   *                 est affichee (sinon ne fait rien : un appui sur
   *                 1-4 declenche deja le drop, donc Entree avant
   *                 reponse n'a pas d'usage particulier ici).
   *   - P         : passe la question (equivalent du QCM).
   *
   * @param event Evenement clavier emis par le navigateur. event.key
   *              contient la touche pressee sous forme de chaine.
   */
  @HostListener('window:keydown', ['$event'])
  gererToucheClavier(event: KeyboardEvent): void {
    // Si le focus est dans un champ texte (cas peu probable sur la
    // page game mais reste de la defense en profondeur), on ne
    // capte pas la touche pour ne pas perturber la saisie.
    const cible = event.target;
    if (cible instanceof HTMLInputElement || cible instanceof HTMLTextAreaElement) {
      return;
    }

    // Recuperation de la touche dans une variable locale pour lisibilite.
    const touche = event.key;

    // ---- Cas 1 : touches 1, 2, 3 ou 4 ----
    if (touche === '1' || touche === '2' || touche === '3' || touche === '4') {
      // parseInt(touche, 10) convertit la chaine en entier base 10.
      // Le -1 transforme la position 1-based vue par le joueur en
      // index 0-based utilise dans le tableau JavaScript.
      const index = parseInt(touche, 10) - 1;
      this.preSelectionnerEtValider(index);
      return;
    }

    // ---- Cas 2 : touche Entree ----
    if (touche === 'Enter') {
      // preventDefault() bloque le comportement par defaut du
      // navigateur (par exemple le re-clic sur le dernier bouton
      // qui aurait garde le focus).
      event.preventDefault();
      // Entree apres la rétroaction : on passe a la question suivante.
      // Avant la rétroaction, Entree n'a pas de sens en DnD car les
      // touches 1-4 declenchent deja la validation directement.
      if (this.reponseResult() !== null) {
        this.surQuestionSuivante();
      }
      return;
    }

    // ---- Cas 3 : touche P (majuscule ou minuscule) ----
    if (touche === 'p' || touche === 'P') {
      this.passer();
      return;
    }
  }
}
