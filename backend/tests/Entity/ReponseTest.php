<?php

// Ce fichier contient les tests automatises de l'entite Reponse.
// On verifie ici le comportement de la methode verifierReponse(), qui est
// le coeur de la logique metier : c'est elle qui decide si la reponse
// donnee par le joueur est correcte et combien de points il gagne.
// Ces tests tournent en memoire (pas besoin de la base de donnees)
// pour qu'ils soient tres rapides a executer.

namespace App\Tests\Entity;

use App\Entity\MiniJeu;
use App\Entity\Question;
use App\Entity\Reponse;
use PHPUnit\Framework\TestCase;

final class ReponseTest extends TestCase
{
    // Petite fabrique privee qui construit une Question prete a etre testee.
    // On la centralise ici pour ne pas repeter la meme initialisation
    // dans chaque test : ca rend les tests plus courts et plus lisibles.
    private function creerQuestion(string $bonneReponse, int $difficulte): Question
    {
        $miniJeu = (new MiniJeu())
            ->setType('ingredient_produit')
            ->setNomMiniJeu('Mini-jeu de test');

        return (new Question())
            ->setEnonce('Question de test')
            ->setElementADeviner($bonneReponse)
            ->setDifficulte($difficulte)
            ->setChoixPossibles([$bonneReponse, 'Autre choix'])
            ->setMiniJeu($miniJeu);
    }

    // Test 1 : on verifie qu'une reponse exactement identique a la bonne
    // reponse est consideree comme correcte, et que le joueur gagne un
    // nombre de points egal a la difficulte de la question (ici 2).
    public function testBonneReponse(): void
    {
        $question = $this->creerQuestion('Tube', 2);
        $reponse = (new Reponse())
            ->setQuestion($question)
            ->setReponseDonnee('Tube');

        $reponse->verifierReponse();

        $this->assertTrue($reponse->isEstCorrecte(), 'Une reponse identique doit etre marquee correcte');
        $this->assertSame(2, $reponse->getScoreObtenu(), 'Le score doit valoir la difficulte de la question');
    }

    // Test 2 : on verifie qu'une reponse differente de la bonne reponse
    // est rejetee (estCorrecte = false) et que le joueur ne gagne aucun
    // point (scoreObtenu = 0).
    public function testMauvaiseReponse(): void
    {
        $question = $this->creerQuestion('Tube', 2);
        $reponse = (new Reponse())
            ->setQuestion($question)
            ->setReponseDonnee('Pot');

        $reponse->verifierReponse();

        $this->assertFalse($reponse->isEstCorrecte(), 'Une reponse differente doit etre marquee incorrecte');
        $this->assertSame(0, $reponse->getScoreObtenu(), 'Une mauvaise reponse ne doit rapporter aucun point');
    }

    // Test 3 : on verifie le cas particulier du bouton "Passer" cote
    // frontend, qui envoie la chaine speciale "__SKIPPED__". Ce n'est
    // jamais une bonne reponse, donc estCorrecte = false et score = 0.
    public function testReponsePassee(): void
    {
        $question = $this->creerQuestion('Tube', 3);
        $reponse = (new Reponse())
            ->setQuestion($question)
            ->setReponseDonnee('__SKIPPED__');

        $reponse->verifierReponse();

        $this->assertFalse($reponse->isEstCorrecte(), 'Une question passee ne doit jamais etre correcte');
        $this->assertSame(0, $reponse->getScoreObtenu(), 'Une question passee ne doit rapporter aucun point');
    }

    // Test 4 : on verifie que la comparaison est tolerante : la casse
    // (majuscules / minuscules) et les espaces autour de la reponse
    // ne doivent pas faire echouer le joueur. Ainsi "TUBE", "tube" et
    // "  Tube  " doivent tous etre acceptes si la bonne reponse est "Tube".
    public function testInsensibleCasseEspaces(): void
    {
        foreach (['TUBE', 'tube', '  Tube  '] as $variation) {
            $question = $this->creerQuestion('Tube', 1);
            $reponse = (new Reponse())
                ->setQuestion($question)
                ->setReponseDonnee($variation);

            $reponse->verifierReponse();

            $this->assertTrue(
                $reponse->isEstCorrecte(),
                sprintf('La variation "%s" doit etre acceptee comme bonne reponse', $variation)
            );
            $this->assertSame(1, $reponse->getScoreObtenu());
        }
    }
}
