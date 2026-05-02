// Tableau de bord d'administration : liste des questions et formulaire CRUD.
//
// Au chargement, le composant recupere en parallele :
//   - l'identite de l'admin connecte (pour l'afficher dans l'en-tete)
//   - la liste des mini-jeux (pour le menu deroulant du formulaire)
//   - la liste des questions existantes (affichees dans le tableau)
//
// Permet ensuite de :
//   - ajouter une nouvelle question (formulaire en haut de page)
//   - modifier une question existante (memes champs, prerempli)
//   - supprimer une question apres confirmation
//   - se deconnecter (suppression du jeton + retour au login)

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
// forkJoin = operateur RxJS qui execute plusieurs Observables en parallele
// et n'emet qu'une seule valeur quand TOUS sont termines (pratique pour
// charger plusieurs choses au demarrage et n'afficher la page qu'une
// fois l'ensemble pret).
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth';
import { ApiAdmin }    from '../../services/api-admin';
import {
  QuestionAdmin,
  QuestionAdminPayload,
  MiniJeuAdmin,
} from '../../models/admin-interfaces';

@Component({
  selector: 'app-admin-dashboard',
  // FormsModule : necessaire pour le binding [ngModel] des champs du
  // formulaire d'ajout / modification.
  imports: [FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  // ---- Services injectes via inject() (syntaxe Angular 14+) ----
  private auth     = inject(AuthService);
  private apiAdmin = inject(ApiAdmin);
  private router   = inject(Router);

  // ============================================================
  // Etat global de la page
  // ============================================================
  // signal(valeurInitiale) : variable reactive Angular. Quand on appelle
  // signal.set(...) ou signal.update(...), Angular re-rend les portions
  // de template qui appellent ".x()". Lecture : "questions()".
  // signal<Type>(...) : on peut typer explicitement le contenu lorsque
  // TypeScript ne peut pas le deduire de la valeur initiale.
  questions     = signal<QuestionAdmin[]>([]);
  miniJeux      = signal<MiniJeuAdmin[]>([]);
  adminEmail    = signal('');
  loading       = signal(true);
  erreurGlobale = signal('');

  // ============================================================
  // Etat du formulaire d'ajout / modification
  // ============================================================
  formOuvert        = signal(false);
  // null    => mode "ajout" (creation d'une nouvelle question)
  // sinon   => mode "modification" sur la question stockee dans le signal
  questionEnEdition = signal<QuestionAdmin | null>(null);

  // Champs du formulaire, sous forme de signals individuels (un par champ
  // pour faciliter le binding [ngModel] dans le template).
  enonce         = signal('');
  bonneReponse   = signal('');
  difficulte     = signal<number>(1);            // 1 = facile par defaut
  miniJeuId      = signal<number | null>(null);
  choix1         = signal('');
  choix2         = signal('');
  choix3         = signal('');
  choix4         = signal('');
  erreurForm     = signal('');
  enregistrement = signal(false);  // vrai pendant l'appel POST/PUT

  // Le constructor n'a pas de parametres (les services sont recuperes
  // via inject() ci-dessus). On s'en sert juste pour declencher le
  // chargement initial des donnees au moment ou Angular cree le composant.
  constructor() {
    this.chargerToutesLesDonnees();
  }

  /**
   * Lance les 3 appels initiaux EN PARALLELE : identite admin, liste des
   * mini-jeux, liste des questions. Quand les 3 sont termines, on remplit
   * les signals correspondants et on enleve l'indicateur de chargement.
   */
  private chargerToutesLesDonnees(): void {
    this.loading.set(true);
    this.erreurGlobale.set('');

    // forkJoin({ a, b, c }) : attend que les 3 Observables aient chacun
    // emis leur premiere valeur, puis emet un seul objet { a, b, c }
    // contenant les 3 resultats. Si l'un echoue, le bloc "error" du
    // subscribe est appele et les autres reponses sont ignorees.
    forkJoin({
      me:        this.apiAdmin.getMe(),
      miniJeux:  this.apiAdmin.getMiniJeux(),
      questions: this.apiAdmin.getQuestions(),
    }).subscribe({
      next: ({ me, miniJeux, questions }) => {
        this.adminEmail.set(me.email);
        this.miniJeux.set(miniJeux);
        this.questions.set(questions);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // Le 401 est deja gere globalement par l'intercepteur HTTP
        // (deconnexion + redirection vers /admin/login). On affiche un
        // message uniquement pour les autres erreurs.
        if (err.status !== 401) {
          this.erreurGlobale.set('Impossible de charger les donnees. Veuillez reessayer.');
        }
      },
    });
  }

  /**
   * Recharge uniquement la liste des questions (apres ajout / modif /
   * suppression). Plus rapide que de tout recharger avec forkJoin.
   */
  private rechargerQuestions(): void {
    this.apiAdmin.getQuestions().subscribe({
      next: q => this.questions.set(q),
      error: (err: HttpErrorResponse) => {
        if (err.status !== 401) {
          this.erreurGlobale.set('Impossible de recharger la liste.');
        }
      },
    });
  }

  /**
   * Ouvre le formulaire en mode "ajout" : tous les champs sont vides.
   * Le mini-jeu est preselectionne sur le premier de la liste pour
   * eviter d'avoir un select sur "rien".
   */
  ouvrirAjout(): void {
    this.questionEnEdition.set(null);
    this.enonce.set('');
    this.bonneReponse.set('');
    this.difficulte.set(1);
    const mjs = this.miniJeux();
    // L'expression "mjs.length > 0 ? mjs[0].id : null" est un ternaire
    // qui choisit la valeur a affecter selon la condition. Equivalent
    // a un if/else mais utilisable comme une expression unique.
    this.miniJeuId.set(mjs.length > 0 ? mjs[0].id : null);
    this.choix1.set('');
    this.choix2.set('');
    this.choix3.set('');
    this.choix4.set('');
    this.erreurForm.set('');
    this.formOuvert.set(true);
  }

  /**
   * Ouvre le formulaire en mode "modification" : champs preremplis avec
   * les valeurs actuelles de la question. Si la question contient moins
   * de 4 choix, les champs surnumeraires restent vides ; si elle en
   * contient plus, on ne garde que les 4 premiers (le formulaire ne
   * gere actuellement que 4 choix maximum).
   */
  ouvrirModif(q: QuestionAdmin): void {
    this.questionEnEdition.set(q);
    this.enonce.set(q.enonce);
    this.bonneReponse.set(q.elementADeviner);
    this.difficulte.set(q.difficulte);
    this.miniJeuId.set(q.miniJeuId);
    // L'operateur "??" (null coalescing) renvoie la valeur de gauche, ou
    // la valeur de droite si la gauche est null/undefined. Permet de
    // remplir un champ par chaine vide quand le tableau choixPossibles
    // a moins de 4 elements (sinon on lirait "undefined" comme valeur).
    this.choix1.set(q.choixPossibles[0] ?? '');
    this.choix2.set(q.choixPossibles[1] ?? '');
    this.choix3.set(q.choixPossibles[2] ?? '');
    this.choix4.set(q.choixPossibles[3] ?? '');
    this.erreurForm.set('');
    this.formOuvert.set(true);
  }

  /**
   * Ferme le formulaire et oublie toute saisie en cours (les signals
   * sont remis a vide a la prochaine ouverture).
   */
  fermer(): void {
    this.formOuvert.set(false);
    this.questionEnEdition.set(null);
    this.erreurForm.set('');
  }

  /**
   * Valide la saisie puis envoie au backend : POST si ajout, PUT si
   * modification. En cas de succes : recharge la liste, ferme le
   * formulaire. En cas d'erreur 400 : affiche le message renvoye par
   * le serveur (qui est tres precis sur la regle violee).
   */
  enregistrer(): void {
    // ---- 1) Validation cote client (avant de partir sur le reseau) ----
    const enonce       = this.enonce().trim();
    const bonneReponse = this.bonneReponse().trim();
    // .map(...) cree un nouveau tableau en appliquant la fonction a
    // chaque element. Ici on nettoie les espaces de chaque choix.
    const choix        = [this.choix1(), this.choix2(), this.choix3(), this.choix4()]
      .map(c => c.trim());
    const miniJeuId    = this.miniJeuId();

    if (!enonce) {
      this.erreurForm.set('L\'enonce est obligatoire.');
      return;
    }
    if (!bonneReponse) {
      this.erreurForm.set('La bonne reponse est obligatoire.');
      return;
    }
    // Array.some(predicat) : retourne true si au moins un element du
    // tableau satisfait le predicat. Ici : "au moins un choix vide".
    if (choix.some(c => !c)) {
      this.erreurForm.set('Les 4 choix proposes doivent etre renseignes.');
      return;
    }
    if (miniJeuId === null) {
      this.erreurForm.set('Veuillez selectionner un mini-jeu.');
      return;
    }
    // Regle metier (egalement controlee cote serveur) : la bonne
    // reponse doit figurer EXACTEMENT parmi les 4 choix proposes,
    // sinon la question serait insoluble pour le joueur.
    // Array.includes(valeur) : retourne true si la valeur est presente
    // dans le tableau (comparaison stricte).
    if (!choix.includes(bonneReponse)) {
      this.erreurForm.set('La bonne reponse doit etre presente parmi les 4 choix proposes.');
      return;
    }

    // ---- 2) Construction du payload exactement comme l'attend le backend ----
    const payload: QuestionAdminPayload = {
      enonce,
      elementADeviner: bonneReponse,
      difficulte: this.difficulte(),
      choixPossibles: choix,
      miniJeuId,
    };

    this.enregistrement.set(true);
    this.erreurForm.set('');

    // ---- 3) Choix POST / PUT selon le mode (ajout ou modification) ----
    const enEdition = this.questionEnEdition();
    // Ternaire : si enEdition existe, on appelle update, sinon create.
    // Les deux retournent le meme type d'Observable, donc on peut
    // factoriser le subscribe juste apres.
    const requete = enEdition
      ? this.apiAdmin.updateQuestion(enEdition.id, payload)
      : this.apiAdmin.createQuestion(payload);

    requete.subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.fermer();
        this.rechargerQuestions();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrement.set(false);
        // Le serveur renvoie { error: "..." } en cas de validation
        // echouee. On affiche son message tel quel (il est en francais).
        // L'operateur "?." (optional chaining) renvoie undefined si
        // l'objet a gauche est null/undefined, au lieu de declencher
        // une erreur d'acces a une propriete sur null.
        if (err.status === 400 && err.error?.error) {
          this.erreurForm.set(err.error.error);
        } else if (err.status !== 401) {
          this.erreurForm.set('Erreur lors de l\'enregistrement.');
        }
      },
    });
  }

  /**
   * Supprime une question apres confirmation utilisateur.
   * En cas de succes : on recharge la liste pour faire disparaitre la
   * ligne supprimee. Si le serveur repond 404 (question deja effacee),
   * on rafraichit silencieusement la liste sans afficher d'erreur.
   */
  supprimer(q: QuestionAdmin): void {
    // window.confirm(texte) : ouvre une popup native du navigateur avec
    // les boutons OK / Annuler. Retourne true si l'utilisateur clique
    // OK, false sinon. Bloquant : le code suivant n'est execute qu'une
    // fois la popup fermee.
    const ok = window.confirm(`Supprimer definitivement la question :\n"${q.enonce}" ?`);
    if (!ok) {
      return;
    }
    this.apiAdmin.deleteQuestion(q.id).subscribe({
      next: () => this.rechargerQuestions(),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.rechargerQuestions();
        } else if (err.status !== 401) {
          this.erreurGlobale.set('Erreur lors de la suppression.');
        }
      },
    });
  }

  /**
   * Deconnexion : suppression du jeton localStorage + retour a la page
   * de connexion. Aucun appel reseau (la deconnexion JWT est cote client).
   */
  deconnexion(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }

  /**
   * Helper utilise par le template pour afficher un libelle texte de la
   * difficulte (1 -> "Facile", 2 -> "Moyen", 3 -> "Difficile").
   */
  libelleDifficulte(d: number): string {
    if (d === 1) return 'Facile';
    if (d === 2) return 'Moyen';
    return 'Difficile';
  }
}
