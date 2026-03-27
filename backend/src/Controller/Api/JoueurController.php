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

#[Route('/api/joueurs')]
final class JoueurController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private JoueurRepository $joueurRepository,
        private ValidatorInterface $validator,
    ) {}

    #[Route('', name: 'api_joueur_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $pseudo = $data['pseudo'] ?? null;

        if (!$pseudo) {
            return $this->json(['error' => 'Le pseudo est obligatoire'], Response::HTTP_BAD_REQUEST);
        }

        $existant = $this->joueurRepository->findOneBy(['pseudo' => $pseudo]);
        if ($existant) {
            return $this->json([
                'id' => $existant->getId(),
                'pseudo' => $existant->getPseudo(),
            ]);
        }

        $joueur = (new Joueur())->setPseudo($pseudo);

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

        return $this->json([
            'id' => $joueur->getId(),
            'pseudo' => $joueur->getPseudo(),
        ], Response::HTTP_CREATED);
    }
}
