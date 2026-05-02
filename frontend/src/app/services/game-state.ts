// Ce fichier est un "service partagé" : il stocke les données de la partie en cours.
// Contrairement aux composants, un service existe en UNE SEULE instance dans toute l'appli.
// Toutes les pages (pseudo, game, result) lisent et écrivent ici pour partager l'état.
// Les "signals" sont la façon moderne d'Angular de stocker des données réactives :
// quand on modifie un signal, tous les composants qui l'utilisent se mettent à jour.

import { Injectable, signal } from '@angular/core';

// On importe les types de données définis dans models/interfaces.ts
import { Joueur, MiniJeu, Partie } from '../models/interfaces';

// @Injectable({ providedIn: 'root' }) = ce service est disponible partout dans l'app
// et il n'en existe qu'une seule copie (singleton = une seule instance partagée)
@Injectable({
  providedIn: 'root',
})
export class GameState {
  // ------------------------------------------------------------------
  // Données du joueur
  // signal<Joueur | null>(null) = au départ null, sera rempli après saisie du pseudo
  // ------------------------------------------------------------------

  /** Le joueur connecté. null si personne n'a encore saisi de pseudo. */
  joueur = signal<Joueur | null>(null);

  // ------------------------------------------------------------------
  // Données de la partie en cours
  // ------------------------------------------------------------------

  /** La partie en cours. null si aucune partie n'a été créée. */
  partie = signal<Partie | null>(null);

  // ------------------------------------------------------------------
  // Liste des mini-jeux disponibles (chargée depuis le backend)
  // ------------------------------------------------------------------

  /** Tableau des 3 mini-jeux : ingredient_produit, produit_contenant, action_pole */
  miniJeux = signal<MiniJeu[]>([]);

  // ------------------------------------------------------------------
  // Score en temps réel
  // Mis à jour après chaque réponse depuis ReponseResult.score_total_partie
  // ------------------------------------------------------------------

  /** Score total actuel du joueur dans cette partie. */
  score = signal<number>(0);

  // ------------------------------------------------------------------
  // Résultat final (après appel à terminerPartie)
  // ------------------------------------------------------------------

  /** Score final enregistré lors de la fin de partie (pour la page résultats). */
  scoreFinal = signal<number>(0);

  // AMÉLIORATION (ajoutée après la version de base) : score max dynamique.
  // Avant, le frontend supposait toujours 90 points maximum (3 mini-jeux × 30).
  // Désormais, le backend renvoie le vrai score maximum atteignable pour la
  // partie (calculé sur les questions réellement posées). On le stocke ici
  // pour que la page résultats puisse calculer le pourcentage correctement,
  // même si l'administrateur ajoute ou supprime des questions plus tard.
  /** Score maximum atteignable pour la partie (renvoyé par le backend). */
  scoreMaxFinal = signal<number>(0);

  /** Nombre total de réponses soumises dans la partie. */
  nbReponses = signal<number>(0);

  // ------------------------------------------------------------------
  // Méthode de réinitialisation
  // Appelée quand le joueur clique "Rejouer" pour repartir à zéro
  // ------------------------------------------------------------------

  /**
   * Remet tous les signals à leur valeur initiale.
   * Permet de recommencer une nouvelle partie proprement.
   */
  reset(): void {
    this.joueur.set(null);
    this.partie.set(null);
    this.miniJeux.set([]);
    this.score.set(0);
    this.scoreFinal.set(0);
    this.scoreMaxFinal.set(0);
    this.nbReponses.set(0);
  }
}
