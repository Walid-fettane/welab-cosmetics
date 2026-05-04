<?php

namespace App\Entity;

use App\Repository\MiniJeuRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: MiniJeuRepository::class)]
class MiniJeu
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    // length: 50 = colonne SQL VARCHAR(50).
    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    // Assert\Choice : restreint la valeur aux 3 chaînes listées dans choices.
    // C'est l'équivalent applicatif d'un ENUM SQL (validation côté Symfony).
    #[Assert\Choice(
        choices: ['ingredient_produit', 'produit_contenant', 'action_pole'],
        message: 'Type invalide. Choix possibles : ingredient_produit, produit_contenant, action_pole'
    )]
    private ?string $type = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    private ?string $nomMiniJeu = null;

    // nullable: true autorise NULL en base SQL (la description est optionnelle).
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $descriptionMiniJeu = null;

    // OneToMany : un MiniJeu possède plusieurs Question.
    // mappedBy: 'miniJeu' désigne la propriété côté Question qui pointe vers MiniJeu.
    #[ORM\OneToMany(mappedBy: 'miniJeu', targetEntity: Question::class, cascade: ['persist', 'remove'])]
    private Collection $questions;

    // ManyToMany : côté INVERSE de la relation déclarée dans Partie.
    // mappedBy: 'miniJeux' indique la propriété côté Partie. Ici on n'écrit RIEN
    // dans la table de liaison 'utilise' : le côté propriétaire (qui pilote la
    // table de jointure) est Partie, pas MiniJeu.
    #[ORM\ManyToMany(targetEntity: Partie::class, mappedBy: 'miniJeux')]
    private Collection $parties;

    public function __construct()
    {
        $this->questions = new ArrayCollection();
        $this->parties = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;
        return $this;
    }

    public function getNomMiniJeu(): ?string
    {
        return $this->nomMiniJeu;
    }

    public function setNomMiniJeu(string $nomMiniJeu): static
    {
        $this->nomMiniJeu = $nomMiniJeu;
        return $this;
    }

    public function getDescriptionMiniJeu(): ?string
    {
        return $this->descriptionMiniJeu;
    }

    public function setDescriptionMiniJeu(?string $descriptionMiniJeu): static
    {
        $this->descriptionMiniJeu = $descriptionMiniJeu;
        return $this;
    }

    /** @return Collection<int, Question> */
    public function getQuestions(): Collection
    {
        return $this->questions;
    }

    public function addQuestion(Question $question): static
    {
        if (!$this->questions->contains($question)) {
            $this->questions->add($question);
            $question->setMiniJeu($this);
        }
        return $this;
    }

    public function removeQuestion(Question $question): static
    {
        if ($this->questions->removeElement($question)) {
            if ($question->getMiniJeu() === $this) {
                $question->setMiniJeu(null);
            }
        }
        return $this;
    }

    /** @return Collection<int, Partie> */
    public function getParties(): Collection
    {
        return $this->parties;
    }
}
