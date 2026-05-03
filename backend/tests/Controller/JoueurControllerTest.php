<?php

// Ce fichier contient le test fonctionnel du JoueurController.
// Contrairement aux tests unitaires, ce test demarre un vrai noyau Symfony
// et envoie de vraies requetes HTTP a l'application : il valide l'API
// de bout en bout, y compris la couche routing, controller et base de
// donnees. Il s'appuie sur l'environnement APP_ENV=test (force par
// phpunit.dist.xml).

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class JoueurControllerTest extends WebTestCase
{
    // Test 7 : on verifie deux choses sur l'endpoint POST /api/joueurs.
    // Premier appel avec un pseudo unique : on doit recevoir un code 201
    // (Created) et un JSON contenant l'id genere et le pseudo envoye.
    // Deuxieme appel avec le MEME pseudo : l'API doit etre idempotente,
    // c'est-a-dire renvoyer le joueur existant (et donc le meme id) au
    // lieu de retourner une erreur 409 ou de creer un doublon. Cette
    // idempotence est importante pour le frontend, qui peut renvoyer la
    // creation sans risquer de bloquer le joueur.
    public function testCreerJoueurIdempotent(): void
    {
        $client = static::createClient();

        // On utilise un pseudo aleatoire pour eviter toute collision
        // avec les fixtures ou des donnees deja presentes en base.
        $pseudo = 'TestPseudo_' . uniqid();

        // Premier appel : creation du joueur, on attend un 201.
        $client->request(
            'POST',
            '/api/joueurs',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['pseudo' => $pseudo])
        );

        $this->assertSame(201, $client->getResponse()->getStatusCode(), 'Premier appel : on attend un 201 Created');
        $premier = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($premier);
        $this->assertArrayHasKey('id', $premier);
        $this->assertArrayHasKey('pseudo', $premier);
        $this->assertIsInt($premier['id']);
        $this->assertSame($pseudo, $premier['pseudo']);

        // Deuxieme appel avec le meme pseudo : l'API doit renvoyer le
        // joueur existant sans creer de doublon ni renvoyer d'erreur.
        $client->request(
            'POST',
            '/api/joueurs',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['pseudo' => $pseudo])
        );

        $statut = $client->getResponse()->getStatusCode();
        $this->assertContains($statut, [200, 201], 'Deuxieme appel : on attend 200 (idempotent) ou 201, jamais une erreur');
        $second = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame($premier['id'], $second['id'], 'Le second appel doit renvoyer le meme id (idempotence)');
        $this->assertSame($pseudo, $second['pseudo']);
    }
}
