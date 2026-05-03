// Service de stockage local des images choisies par l'admin pour les
// questions du mini-jeu DnD (produit -> contenant).
//
// Pourquoi un service dedie : on ne veut pas modifier le backend ni
// la table question. Les choix d'images faits depuis le dashboard
// sont donc persistes uniquement cote navigateur, dans localStorage.
// Cela suffit pour la soutenance et la maquette du jeu, mais
// implique que les images ne sont visibles que sur le poste ou
// l'admin a saisi la question (limitation documentee dans le bandeau
// d'information du dashboard).
//
// Format stocke (chaine JSON sous la cle CLE_STOCKAGE) :
//   {
//     "<id_question>": { "produit": "...", "succes": "..." },
//     ...
//   }

import { Injectable } from '@angular/core';

// Forme du couple d'images associe a une question. On reprend la
// meme forme que QuestionImages (data/question-images-mapping.ts)
// pour rester compatible avec la fonction getImagesForQuestion.
export interface ImagesPourQuestion {
  produit: string;
  succes: string;
}

// Forme de l'objet complet (toutes les questions) tel que stocke.
// On utilise une chaine comme cle car JSON.parse renvoie toujours
// des cles d'objet sous forme de string, meme si on a ecrit un nombre.
type MappingComplet = Record<string, ImagesPourQuestion>;

// Cle utilisee dans localStorage. On la prefixe pour eviter les
// collisions avec d'autres applications qui partageraient le meme
// domaine (ex: en mode dev, plusieurs projets sur localhost:4200).
const CLE_STOCKAGE = 'welab_admin_question_images';

// providedIn: 'root' : un seul exemplaire de ce service partage par
// toute l'application (singleton). Pas de constructeur necessaire :
// on n'a aucune dependance a injecter, on parle directement a l'API
// localStorage du navigateur.
@Injectable({
  providedIn: 'root',
})
export class AdminImagesStore {

  /**
   * Lit le mapping global depuis localStorage. Tolere une cle absente
   * (renvoie alors un objet vide) et un contenu corrompu (try/catch
   * autour de JSON.parse pour eviter de planter l'application si
   * un autre script a ecrit n'importe quoi sous cette cle).
   *
   * Methode interne : seuls les helpers publics ci-dessous sont
   * censes appeler cette fonction.
   */
  private lire(): MappingComplet {
    // Lecture brute de la chaine stockee. Si la cle n'a jamais ete
    // ecrite, getItem renvoie null, ce que l'on traite comme un
    // mapping vide pour ne pas avoir a doubler les tests par la suite.
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut === null) {
      return {};
    }
    try {
      // JSON.parse peut lever SyntaxError si la chaine n'est pas du
      // JSON valide. Dans ce cas on prefere repartir d'un mapping
      // vide plutot que de bloquer le composant qui appelle.
      const parse = JSON.parse(brut);
      // Defense en profondeur : si la valeur stockee n'est pas un
      // objet (ex: un tableau ou un nombre brut suite a une erreur),
      // on l'ignore aussi.
      if (parse !== null && typeof parse === 'object' && !Array.isArray(parse)) {
        return parse as MappingComplet;
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Ecrit le mapping global dans localStorage. Methode interne
   * appelee par set/remove. JSON.stringify echoue tres rarement
   * (par exemple sur une reference circulaire), mais comme on
   * construit nous-memes les objets a partir de chaines, on ne
   * gere pas ce cas particulier ici.
   */
  private ecrire(mapping: MappingComplet): void {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(mapping));
  }

  /**
   * Renvoie le couple d'images associe a une question donnee, ou
   * null si l'admin n'a defini aucune image pour cette question.
   * C'est ce que le composant DnD appelle au moment de l'affichage.
   */
  getImagesPourQuestion(questionId: number): ImagesPourQuestion | null {
    const mapping = this.lire();
    // L'operateur "?? null" garantit qu'on renvoie null (et non
    // undefined) si la cle n'existe pas. Ca rend l'API plus simple
    // a utiliser cote appelant (un seul cas a tester).
    return mapping[String(questionId)] ?? null;
  }

  /**
   * Enregistre ou met a jour le couple d'images pour une question.
   * Conserve toutes les autres entrees du mapping intactes (operateur
   * de spread). Surecrit silencieusement une eventuelle entree
   * existante pour ce questionId.
   */
  setImagesPourQuestion(questionId: number, produit: string, succes: string): void {
    const mapping = this.lire();
    mapping[String(questionId)] = { produit, succes };
    this.ecrire(mapping);
  }

  /**
   * Supprime l'entree associee a une question. Utile lors d'une
   * suppression de question dans le dashboard ou si l'admin
   * choisit "Aucune image" dans les menus deroulants pour faire
   * retomber l'affichage sur le placeholder texte.
   */
  removeImagesPourQuestion(questionId: number): void {
    const mapping = this.lire();
    // delete ne fait rien si la cle n'existe pas, donc on n'a pas
    // besoin de tester son existence prealablement.
    delete mapping[String(questionId)];
    this.ecrire(mapping);
  }

  /**
   * Renvoie une copie complete du mapping courant. Pratique pour
   * d'eventuels outils de debogage ou pour l'export futur des
   * choix admin. Pas utilise directement par le DnD, mais inclus
   * dans l'API publique pour rester coherent avec le besoin.
   */
  getAllMappings(): MappingComplet {
    return this.lire();
  }
}
