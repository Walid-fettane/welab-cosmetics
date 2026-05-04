<?php

// Controller de test du firewall JWT cote administration.
// Sert a verifier qu'une route /api/admin/* refuse les requetes sans jeton (401)
// et accepte celles qui presentent un JWT valide (200).

namespace App\Controller\Api\Admin;

use App\Entity\Utilisateur;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

// final = empêche l'héritage (convention Symfony pour les contrôleurs).
final class MeController extends AbstractController
{
    // Renvoie les informations de l'administrateur actuellement connecte (identifie via son JWT).
    // Utile pour valider que le firewall protege bien la route et que le token est correctement lu.
    #[Route('/api/admin/me', name: 'api_admin_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        // getUser() est fournie par AbstractController. Elle renvoie l'objet Utilisateur
        // (UserInterface) extrait du JWT par Symfony Security, ou null si la requête
        // n'est pas authentifiée. Comme la route est protégée par le firewall api_admin
        // (config/packages/security.yaml), on ne peut atteindre ce code que si
        // l'utilisateur est bien connecté : $utilisateur ne sera donc jamais null ici.
        // Le commentaire /** @var Utilisateur $utilisateur */ informe l'EDI/PHPStan
        // du type concret (par défaut getUser() est typée UserInterface).
        /** @var Utilisateur $utilisateur */
        $utilisateur = $this->getUser();

        // On construit la reponse JSON avec les informations publiques du compte admin.
        return $this->json([
            'id' => $utilisateur->getId(),
            'email' => $utilisateur->getEmail(),
            'roles' => $utilisateur->getRoles(),
            // ?->format(...) = nullsafe operator. Si getDateCreation() renvoie null,
            // l'expression vaut null sans déclencher d'erreur.
            // \DateTimeInterface::ATOM est une constante = format ISO 8601 standard
            // (ex. "2026-05-04T10:30:00+00:00"), facile à parser côté frontend.
            'dateCreation' => $utilisateur->getDateCreation()?->format(\DateTimeInterface::ATOM),
        ]);
    }
}
