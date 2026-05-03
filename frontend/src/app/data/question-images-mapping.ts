// ------------------------------------------------------------------
// Mapping entre les questions du mini-jeu 2 (produit -> contenant)
// et les fichiers SVG affiches dans l'interface drag and drop.
//
// Pourquoi un fichier dedie : la base de donnees ne stocke que du
// texte (enonce, choix possibles, bonne reponse). Pour pouvoir
// afficher une image precise pour chaque produit ou contenant,
// on tient ici une table de correspondance entre le texte exact
// stocke en base et le chemin du fichier SVG correspondant dans
// frontend/public/images/dnd/.
//
// Avantage : si un administrateur ajoute une question via le CRUD
// sans qu'on ait prepare le SVG associe, les fonctions d'acces
// renverront null et le composant DnD affichera un placeholder
// texte au lieu de planter.
// ------------------------------------------------------------------

// Forme des donnees associees a chaque question : un fichier produit
// (ce que le joueur deplace) et un fichier "succes" (image qui montre
// le produit dans son contenant avec une coche, affichee en cas de
// bonne reponse).
export interface QuestionImages {
  // Chemin du SVG du produit a faire glisser (zone de depart)
  produit: string;
  // Chemin du SVG de feedback positif (contenant rempli + coche verte)
  succes: string;
}

// ------------------------------------------------------------------
// Table principale : pour chaque enonce de question (cle = chaine
// EXACTE telle que stockee en base via le fixture), on associe les
// deux SVG necessaires. Toute modification de l'enonce dans le
// fixture doit etre repercutee ici sinon getImagesForQuestion()
// retournera null.
// ------------------------------------------------------------------
export const QUESTION_IMAGES: Record<string, QuestionImages> = {
  // Niveau 1 (facile) : 5 questions
  'Dans quel contenant met-on du Dentifrice ?': {
    produit: '/images/dnd/produits/dentifrice.svg',
    succes:  '/images/dnd/succes/dentifrice-tube.svg',
  },
  'Dans quel contenant met-on du Shampoing ?': {
    produit: '/images/dnd/produits/shampoing.svg',
    succes:  '/images/dnd/succes/shampoing-bouteille.svg',
  },
  'Dans quel contenant met-on du Parfum ?': {
    produit: '/images/dnd/produits/parfum.svg',
    succes:  '/images/dnd/succes/parfum-spray.svg',
  },
  'Dans quel contenant met-on du Mascara ?': {
    produit: '/images/dnd/produits/mascara.svg',
    succes:  '/images/dnd/succes/mascara-flaconnette.svg',
  },
  'Dans quel contenant met-on un Baume a levres ?': {
    produit: '/images/dnd/produits/baume-levres.svg',
    succes:  '/images/dnd/succes/baume-stick.svg',
  },

  // Niveau 2 (moyen) : 4 questions
  'Dans quel contenant met-on un Serum visage ?': {
    produit: '/images/dnd/produits/serum.svg',
    succes:  '/images/dnd/succes/serum-gouttes.svg',
  },
  'Dans quel contenant met-on du Gel lavant moussant ?': {
    produit: '/images/dnd/produits/gel-moussant.svg',
    succes:  '/images/dnd/succes/gel-foamer.svg',
  },
  'Dans quel contenant met-on du Deodorant ?': {
    produit: '/images/dnd/produits/deodorant.svg',
    succes:  '/images/dnd/succes/deodorant-rollon.svg',
  },
  'Dans quel contenant met-on du Vernis a ongles ?': {
    produit: '/images/dnd/produits/vernis.svg',
    succes:  '/images/dnd/succes/vernis-pinceau.svg',
  },

  // Niveau 3 (difficile) : 3 questions
  'Dans quel contenant met-on du Fond de teint fragile ?': {
    produit: '/images/dnd/produits/fond-teint.svg',
    succes:  '/images/dnd/succes/fondteint-airless.svg',
  },
  'Dans quel contenant met-on de la Creme riche sterile ?': {
    produit: '/images/dnd/produits/creme-riche.svg',
    succes:  '/images/dnd/succes/creme-potairless.svg',
  },
  'Dans quel contenant met-on du Shampoing sec ?': {
    produit: '/images/dnd/produits/shampoing-sec.svg',
    succes:  '/images/dnd/succes/shampoingsec-aerosol.svg',
  },

  // ----------------------------------------------------------------
  // Bibliotheque additionnelle : 5 questions DnD supplementaires que
  // l'admin peut creer via le dashboard sans avoir a toucher au code.
  // Les enonces ci-dessous sont des SUGGESTIONS d'exemples : si l'admin
  // saisit l'un de ces enonces exacts, l'image associee sera resolue
  // automatiquement par cette table. Sinon, il peut utiliser les menus
  // deroulants d'images du dashboard pour choisir manuellement.
  // ----------------------------------------------------------------
  'Dans quel contenant met-on de la Creme solaire ?': {
    produit: '/images/dnd/produits/creme-solaire.svg',
    succes:  '/images/dnd/succes/cremesolaire-tube.svg',
  },
  "Dans quel contenant met-on de l'Huile capillaire ?": {
    produit: '/images/dnd/produits/huile-capillaire.svg',
    succes:  '/images/dnd/succes/huilecap-gouttes.svg',
  },
  'Dans quel contenant met-on du Gel douche ?': {
    produit: '/images/dnd/produits/gel-douche.svg',
    succes:  '/images/dnd/succes/geldouche-bouteille.svg',
  },
  'Dans quel contenant met-on de la Lotion tonique ?': {
    produit: '/images/dnd/produits/lotion-tonique.svg',
    succes:  '/images/dnd/succes/lotion-spray.svg',
  },
  'Dans quel contenant met-on un Masque visage ?': {
    produit: '/images/dnd/produits/masque-visage.svg',
    succes:  '/images/dnd/succes/masque-pot.svg',
  },
};

// ------------------------------------------------------------------
// Bibliotheque d'images "produit" disponibles dans le projet.
// Chaque entree associe un libelle lisible (affiche dans le menu
// deroulant du dashboard admin) au chemin du fichier SVG copie dans
// /frontend/public/images/dnd/produits/.
//
// Pour ajouter une nouvelle image au-dela de cette liste : deposer
// le SVG dans le bon dossier, puis ajouter une ligne ici.
// ------------------------------------------------------------------
export const BIBLIOTHEQUE_PRODUITS: { label: string; chemin: string }[] = [
  { label: 'Dentifrice',         chemin: '/images/dnd/produits/dentifrice.svg' },
  { label: 'Shampoing',          chemin: '/images/dnd/produits/shampoing.svg' },
  { label: 'Parfum',             chemin: '/images/dnd/produits/parfum.svg' },
  { label: 'Mascara',            chemin: '/images/dnd/produits/mascara.svg' },
  { label: 'Baume a levres',     chemin: '/images/dnd/produits/baume-levres.svg' },
  { label: 'Serum visage',       chemin: '/images/dnd/produits/serum.svg' },
  { label: 'Gel moussant',       chemin: '/images/dnd/produits/gel-moussant.svg' },
  { label: 'Deodorant',          chemin: '/images/dnd/produits/deodorant.svg' },
  { label: 'Vernis a ongles',    chemin: '/images/dnd/produits/vernis.svg' },
  { label: 'Fond de teint',      chemin: '/images/dnd/produits/fond-teint.svg' },
  { label: 'Creme riche',        chemin: '/images/dnd/produits/creme-riche.svg' },
  { label: 'Shampoing sec',      chemin: '/images/dnd/produits/shampoing-sec.svg' },
  // 5 nouvelles images ajoutees pour permettre a l'admin de creer
  // des questions DnD supplementaires sans modifier le code.
  { label: 'Creme solaire',      chemin: '/images/dnd/produits/creme-solaire.svg' },
  { label: 'Huile capillaire',   chemin: '/images/dnd/produits/huile-capillaire.svg' },
  { label: 'Gel douche',         chemin: '/images/dnd/produits/gel-douche.svg' },
  { label: 'Lotion tonique',     chemin: '/images/dnd/produits/lotion-tonique.svg' },
  { label: 'Masque visage',      chemin: '/images/dnd/produits/masque-visage.svg' },
];

// ------------------------------------------------------------------
// Bibliotheque d'images "succes" : memes regles que la table
// ci-dessus, mais cette fois pour les visuels de feedback positif
// (contenant rempli + coche verte). Affichee dans le second menu
// deroulant du dashboard admin.
// ------------------------------------------------------------------
export const BIBLIOTHEQUE_SUCCES: { label: string; chemin: string }[] = [
  { label: 'Shampoing dans Bouteille',                chemin: '/images/dnd/succes/shampoing-bouteille.svg' },
  { label: 'Dentifrice dans Tube',                    chemin: '/images/dnd/succes/dentifrice-tube.svg' },
  { label: 'Parfum dans Spray',                       chemin: '/images/dnd/succes/parfum-spray.svg' },
  { label: 'Mascara dans Flaconnette brosse',         chemin: '/images/dnd/succes/mascara-flaconnette.svg' },
  { label: 'Baume dans Stick',                        chemin: '/images/dnd/succes/baume-stick.svg' },
  { label: 'Serum dans Flacon compte-gouttes',        chemin: '/images/dnd/succes/serum-gouttes.svg' },
  { label: 'Gel dans Foamer',                         chemin: '/images/dnd/succes/gel-foamer.svg' },
  { label: 'Deodorant dans Roll-on',                  chemin: '/images/dnd/succes/deodorant-rollon.svg' },
  { label: 'Vernis dans Flacon pinceau',              chemin: '/images/dnd/succes/vernis-pinceau.svg' },
  { label: 'Fond de teint dans Flacon Airless',       chemin: '/images/dnd/succes/fondteint-airless.svg' },
  { label: 'Creme dans Pot Airless',                  chemin: '/images/dnd/succes/creme-potairless.svg' },
  { label: 'Shampoing sec dans Aerosol',              chemin: '/images/dnd/succes/shampoingsec-aerosol.svg' },
  // 5 nouvelles images, en miroir des produits ajoutes ci-dessus.
  { label: 'Creme solaire dans Tube',                 chemin: '/images/dnd/succes/cremesolaire-tube.svg' },
  { label: 'Huile capillaire dans Flacon compte-gouttes', chemin: '/images/dnd/succes/huilecap-gouttes.svg' },
  { label: 'Gel douche dans Bouteille',               chemin: '/images/dnd/succes/geldouche-bouteille.svg' },
  { label: 'Lotion tonique dans Spray',               chemin: '/images/dnd/succes/lotion-spray.svg' },
  { label: 'Masque visage dans Pot',                  chemin: '/images/dnd/succes/masque-pot.svg' },
];

// ------------------------------------------------------------------
// Table secondaire : pour chaque nom de contenant qui peut apparaitre
// dans le tableau choix_possibles d'une question, on associe le SVG
// neutre du contenant vide affiche dans une zone de drop.
//
// Les cles correspondent EXACTEMENT aux libelles stockes en base
// (sans accents, casse exacte) afin que la comparaison stricte
// fonctionne aussi bien pour l'affichage que pour la rétroaction.
// ------------------------------------------------------------------
export const CONTENANT_IMAGES: Record<string, string> = {
  'Tube':                  '/images/dnd/contenants/tube.svg',
  'Pot':                   '/images/dnd/contenants/pot.svg',
  'Spray':                 '/images/dnd/contenants/spray.svg',
  'Flacon pompe':          '/images/dnd/contenants/flacon-pompe.svg',
  'Bouteille':             '/images/dnd/contenants/bouteille.svg',
  'Poudrier':              '/images/dnd/contenants/poudrier.svg',
  'Stick':                 '/images/dnd/contenants/stick.svg',
  'Sachet':                '/images/dnd/contenants/sachet.svg',
  'Flaconnette brosse':    '/images/dnd/contenants/flaconnette-brosse.svg',
  'Roll on':               '/images/dnd/contenants/roll-on.svg',
  'Aerosol':               '/images/dnd/contenants/aerosol.svg',
  'Foamer':                '/images/dnd/contenants/foamer.svg',
  'Flacon compte-gouttes': '/images/dnd/contenants/flacon-gouttes.svg',
  'Flacon pinceau':        '/images/dnd/contenants/flacon-pinceau.svg',
  'Flacon Airless':        '/images/dnd/contenants/flacon-airless.svg',
  'Pot Airless':           '/images/dnd/contenants/pot-airless.svg',
};

// Image generique affichee dans la zone de drop quand le joueur
// se trompe : evite de devoir creer 12 variantes "produit casse".
export const ECHEC_IMAGE = '/images/dnd/echec.svg';

// ------------------------------------------------------------------
// Recuperation securisee des images d'une question.
//
// Ordre de priorite :
//   1. Si imagesAdmin est fourni (mapping enregistre par l'admin via
//      le dashboard et lu depuis localStorage), on renvoie ce couple
//      d'images en priorite. Permet a l'admin d'associer des images
//      a une question ajoutee dynamiquement.
//   2. Sinon, on tombe sur la table en dur QUESTION_IMAGES indexee
//      par l'enonce exact (chemin historique pour les 12 questions
//      d'origine + 5 questions de la bibliotheque d'exemple).
//   3. Si aucune des deux sources ne connait la question, on renvoie
//      null pour que le composant appelant affiche un placeholder.
//
// Le parametre questionId n'est pas lu directement par cette fonction :
// la resolution du mapping admin se fait cote appelant (qui a acces
// au store), mais on garde l'argument pour rendre la signature claire
// et faciliter d'eventuels ajouts futurs (par exemple un cache).
// ------------------------------------------------------------------
export function getImagesForQuestion(
  enonce: string,
  // Le parametre est prefixe d'un underscore pour indiquer a TypeScript
  // qu'on accepte volontairement de ne pas l'utiliser dans le corps.
  _questionId?: number,
  imagesAdmin?: { produit: string; succes: string } | null,
): QuestionImages | null {
  // Priorite 1 : images choisies par l'admin via le dashboard.
  if (imagesAdmin) {
    return imagesAdmin;
  }
  // Priorite 2 : table en dur indexee par l'enonce. L'operateur ??
  // renvoie null si l'enonce n'a aucune entree (placeholder cote vue).
  return QUESTION_IMAGES[enonce] ?? null;
}

// ------------------------------------------------------------------
// Recuperation du chemin SVG d'un contenant : meme principe, retourne
// null si le nom n'est pas connu pour qu'on puisse afficher un
// placeholder a la place plutot que de casser l'image.
// ------------------------------------------------------------------
export function getContenantImage(nomContenant: string): string | null {
  return CONTENANT_IMAGES[nomContenant] ?? null;
}
