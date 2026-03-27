<?php

namespace App\Controller\Api;

use App\Repository\MiniJeuRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/mini-jeux')]
final class MiniJeuController extends AbstractController
{
    public function __construct(
        private MiniJeuRepository $miniJeuRepository,
    ) {}

    #[Route('', name: 'api_minijeu_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $miniJeux = $this->miniJeuRepository->findAll();

        return $this->json(array_map(fn($mj) => [
            'id' => $mj->getId(),
            'type' => $mj->getType(),
            'nom' => $mj->getNomMiniJeu(),
            'description' => $mj->getDescriptionMiniJeu(),
            'nb_questions' => $mj->getQuestions()->count(),
        ], $miniJeux));
    }
}
