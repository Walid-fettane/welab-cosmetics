// Page d'accueil de We-Lab Cosmetics.
// C'est la première page que voit le joueur quand il arrive sur le site.
// Elle affiche un titre de bienvenue et un bouton "Commencer" qui mène vers /pseudo.

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
// Router permet de naviguer entre les pages sans recharger toute l'application.
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  // OnPush = Angular ne redessine ce composant que si ses données changent.
  // C'est une optimisation de performance recommandée pour les composants simples.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  // inject(Router) est la façon moderne Angular d'obtenir un service.
  // C'est équivalent à écrire "constructor(private router: Router)" en plus ancien.
  private router = inject(Router);

  /**
   * Redirige l'utilisateur vers la page de saisie du pseudo.
   * Appelée quand le joueur clique sur le bouton "Commencer".
   */
  commencer(): void {
    // navigate(['/pseudo']) change l'URL vers /pseudo sans recharger la page.
    this.router.navigate(['/pseudo']);
  }
}
