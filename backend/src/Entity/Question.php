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

    // length: 255 = colonne SQL VARCHAR(255).
    #[ORM\Column(length: 255)]
    // \' échappe l'apostrophe à l'intérieur d'une chaîne PHP entourée de '...'.
    #[Assert\NotBlank(message: 'L\'enonce est obligatoire')]
    private ?string $enonce = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private ?string $elementADeviner = null;

    #[ORM\Column]
    // Assert\Choice : la valeur doit appartenir au tableau choices, sinon erreur de validation.
    #[Assert\Choice(choices: [1, 2, 3], message: 'La difficulte doit etre 1, 2 ou 3')]
    private ?int $difficulte = null;

    // type: 'json' demande à Doctrine de stocker le tableau PHP sous forme de JSON
    // (colonne SQL JSONB en PostgreSQL). La conversion array <-> JSON est automatique
    // à la lecture comme à l'écriture.
    #[ORM\Column(type: 'json')]
    private array $choixPossibles = [];

    // ManyToOne : plusieurs Question appartiennent à un seul MiniJeu.
    // inversedBy: 'questions' nomme la Collection côté MiniJeu (relation bidirectionnelle).
    #[ORM\ManyToOne(inversedBy: 'questions')]
    // JoinColumn(nullable: false) : la colonne mini_jeu_id en base ne peut pas être NULL.
    #[ORM\JoinColumn(nullable: false)]
    private ?MiniJeu $miniJeu = null;

    // OneToMany : une Question possède plusieurs Reponse.
    // cascade: ['remove'] : si on supprime la Question, Doctrine supprime aussi ses Reponse.
    // (Pas de 'persist' ici : les Reponse sont créées via le contrôleur, pas via la Question.)
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
