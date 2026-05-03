<?php

// Ce fichier contient les tests automatises de l'entite Partie.
// On verifie ici la methode recalculerScore(), qui parcourt toutes les
// reponses d'une partie pour calculer le score total et le nombre de
// reponses. C'est cette methode qui permet d'afficher au joueur son
// score final a la fin de la partie.
// Ces tests tournent en memoire (sans base de donnees) pour rester
// rapides et independants de l'environnement.

namespace App\Tests\Entity;

use App\Entity\Joueur;
use App\Entity\MiniJeu;
use App\Entity\Partie;
use App\Entity\Question;
use App\Entity\Reponse;
use PHPUnit\Framework\TestCase;

final class PartieTest extends TestCase
{
    // Petite fabrique privee qui construit une Reponse prete a etre attachee
    // a une Partie. On y force directement le score obtenu pour isoler le
    // test : on veut tester recalculerScore() seul, pas verifierReponse().
    private function creerReponseAvecScore(int $score): Reponse
    {
        $miniJeu = (new MiniJeu())
            ->setType('ingredient_produit')
            ->setNomMiniJeu('Mini-jeu de test');

        $question = (new Question())
            ->setEnonce('Question de test')
            ->setElementADeviner('X')
            ->setDifficulte($score > 0 ? $score : 1)
            ->setMiniJeu($miniJeu);

        return (new Reponse())
            ->setQuestion($question)
            ->setScoreObtenu($score)
            ->setEstCorrecte($score > 0);
    }

    // Test 5 : on cree une partie, on lui attache 3 reponses qui valent
    // respectivement 1, 2 et 3 points, puis on appelle recalculerScore().
    // On verifie que le score total est bien la somme : 1 + 2 + 3 = 6.
    public function testRecalculerScoreSomme(): void
    {
        $joueur = (new Joueur())->setPseudo('JoueurTest');
        $partie = (new Partie())->setJoueur($joueur);

        $partie->addReponse($this->creerReponseAvecScore(1));
        $partie->addReponse($this->creerReponseAvecScore(2));
        $partie->addReponse($this->creerReponseAvecScore(3));

        $partie->recalculerScore();

        $this->assertSame(6, $partie->getScoreTotal(), 'Le score total doit etre la somme des scores des reponses');
    }

    // Test 6 : on verifie que recalculerScore() met aussi a jour le
    // compteur nb_reponse avec le nombre exact de reponses de la partie.
    // Avec 3 reponses ajoutees, on doit obtenir nb_reponse = 3.
    public function testRecalculerScoreNbReponse(): void
    {
        $joueur = (new Joueur())->setPseudo('JoueurTest');
        $partie = (new Partie())->setJoueur($joueur);

        $partie->addReponse($this->creerReponseAvecScore(1));
        $partie->addReponse($this->creerReponseAvecScore(0));
        $partie->addReponse($this->creerReponseAvecScore(2));

        $partie->recalculerScore();

        $this->assertSame(3, $partie->getNbReponse(), 'Le compteur nb_reponse doit refleter le nombre de reponses attachees');
    }
}
