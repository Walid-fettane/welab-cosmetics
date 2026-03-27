// Ce fichier configure l'application Angular au demarrage.
// Les "providers" sont des services mis a disposition de toute l'application.
// C'est ici qu'on active les grandes fonctionnalites globales : routage, HTTP, etc.

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
// provideHttpClient active le service HttpClient dans toute l'application.
// Sans cette ligne, les appels HTTP dans api.ts ne fonctionneraient pas.
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// appConfig est la configuration principale lue par Angular au lancement (dans main.ts)
export const appConfig: ApplicationConfig = {
  providers: [
    // Capture les erreurs JavaScript non gerees et les affiche proprement
    provideBrowserGlobalErrorListeners(),
    // Active le systeme de navigation entre les pages (URLs)
    provideRouter(routes),
    // Active les requetes HTTP : necesaire pour que ApiService puisse contacter le backend
    provideHttpClient(),
  ],
};
