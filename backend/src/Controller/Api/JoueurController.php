<?php

namespace App\Controller\Api;

use App\Entity\Joueur;
use App\Repository\JoueurRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

// #[Route('/api/joueurs')] sur la CLASSE : préfixe commun aux routes du contrôleur.
#[Route('/api/joueurs')]
// final = empêche l'héritage (convention Symfony pour les contrôleurs).
final class JoueurController extends AbstractController
{
    // Constructor property promotion (PHP 8) : déclare et assigne les propriétés
    // privées en une ligne. Symfony fait l'autowiring grâce aux type-hints.
    public function __construct(
        private EntityManagerInterface $em,
        private JoueurRepository $joueurRepository,
        private ValidatorInterface $validator,
    ) {}

    #[Route('', name: 'api_joueur_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        // json_decode(corps, true) : le 2e argument true demande un tableau associatif.
        $data = json_decode($request->getContent(), true);
        // ?? null : si la clé n'existe pas, on récupère null sans warning.
        $pseudo = $data['pseudo'] ?? null;

        if (!$pseudo) {
            return $this->json(['error' => 'Le pseudo est obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        // findOneBy(['colonne' => valeur]) : cherche UNE entité correspondant aux critères.
        // Renvoie l'objet trouvé OU null si aucun résultat. Différent de findBy() qui
        // renvoie un tableau (potentiellement vide).
        $existant = $this->joueurRepository->findOneBy(['pseudo' => $pseudo]);
        // Logique d'idempotence : si le pseudo existe déjà, on renvoie le joueur
        // existant (200 OK par défaut) au lieu de créer un doublon. Le frontend peut
        // donc appeler cet endpoint sans craindre l'erreur "pseudo déjà pris".
        if ($existant) {
            return $this->json([
                'id' => $existant->getId(),
                'pseudo' => $existant->getPseudo(),
            ]);
        }

        $joueur = (new Joueur())->setPseudo($pseudo);

        // ValidatorInterface vérifie les contraintes #[Assert\...] déclarées sur l'entité.
        // Renvoie une ConstraintViolationList (compatible count() et foreach).
        $errors = $this->validator->validate($joueur);
        if (count($errors) > 0) {
            $messages = [];
            foreach ($errors as $error) {
                $messages[] = $error->getMessage();
            }
            return $this->json(['errors' => $messages], Response::HTTP_BAD_REQUEST);
        }

        $this->em->persist($joueur);
        $this->em->flush();

        // Response::HTTP_CREATED vaut 201, convention REST pour signaler qu'une
        // nouvelle ressource a bien été créée (à distinguer du 200 OK ci-dessus).
        return $this->json([
            'id' => $joueur->getId(),
            'pseudo' => $joueur->getPseudo(),
        ], Response::HTTP_CREATED);
    }
}
