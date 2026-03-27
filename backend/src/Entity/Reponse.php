<?php

namespace App\Entity;

use App\Repository\ReponseRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ReponseRepository::class)]
class Reponse
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $reponseDonnee = null;

    #[ORM\Column]
    private bool $estCorrecte = false;

    #[ORM\Column]
    #[Assert\PositiveOrZero]
    private int $scoreObtenu = 0;

    #[ORM\Column(nullable: true)]
    #[Assert\PositiveOrZero]
    private ?int $tempsReponseSec = null;

    #[ORM\ManyToOne(inversedBy: 'reponses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Question $question = null;

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

    public function verifierReponse(): static
    {
        $bonneReponse = $this->question?->getElementADeviner();

        if ($this->reponseDonnee !== null && $bonneReponse !== null) {
            $this->estCorrecte = (
                strtoupper(trim($this->reponseDonnee)) === strtoupper(trim($bonneReponse))
            );
        } else {
            $this->estCorrecte = false;
        }

        if ($this->estCorrecte) {
            $this->scoreObtenu = $this->question->getDifficulte();
        } else {
            $this->scoreObtenu = 0;
        }

        return $this;
    }
}
