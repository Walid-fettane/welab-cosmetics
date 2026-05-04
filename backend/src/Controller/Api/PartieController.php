<?php

namespace App\Controller\Api;

use App\Entity\Partie;
use App\Entity\Reponse;
use App\Repository\JoueurRepository;
use App\Repository\MiniJeuRepository;
use App\Repository\PartieRepository;
use App\Repository\QuestionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// #[Route('/api/parties')] sur la CLASSE : préfixe commun à toutes les routes du contrôleur.
// Une route '' déclarée plus bas correspond donc au chemin /api/parties.
#[Route('/api/parties')]
// final = empêche l'héritage (convention Symfony pour les contrôleurs).
final class PartieController extends AbstractController
{
    // Constructor property promotion (PHP 8) : "private XxxInterface $em" déclare la
    // propriété privée ET l'assigne en une seule ligne. Symfony injecte automatiquement
    // les services grâce à l'autowiring (lecture des type-hints).
    public function __construct(
        private EntityManagerInterface $em,
        private PartieRepository $partieRepository,
        private JoueurRepository $joueurRepository,
        private MiniJeuRepository $miniJeuRepository,
        private QuestionRepository $questionRepository,
    ) {}

    #[Route('', name: 'api_partie_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        // json_decode(corps, true) : le 2e argument true demande un tableau associatif
        // (cle => valeur) au lieu d'un objet stdClass. Pratique pour accéder via $data['cle'].
        $data = json_decode($request->getContent(), true);
        // ?? est l'opérateur null-coalescing : si $data['joueur_id'] est null OU n'existe pas,
        // on prend null. Différent de ?: qui se déclencherait aussi sur 0 ou ''.
        $joueurId = $data['joueur_id'] ?? null;

        if (!$joueurId) {
            return $this->json(['error' => 'joueur_id est obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        // find($id) cherche par CLE PRIMAIRE et renvoie null si l'id n'existe pas.
        $joueur = $this->joueurRepository->find($joueurId);
        if (!$joueur) {
            return $this->json(['error' => 'Joueur non trouve'], Response::HTTP_NOT_FOUND);
        }

        // Chaînage de setters (style Loulergue) : (new Partie()) crée l'objet,
        // setJoueur() renvoie $this ce qui permet d'enchaîner d'autres setters.
        $partie = (new Partie())->setJoueur($joueur);

        $miniJeux = $this->miniJeuRepository->findAll();
        foreach ($miniJeux as $miniJeu) {
            $partie->addMiniJeux($miniJeu);
        }

        // persist() marque l'entité pour insertion future ; aucun SQL n'est exécuté ici.
        $this->em->persist($partie);
        // flush() envoie réellement les requêtes SQL accumulées en une seule transaction.
        // C'est seulement après ce flush que $partie->getId() devient disponible.
        $this->em->flush();

        return $this->json([
            'id' => $partie->getId(),
            'joueur' => $joueur->getPseudo(),
            'date_debut' => $partie->getDateHeureDebut()->format('Y-m-d H:i:s'),
            // array_map applique la fonction à chaque MiniJeu et renvoie un NOUVEAU tableau.
            // fn(...) => ... = arrow function (PHP 7.4+) qui capture automatiquement les
            // variables du scope parent (pas besoin d'écrire "use ($x)").
            'mini_jeux' => array_map(fn($mj) => [
                'id' => $mj->getId(),
                'type' => $mj->getType(),
                'nom' => $mj->getNomMiniJeu(),
            ], $miniJeux),
        ], Response::HTTP_CREATED);
    }

    // ParamConverter implicite : le type-hint Partie $partie dans la signature fait
    // que Symfony cherche automatiquement la Partie dont l'id correspond au {id} de l'URL.
    // Si elle n'existe pas, Symfony renvoie 404 sans même entrer dans la méthode.
    #[Route('/{id}', name: 'api_partie_show', methods: ['GET'])]
    public function show(Partie $partie): JsonResponse
    {
        return $this->json([
            'id' => $partie->getId(),
            'joueur' => $partie->getJoueur()->getPseudo(),
            'score_total' => $partie->getScoreTotal(),
            'nb_reponse' => $partie->getNbReponse(),
            'date_debut' => $partie->getDateHeureDebut()->format('Y-m-d H:i:s'),
            // ?->format(...) : nullsafe operator. Si getDateHeureFin() renvoie null
            // (partie pas encore terminée), l'expression vaut null sans erreur.
            'date_fin' => $partie->getDateHeureFin()?->format('Y-m-d H:i:s'),
            'termine' => $partie->getDateHeureFin() !== null,
        ]);
    }

    #[Route('/{id}/questions', name: 'api_partie_questions', methods: ['GET'])]
    public function questions(Partie $partie, Request $request): JsonResponse
    {
        $miniJeuId = $request->query->getInt('mini_jeu_id');
        $difficulte = $request->query->getInt('difficulte', 1);

        if (!$miniJeuId) {
            return $this->json(['error' => 'mini_jeu_id est obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        $questions = $this->questionRepository->findByMiniJeuAndDifficulte(
            $miniJeuId, $difficulte, 5
        );

        // On melange aleatoirement les choix de chaque question pour que la bonne reponse ne soit pas toujours en premier
        $resultat = [];
        foreach ($questions as $q) {
            $choix = $q->getChoixPossibles();
            // shuffle() mélange le tableau EN PLACE (par référence) et renvoie juste un booléen.
            // L'argument doit donc être une variable, pas une expression directe.
            shuffle($choix);
            $resultat[] = [
                'id' => $q->getId(),
                'enonce' => $q->getEnonce(),
                'difficulte' => $q->getDifficulte(),
                'choix_possibles' => $choix,
            ];
        }

        return $this->json($resultat);
    }

    #[Route('/{id}/reponses', name: 'api_partie_reponse', methods: ['POST'])]
    public function repondre(Partie $partie, Request $request): JsonResponse
    {
        // !== compare type ET valeur (comparaison stricte). On refuse de noter une
        // réponse si la partie a déjà une date de fin renseignée.
        if ($partie->getDateHeureFin() !== null) {
            return $this->json(['error' => 'La partie est deja terminee'], Response::HTTP_BAD_REQUEST);
        }

        // json_decode(corps, true) : le 2e argument true demande un tableau associatif.
        $data = json_decode($request->getContent(), true);
        // ?? null : si la clé n'existe pas dans $data, on récupère null sans warning.
        $questionId = $data['question_id'] ?? null;
        $reponseDonnee = $data['reponse'] ?? null;
        $tempsReponse = $data['temps_reponse_sec'] ?? null;

        $question = $this->questionRepository->find($questionId);
        if (!$question) {
            return $this->json(['error' => 'Question non trouvee'], Response::HTTP_NOT_FOUND);
        }

        // Chaînage de setters : chaque set...() renvoie $this, on enchaîne tous
        // les appels en une seule expression (style Loulergue).
        $reponse = (new Reponse())
            ->setQuestion($question)
            ->setPartie($partie)
            ->setReponseDonnee($reponseDonnee)
            ->setTempsReponseSec($tempsReponse);

        // L'ORDRE est important : verifierReponse() détermine d'abord estCorrecte
        // ET scoreObtenu de cette réponse précise.
        $reponse->verifierReponse();

        // persist() marque la nouvelle Reponse pour insertion (pas encore de SQL).
        $this->em->persist($reponse);

        // recalculerScore() doit être appelée APRES verifierReponse() : elle additionne
        // tous les scoreObtenu des Reponse de la Partie. Si on l'appelait avant, la
        // nouvelle Reponse aurait encore son scoreObtenu par défaut (0) et le total
        // serait faux.
        $partie->recalculerScore();

        // Un seul flush() pour insérer la Reponse ET mettre à jour la Partie en une transaction SQL.
        $this->em->flush();

        return $this->json([
            'correct' => $reponse->isEstCorrecte(),
            'score_obtenu' => $reponse->getScoreObtenu(),
            'bonne_reponse' => $question->getElementADeviner(),
            'score_total_partie' => $partie->getScoreTotal(),
        ]);
    }

    #[Route('/{id}/terminer', name: 'api_partie_terminer', methods: ['PATCH'])]
    public function terminer(Partie $partie): JsonResponse
    {
        if ($partie->getDateHeureFin() !== null) {
            return $this->json(['error' => 'Partie deja terminee'], Response::HTTP_BAD_REQUEST);
        }

        // new \DateTime() : objet date à l'instant présent. Le \ force le namespace global
        // (DateTime est une classe native PHP, pas une classe de App\Entity).
        $partie->setDateHeureFin(new \DateTime());
        $partie->recalculerScore();
        $this->em->flush();

        // Calcul du score maximum atteignable pour cette partie precise.
        // On centralise cette logique cote backend pour que le frontend reste passif :
        // si l'administrateur ajoute ou supprime des questions plus tard,
        // le pourcentage final affiche au joueur reste juste, sans modifier le code Angular.
        $scoreMax = 0;
        // On parcourt toutes les reponses enregistrees pour cette partie
        // et on additionne la difficulte (1, 2 ou 3) de la question associee.
        // Cela donne le score maximum que le joueur aurait pu obtenir
        // s'il avait repondu correctement a toutes les questions qu'on lui a posees.
        foreach ($partie->getReponses() as $reponse) {
            $scoreMax += $reponse->getQuestion()->getDifficulte();
        }

        return $this->json([
            'id' => $partie->getId(),
            'score_total' => $partie->getScoreTotal(),
            'score_max_partie' => $scoreMax,
            'nb_reponse' => $partie->getNbReponse(),
            'date_debut' => $partie->getDateHeureDebut()->format('Y-m-d H:i:s'),
            'date_fin' => $partie->getDateHeureFin()->format('Y-m-d H:i:s'),
        ]);
    }
}
