// Ce fichier definit la forme des donnees echangees avec le backend Symfony.
// Chaque "interface" est comme un moule : elle dit quels champs un objet doit avoir.
// Le mot-cle "export" permet aux autres fichiers du projet d'utiliser ces interfaces.

// Un joueur = un utilisateur identifie par son pseudo unique
export interface Joueur {
  id: number;      // Identifiant numerique unique cree par la base de donnees
  pseudo: string;  // Nom choisi par le joueur (ex: "Alice")
}

// Un mini-jeu = l'un des 3 types de jeux disponibles (ingredient, produit ou action)
export interface MiniJeu {
  id: number;            // Identifiant numerique unique
  type: string;          // Code interne : "ingredient_produit", "produit_contenant" ou "action_pole"
  nom: string;           // Nom affiche a l'ecran (ex: "Ingredients & Produits")
  description: string;   // Courte explication du mini-jeu pour le joueur
  nb_questions: number;  // Nombre total de questions dans ce mini-jeu
}

// Une partie = une session de jeu pour un joueur donne
export interface Partie {
  id: number;             // Identifiant unique de la partie
  joueur: Joueur;         // Le joueur qui joue cette partie (objet complet)
  score_total: number;    // Score cumule du joueur dans cette partie
  nb_reponse: number;     // Nombre de reponses soumises jusqu'ici
  date_debut: string;     // Date/heure de debut de la partie (format ISO 8601)
  date_fin: string | null; // Date/heure de fin (null si la partie n'est pas encore terminee)
  termine: boolean;       // true si la partie est terminee, false sinon
  mini_jeux: MiniJeu[];   // Liste des mini-jeux joues dans cette partie
}

// Une question posee au joueur pendant le jeu
export interface Question {
  id: number;              // Identifiant unique de la question
  enonce: string;          // Le texte de la question affichee au joueur
  difficulte: number;      // Niveau de difficulte : 1 = facile, 2 = moyen, 3 = difficile
  choix_possibles: string[]; // Liste des reponses proposees (tableau de textes)
  // Remarque : la bonne reponse n'est JAMAIS envoyee ici, seulement apres avoir repondu
}

// Le resultat recu apres avoir soumis une reponse a une question
export interface ReponseResult {
  correct: boolean;          // true si la reponse du joueur etait correcte
  score_obtenu: number;      // Points gagnes pour cette question (= difficulte si correct, 0 sinon)
  bonne_reponse: string;     // La vraie bonne reponse (revelee apres soumission)
  score_total_partie: number; // Score total accumule dans la partie jusqu'ici
}

// Le resume final d'une partie une fois terminee
export interface PartieResult {
  id: number;             // Identifiant de la partie
  score_total: number;    // Score final du joueur sur toute la partie
  // Score maximum que le joueur aurait pu obtenir sur cette partie.
  // Calcule cote backend en sommant la difficulte de chaque question reellement posee.
  // Sert au frontend pour afficher un pourcentage juste meme si le nombre
  // de questions change (ajout/suppression par l'administrateur).
  score_max_partie: number;
  nb_reponse: number;     // Nombre total de reponses soumises
  date_debut: string;     // Date/heure de debut (format ISO 8601)
  date_fin: string;       // Date/heure de fin (format ISO 8601)
}
