// Service d'appels API pour l'espace administrateur.
//
// Role : exposer toutes les operations CRUD (Create / Read / Update /
// Delete) sur les questions, plus la recuperation des mini-jeux et de
// l'identite de l'admin connecte.
//
// Les en-tetes Authorization sont AJOUTES automatiquement par
// l'intercepteur HTTP (auth-interceptor.ts). Ce service n'a donc
// jamais a manipuler le jeton lui-meme : il decrit uniquement quelle
// URL appeler et quel corps envoyer / recevoir.

import { inject, Injectable } from '@angular/core';
// HttpClient : service Angular pour les requetes HTTP. Il offre les
// methodes get / post / put / patch / delete, chacune renvoyant un
// Observable que le composant appelant peut "subscribe" pour declencher
// l'envoi reel.
import { HttpClient } from '@angular/common/http';
// Observable : flux asynchrone. Different d'une Promise : il n'execute
// rien tant que personne ne s'y abonne (lazy par defaut).
import { Observable } from 'rxjs';

import {
  QuestionAdmin,
  QuestionAdminPayload,
  MiniJeuAdmin,
  AdminMe,
} from '../models/admin-interfaces';

// providedIn: 'root' : un seul exemplaire de ce service partage par
// toute l'application (singleton).
@Injectable({
  providedIn: 'root',
})
export class ApiAdmin {
  // inject(HttpClient) : recupere le service HttpClient sans passer par
  // un constructeur. Plus concis que l'ancienne syntaxe et compatible
  // avec les fonctions hors classe.
  private http = inject(HttpClient);

  // Le proxy.conf.json redirige /api -> http://localhost:8000 en dev.
  // Utiliser une URL relative permet de ne pas se preoccuper du port
  // ni du domaine : ca fonctionnera aussi en production tant que le
  // backend est servi sous le meme nom de domaine que le frontend.
  private readonly apiUrl = '/api/admin';

  /**
   * Recupere l'email et l'id de l'admin actuellement connecte.
   * Sert uniquement a afficher l'email dans l'en-tete du dashboard.
   */
  getMe(): Observable<AdminMe> {
    // get<AdminMe>(...) : on declare le type attendu de la reponse.
    // Angular convertit le JSON recu en objet AdminMe, ce qui permet
    // l'autocompletion des champs (response.email, response.id).
    return this.http.get<AdminMe>(`${this.apiUrl}/me`);
  }

  /**
   * Recupere la liste de toutes les questions, deja triees par mini-jeu
   * puis difficulte (l'ordre est decide cote serveur).
   */
  getQuestions(): Observable<QuestionAdmin[]> {
    return this.http.get<QuestionAdmin[]>(`${this.apiUrl}/questions`);
  }

  /**
   * Cree une nouvelle question.
   * Codes HTTP cote serveur :
   *   - 201 Created     : la question a ete creee, son id est renvoye
   *   - 400 Bad Request : donnees invalides (le corps contient { error: "..." })
   */
  createQuestion(data: QuestionAdminPayload): Observable<QuestionAdmin> {
    // post(url, corps) : envoie un POST avec le corps serialise en JSON.
    // Angular ajoute automatiquement le header Content-Type: application/json.
    return this.http.post<QuestionAdmin>(`${this.apiUrl}/questions`, data);
  }

  /**
   * Met a jour une question existante.
   * Codes HTTP cote serveur :
   *   - 200 OK          : la question a ete mise a jour
   *   - 400 Bad Request : donnees invalides
   *   - 404 Not Found   : aucune question n'existe avec cet id
   */
  updateQuestion(id: number, data: QuestionAdminPayload): Observable<QuestionAdmin> {
    return this.http.put<QuestionAdmin>(`${this.apiUrl}/questions/${id}`, data);
  }

  /**
   * Supprime une question. Le backend repond 204 No Content (corps vide)
   * en cas de succes, ce qui se traduit cote Angular par Observable<void>
   * (l'Observable n'emet rien d'utile, juste un signal de fin).
   */
  deleteQuestion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/questions/${id}`);
  }

  /**
   * Recupere la liste des mini-jeux disponibles. Utilisee pour remplir
   * le menu deroulant du formulaire d'ajout / modification de question.
   */
  getMiniJeux(): Observable<MiniJeuAdmin[]> {
    return this.http.get<MiniJeuAdmin[]>(`${this.apiUrl}/mini-jeux`);
  }
}
