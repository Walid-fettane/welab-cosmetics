// Ce fichier est le service de communication avec le backend Symfony.
// Il contient toutes les fonctions qui envoient ou recoivent des donnees via HTTP.
// "Service" en Angular = une classe partagee par tous les composants du projet.
// Le proxy (proxy.conf.json) redirige automatiquement /api/* vers http://localhost:8000.

import { inject, Injectable } from '@angular/core';
// HttpClient est l'outil Angular pour faire des requetes HTTP (GET, POST, PATCH...)
import { HttpClient } from '@angular/common/http';
// Observable = un flux de donnees asynchrone : on "s'abonne" pour recevoir la reponse
import { Observable } from 'rxjs';

// On importe les interfaces qui decrivent la forme des donnees attendues
import {
  Joueur,
  MiniJeu,
  Partie,
  Question,
  ReponseResult,
  PartieResult,
} from '../models/interfaces';

// @Injectable({ providedIn: 'root' }) signifie qu'il n'existe qu'une seule instance
// de ce service dans toute l'application (singleton), disponible partout
@Injectable({
  providedIn: 'root',
})
export class Api {
  // inject(HttpClient) est la facon moderne en Angular d'obtenir le service HttpClient
  // Sans avoir besoin d'un constructeur, Angular le fournit automatiquement
  private http = inject(HttpClient);

  // URL de base de l'API. Le proxy redirige /api vers http://localhost:8000/api
  private readonly apiUrl = '/api';

  /**
   * Cree un nouveau joueur ou recupere un joueur existant par son pseudo.
   * Envoie un POST /api/joueurs avec { pseudo } dans le corps de la requete.
   * Retourne un Observable<Joueur> : les donnees du joueur cree/trouve.
   */
  createJoueur(pseudo: string): Observable<Joueur> {
    // On envoie le pseudo dans un objet JSON au backend
    return this.http.post<Joueur>(`${this.apiUrl}/joueurs`, { pseudo });
  }

  /**
   * Recupere la liste de tous les mini-jeux disponibles.
   * Envoie un GET /api/mini-jeux sans parametre.
   * Retourne un Observable<MiniJeu[]> : un tableau de tous les mini-jeux.
   */
  getMiniJeux(): Observable<MiniJeu[]> {
    return this.http.get<MiniJeu[]>(`${this.apiUrl}/mini-jeux`);
  }

  /**
   * Demarre une nouvelle partie pour un joueur.
   * Envoie un POST /api/parties avec { joueur_id } dans le corps.
   * Retourne un Observable<Partie> : la partie nouvellement creee.
   * @param joueurId - L'identifiant numerique du joueur
   */
  createPartie(joueurId: number): Observable<Partie> {
    // Le backend attend le champ "joueur_id" pour identifier le joueur
    return this.http.post<Partie>(`${this.apiUrl}/parties`, { joueur_id: joueurId });
  }

  /**
   * Recupere l'etat actuel d'une partie (score, reponses, termine ou non).
   * Envoie un GET /api/parties/{id}.
   * Retourne un Observable<Partie> avec toutes les infos de la partie.
   * @param id - L'identifiant numerique de la partie
   */
  getPartie(id: number): Observable<Partie> {
    return this.http.get<Partie>(`${this.apiUrl}/parties/${id}`);
  }

  /**
   * Recupere les questions d'un mini-jeu pour un niveau de difficulte donne.
   * Envoie un GET /api/parties/{id}/questions?mini_jeu_id=X&difficulte=Y.
   * Retourne un Observable<Question[]> : la liste des questions (sans les bonnes reponses).
   * @param partieId   - L'identifiant de la partie en cours
   * @param miniJeuId  - L'identifiant du mini-jeu selectionne
   * @param difficulte - Niveau : 1 = facile, 2 = moyen, 3 = difficile
   */
  getQuestions(partieId: number, miniJeuId: number, difficulte: number): Observable<Question[]> {
    // Les parametres d'URL sont passes via { params: { ... } }
    return this.http.get<Question[]>(`${this.apiUrl}/parties/${partieId}/questions`, {
      params: {
        mini_jeu_id: miniJeuId.toString(),  // HttpClient exige des valeurs en string
        difficulte: difficulte.toString(),
      },
    });
  }

  /**
   * Soumet la reponse du joueur a une question.
   * Envoie un POST /api/parties/{id}/reponses avec les details de la reponse.
   * Retourne un Observable<ReponseResult> : si c'etait correct + la bonne reponse.
   * @param partieId        - L'identifiant de la partie en cours
   * @param questionId      - L'identifiant de la question a laquelle on repond
   * @param reponse         - Le texte de la reponse choisie par le joueur
   * @param tempsReponseSec - Temps mis pour repondre, en secondes
   */
  submitReponse(
    partieId: number,
    questionId: number,
    reponse: string,
    tempsReponseSec: number,
  ): Observable<ReponseResult> {
    return this.http.post<ReponseResult>(`${this.apiUrl}/parties/${partieId}/reponses`, {
      question_id: questionId,      // Identifiant de la question
      reponse: reponse,             // Reponse choisie par le joueur
      temps_reponse_sec: tempsReponseSec, // Temps de reponse en secondes
    });
  }

  /**
   * Termine une partie et calcule le score final.
   * Envoie un PATCH /api/parties/{id}/terminer sans corps.
   * Retourne un Observable<PartieResult> : le resume complet de la partie.
   * @param id - L'identifiant de la partie a terminer
   */
  terminerPartie(id: number): Observable<PartieResult> {
    // PATCH sans corps ({}) car le backend deduit lui-meme la fin de partie
    return this.http.patch<PartieResult>(`${this.apiUrl}/parties/${id}/terminer`, {});
  }
}
