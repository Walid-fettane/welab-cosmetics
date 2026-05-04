<?php

namespace App\Controller\Api;

use App\Repository\MiniJeuRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

// #[Route('/api/mini-jeux')] sur la CLASSE : préfixe commun aux routes du contrôleur.
#[Route('/api/mini-jeux')]
// final = empêche l'héritage (convention Symfony pour les contrôleurs).
final class MiniJeuController extends AbstractController
{
    public function __construct(
        private MiniJeuRepository $miniJeuRepository,
    ) {}

    #[Route('', name: 'api_minijeu_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        // findAll() équivaut à findBy([]) : renvoie tous les enregistrements de la
        // table mini_jeu, sans filtre ni tri imposé.
        $miniJeux = $this->miniJeuRepository->findAll();

        // array_map applique la fonction à chaque MiniJeu et renvoie un NOUVEAU tableau
        // (n'altère pas l'original).
        // fn(...) => ... = arrow function (PHP 7.4+) qui capture automatiquement les
        // variables du scope parent (pas besoin d'écrire "use ($x)").
        // L'appel ->getQuestions()->count() utilise count() de la Collection Doctrine,
        // différent de la fonction PHP count() qui ne marche que sur les tableaux/Countable.
        return $this->json(array_map(fn($mj) => [
            'id' => $mj->getId(),
            'type' => $mj->getType(),
            'nom' => $mj->getNomMiniJeu(),
            'description' => $mj->getDescriptionMiniJeu(),
            'nb_questions' => $mj->getQuestions()->count(),
        ], $miniJeux));
    }
}
