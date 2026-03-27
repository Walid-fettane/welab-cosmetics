<?php

namespace App\Repository;

use App\Entity\Question;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class QuestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Question::class);
    }

    public function findByMiniJeuAndDifficulte(int $miniJeuId, int $difficulte, int $limit = 5): array
    {
        $results = $this->createQueryBuilder('q')
            ->andWhere('q.miniJeu = :miniJeuId')
            ->andWhere('q.difficulte = :difficulte')
            ->setParameter('miniJeuId', $miniJeuId)
            ->setParameter('difficulte', $difficulte)
            ->getQuery()
            ->getResult();

        shuffle($results);

        return array_slice($results, 0, $limit);
    }
}