// Ce fichier configure l'application Angular au demarrage.
// Les "providers" sont des services mis a disposition de toute l'application.
// C'est ici qu'on active les grandes fonctionnalites globales : routage, HTTP, etc.

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
// provideHttpClient active le service HttpClient dans toute l'application.
// Sans cette ligne, les appels HTTP dans api.ts ne fonctionneraient pas.
//
// withInterceptors([...]) enregistre un ou plusieurs intercepteurs
// "fonctionnels" qui s'executent dans l'ordre du tableau a chaque requete
// HTTP sortante. Chaque intercepteur peut consulter, modifier ou bloquer
// la requete (par exemple pour ajouter un header Authorization).
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
// authInterceptor : ajoute le header "Authorization: Bearer <token>" aux
// requetes /api/admin/* (sauf /api/admin/login) et deconnecte
// automatiquement l'admin sur reception d'un 401 sur ces routes.
import { authInterceptor } from './interceptors/auth-interceptor';

// appConfig est la configuration principale lue par Angular au lancement (dans main.ts)
export const appConfig: ApplicationConfig = {
  providers: [
    // Capture les erreurs JavaScript non gerees et les affiche proprement
    provideBrowserGlobalErrorListeners(),
    // Active le systeme de navigation entre les pages (URLs)
    provideRouter(routes),
    // Active les requetes HTTP avec l'intercepteur d'authentification admin.
    // Le tableau passe a withInterceptors definit l'ordre d'execution :
    // ici un seul intercepteur, mais on pourrait en empiler plusieurs
    // (ex: logging, retry, gestion d'erreurs globale).
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
