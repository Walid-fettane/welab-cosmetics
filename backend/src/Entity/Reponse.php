<?php

namespace App\Entity;

use App\Repository\ReponseRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

// L'attribut ORM\Entity indique que cette classe correspond à une table SQL.
// repositoryClass désigne le Repository chargé de lire cette table.
#[ORM\Entity(repositoryClass: ReponseRepository::class)]
class Reponse
{
    // ORM\Id marque la propriété comme clé primaire.
    #[ORM\Id]
    // ORM\GeneratedValue : la base génère la valeur (auto-increment).
    #[ORM\GeneratedValue]
    // ORM\Column sans paramètre crée une colonne SQL du même nom que la propriété.
    #[ORM\Column]
    // ?int = entier ou null. L'id reste null tant que l'entité n'a pas été flushée.
    private ?int $id = null;

    // nullable: true autorise la valeur NULL en base SQL pour cette colonne.
    #[ORM\Column(length: 100, nullable: true)]
    private ?string $reponseDonnee = null;

    // Sans nullable, la colonne est NOT NULL en base ; le type bool est obligatoire.
    #[ORM\Column]
    private bool $estCorrecte = false;

    #[ORM\Column]
    // Assert\PositiveOrZero : règle de validation Symfony, refuse les nombres négatifs.
    #[Assert\PositiveOrZero]
    private int $scoreObtenu = 0;

    #[ORM\Column(nullable: true)]
    #[Assert\PositiveOrZero]
    private ?int $tempsReponseSec = null;

    // ManyToOne : plusieurs Reponse pointent vers une seule Question.
    // inversedBy nomme la Collection côté Question (ce côté-ci porte la clé étrangère).
    #[ORM\ManyToOne(inversedBy: 'reponses')]
    // JoinColumn(nullable: false) : la colonne question_id en base ne peut pas être NULL.
    #[ORM\JoinColumn(nullable: false)]
    private ?Question $question = null;

    // Idem : plusieurs Reponse appartiennent à une seule Partie.
    #[ORM\ManyToOne(inversedBy: 'reponses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Partie $partie = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReponseDonnee(): ?string
    {
        return $this->reponseDonnee;
    }

    public function setReponseDonnee(?string $reponseDonnee): static
    {
        $this->reponseDonnee = $reponseDonnee;
        return $this;
    }

    public function isEstCorrecte(): bool
    {
        return $this->estCorrecte;
    }

    public function setEstCorrecte(bool $estCorrecte): static
    {
        $this->estCorrecte = $estCorrecte;
        return $this;
    }

    public function getScoreObtenu(): int
    {
        return $this->scoreObtenu;
    }

    public function setScoreObtenu(int $scoreObtenu): static
    {
        $this->scoreObtenu = $scoreObtenu;
        return $this;
    }

    public function getTempsReponseSec(): ?int
    {
        return $this->tempsReponseSec;
    }

    public function setTempsReponseSec(?int $tempsReponseSec): static
    {
        $this->tempsReponseSec = $tempsReponseSec;
        return $this;
    }

    public function getQuestion(): ?Question
    {
        return $this->question;
    }

    public function setQuestion(?Question $question): static
    {
        $this->question = $question;
        return $this;
    }

    public function getPartie(): ?Partie
    {
        return $this->partie;
    }

    public function setPartie(?Partie $partie): static
    {
        $this->partie = $partie;
        return $this;
    }

    // Méthode métier : détermine si la réponse donnée est correcte et calcule le score.
    // Le retour static autorise le chaînage des appels (ex. $r->verifierReponse()->setX()).
    public function verifierReponse(): static
    {
        // ?-> est l'opérateur nullsafe (PHP 8). Si $this->question vaut null,
        // l'expression vaut null sans erreur, sinon on appelle getElementADeviner().
        $bonneReponse = $this->question?->getElementADeviner();

        // !== compare type ET valeur (comparaison stricte). On évite d'aller plus loin
        // si l'un des deux côtés vaut null pour ne pas trim() ou comparer du null.
        if ($this->reponseDonnee !== null && $bonneReponse !== null) {
            // trim() retire les espaces en début/fin ; strtoupper() met en majuscules.
            // === est la comparaison stricte (type ET valeur) : 0 === '0' renvoie false.
            $this->estCorrecte = (
                strtoupper(trim($this->reponseDonnee)) === strtoupper(trim($bonneReponse))
            );
        } else {
            // Filet de sécurité : sans réponse ou sans question, la réponse est incorrecte.
            $this->estCorrecte = false;
        }

        // Règle de scoring : on gagne le nombre de points de la difficulté (1, 2 ou 3)
        // si la réponse est correcte, sinon 0 point.
        if ($this->estCorrecte) {
            $this->scoreObtenu = $this->question->getDifficulte();
        } else {
            $this->scoreObtenu = 0;
        }

        // Retour de $this pour autoriser le chaînage de méthodes.
        return $this;
    }
}
