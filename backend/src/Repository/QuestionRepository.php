<?php

namespace App\Repository;

use App\Entity\Question;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

// extends ServiceEntityRepository : classe parente fournie par DoctrineBundle.
// Elle donne accès gratuitement aux méthodes find(), findAll(), findBy(), findOneBy(),
// count(), etc. Notre Repository n'écrit donc que les requêtes SUR-MESURE.
class QuestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        // parent::__construct(...) : on indique à la classe parente quelle entité
        // ce Repository gère. Sans cet appel, find() ne saurait pas quelle table interroger.
        parent::__construct($registry, Question::class);
    }

    public function findByMiniJeuAndDifficulte(int $miniJeuId, int $difficulte, int $limit = 5): array
    {
        // createQueryBuilder('q') démarre une requête DQL (Doctrine Query Language)
        // avec 'q' comme alias de l'entité Question (équivalent du "FROM Question q" en SQL).
        $results = $this->createQueryBuilder('q')
            // andWhere ajoute une condition WHERE (combinées par AND).
            // ":miniJeuId" est un PARAMETRE NOMME : sa valeur sera injectée plus bas
            // par setParameter, ce qui empêche les injections SQL (équivalent des
            // requêtes préparées PDO).
            ->andWhere('q.miniJeu = :miniJeuId')
            ->andWhere('q.difficulte = :difficulte')
            ->setParameter('miniJeuId', $miniJeuId)
            ->setParameter('difficulte', $difficulte)
            // getQuery() compile la construction en objet Query.
            // ->getResult() exécute la requête et renvoie un TABLEAU d'entités
            // (potentiellement vide). Différent de :
            //   - getOneOrNullResult() : renvoie 1 entité ou null (exception si plusieurs)
            //   - getSingleResult()    : renvoie 1 entité ou lève une exception
            ->getQuery()
            ->getResult();

        // shuffle() mélange le tableau EN PLACE (par référence) et renvoie un booléen.
        // L'argument doit donc être une variable, pas une expression directe.
        shuffle($results);

        // array_slice($arr, offset, length) : extrait une portion du tableau.
        // Ici on ne garde que les $limit (5 par défaut) premiers éléments après mélange,
        // ce qui réalise un tirage aléatoire de N questions parmi celles disponibles.
        return array_slice($results, 0, $limit);
    }
}
