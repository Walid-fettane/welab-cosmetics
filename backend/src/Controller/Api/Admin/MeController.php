<?php

// Controller de test du firewall JWT cote administration.
// Sert a verifier qu'une route /api/admin/* refuse les requetes sans jeton (401)
// et accepte celles qui presentent un JWT valide (200).

namespace App\Controller\Api\Admin;

use App\Entity\Utilisateur;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class MeController extends AbstractController
{
    // Renvoie les informations de l'administrateur actuellement connecte (identifie via son JWT).
    // Utile pour valider que le firewall protege bien la route et que le token est correctement lu.
    #[Route('/api/admin/me', name: 'api_admin_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        // On recupere l'utilisateur connecte fourni par Symfony Security a partir du JWT.
        /** @var Utilisateur $utilisateur */
        $utilisateur = $this->getUser();

        // On construit la reponse JSON avec les informations publiques du compte admin.
        return $this->json([
            'id' => $utilisateur->getId(),
            'email' => $utilisateur->getEmail(),
            'roles' => $utilisateur->getRoles(),
            // La date de creation est formatee au standard ISO 8601 pour etre lue facilement par le frontend.
            'dateCreation' => $utilisateur->getDateCreation()?->format(\DateTimeInterface::ATOM),
        ]);
    }
}
