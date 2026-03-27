<?php

namespace App\Entity;

use App\Repository\QuestionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: QuestionRepository::class)]
class Question
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'L\'enonce est obligatoire')]
    private ?string $enonce = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private ?string $elementADeviner = null;

    #[ORM\Column]
    #[Assert\Choice(choices: [1, 2, 3], message: 'La difficulte doit etre 1, 2 ou 3')]
    private ?int $difficulte = null;

    #[ORM\Column(type: 'json')]
    private array $choixPossibles = [];

    #[ORM\ManyToOne(inversedBy: 'questions')]
    #[ORM\JoinColumn(nullable: false)]
    private ?MiniJeu $miniJeu = null;

    #[ORM\OneToMany(mappedBy: 'question', targetEntity: Reponse::class, cascade: ['remove'])]
    private Collection $reponses;

    public function __construct()
    {
        $this->reponses = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEnonce(): ?string
    {
        return $this->enonce;
    }

    public function setEnonce(string $enonce): static
    {
        $this->enonce = $enonce;
        return $this;
    }

    public function getElementADeviner(): ?string
    {
        return $this->elementADeviner;
    }

    public function setElementADeviner(string $elementADeviner): static
    {
        $this->elementADeviner = $elementADeviner;
        return $this;
    }

    public function getDifficulte(): ?int
    {
        return $this->difficulte;
    }

    public function setDifficulte(int $difficulte): static
    {
        $this->difficulte = $difficulte;
        return $this;
    }

    public function getChoixPossibles(): array
    {
        return $this->choixPossibles;
    }

    public function setChoixPossibles(array $choixPossibles): static
    {
        $this->choixPossibles = $choixPossibles;
        return $this;
    }

    public function getMiniJeu(): ?MiniJeu
    {
        return $this->miniJeu;
    }

    public function setMiniJeu(?MiniJeu $miniJeu): static
    {
        $this->miniJeu = $miniJeu;
        return $this;
    }

    /** @return Collection<int, Reponse> */
    public function getReponses(): Collection
    {
        return $this->reponses;
    }
}
