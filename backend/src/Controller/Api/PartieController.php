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

#[Route('/api/parties')]
final class PartieController extends AbstractController
{
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
        $data = json_decode($request->getContent(), true);
        $joueurId = $data['joueur_id'] ?? null;

        if (!$joueurId) {
            return $this->json(['error' => 'joueur_id est obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        $joueur = $this->joueurRepository->find($joueurId);
        if (!$joueur) {
            return $this->json(['error' => 'Joueur non trouve'], Response::HTTP_NOT_FOUND);
        }

        $partie = (new Partie())->setJoueur($joueur);

        $miniJeux = $this->miniJeuRepository->findAll();
        foreach ($miniJeux as $miniJeu) {
            $partie->addMiniJeux($miniJeu);
        }

        $this->em->persist($partie);
        $this->em->flush();

        return $this->json([
            'id' => $partie->getId(),
            'joueur' => $joueur->getPseudo(),
            'date_debut' => $partie->getDateHeureDebut()->format('Y-m-d H:i:s'),
            'mini_jeux' => array_map(fn($mj) => [
                'id' => $mj->getId(),
                'type' => $mj->getType(),
                'nom' => $mj->getNomMiniJeu(),
            ], $miniJeux),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_partie_show', methods: ['GET'])]
    public function show(Partie $partie): JsonResponse
    {
        return $this->json([
            'id' => $partie->getId(),
            'joueur' => $partie->getJoueur()->getPseudo(),
            'score_total' => $partie->getScoreTotal(),
            'nb_reponse' => $partie->getNbReponse(),
            'date_debut' => $partie->getDateHeureDebut()->format('Y-m-d H:i:s'),
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
        if ($partie->getDateHeureFin() !== null) {
            return $this->json(['error' => 'La partie est deja terminee'], Response::HTTP_BAD_REQUEST);
        }

        $data = json_decode($request->getContent(), true);
        $questionId = $data['question_id'] ?? null;
        $reponseDonnee = $data['reponse'] ?? null;
        $tempsReponse = $data['temps_reponse_sec'] ?? null;

        $question = $this->questionRepository->find($questionId);
        if (!$question) {
            return $this->json(['error' => 'Question non trouvee'], Response::HTTP_NOT_FOUND);
        }

        $reponse = (new Reponse())
            ->setQuestion($question)
            ->setPartie($partie)
            ->setReponseDonnee($reponseDonnee)
            ->setTempsReponseSec($tempsReponse);

        $reponse->verifierReponse();

        $this->em->persist($reponse);

        $partie->recalculerScore();

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
