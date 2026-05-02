// Definitions TypeScript des donnees echangees avec les routes /api/admin/*.
//
// Une "interface" en TypeScript decrit la forme attendue d'un objet :
// quels champs il doit contenir et de quel type. Le compilateur TypeScript
// verifie ensuite a la lecture du code que chaque acces respecte cette
// forme, ce qui evite la quasi-totalite des "undefined is not a function"
// qu'on voit en JavaScript classique.
//
// Le mot-cle "export" rend chaque interface importable depuis les autres
// fichiers du projet via "import { ... } from '...'".

// Une question telle que renvoyee par GET /api/admin/questions.
// Les noms des champs suivent EXACTEMENT le JSON produit par le backend
// (camelCase) afin d'eviter d'avoir a renommer les proprietes a la volee.
export interface QuestionAdmin {
  id: number;                  // Identifiant numerique unique cree par la base de donnees
  enonce: string;              // Texte de la question (max 255 caracteres cote serveur)
  elementADeviner: string;     // La bonne reponse (doit figurer parmi choixPossibles)
  difficulte: number;          // Niveau : 1 = facile, 2 = moyen, 3 = difficile
  choixPossibles: string[];    // Liste des reponses proposees au joueur (2 a 6 elements)
  miniJeuId: number;           // Identifiant du mini-jeu auquel cette question est rattachee
  miniJeuNom: string;          // Nom lisible du mini-jeu (utilise pour le badge dans le tableau)
}

// Forme du corps JSON envoye au backend pour creer ou modifier une question.
// Difference avec QuestionAdmin : pas de champ "id" (genere par la base de
// donnees lors d'un POST), et pas de "miniJeuNom" (on n'envoie que
// l'identifiant ; le serveur en deduit le nom via Doctrine).
export interface QuestionAdminPayload {
  enonce: string;
  elementADeviner: string;
  difficulte: number;
  choixPossibles: string[];
  miniJeuId: number;
}

// Un mini-jeu, version "admin" : seulement les champs necessaires pour
// remplir le menu deroulant du formulaire d'ajout / modification.
export interface MiniJeuAdmin {
  id: number;
  type: string;        // Code interne (ex: "ingredient_produit")
  nomMiniJeu: string;  // Nom affiche dans le menu deroulant
}

// Forme du JSON renvoye par POST /api/admin/login en cas de succes.
// Contient le jeton JWT a stocker localement pour les appels suivants.
export interface LoginResponse {
  token: string;
}

// Forme du JSON renvoye par GET /api/admin/me. Sert uniquement a
// recuperer l'identite de l'admin connecte pour l'afficher dans
// l'en-tete du tableau de bord.
export interface AdminMe {
  id: number;
  email: string;
}
