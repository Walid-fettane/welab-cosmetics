<?php

namespace App\Entity;

use App\Repository\PartieRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: PartieRepository::class)]
class Partie
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    #[Assert\PositiveOrZero]
    private int $nbReponse = 0;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $dateHeureDebut = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $dateHeureFin = null;

    #[ORM\Column]
    #[Assert\PositiveOrZero]
    private int $scoreTotal = 0;

    #[ORM\ManyToOne(inversedBy: 'parties')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Joueur $joueur = null;

    #[ORM\ManyToMany(targetEntity: MiniJeu::class, inversedBy: 'parties')]
    #[ORM\JoinTable(name: 'utilise')]
    private Collection $miniJeux;

    #[ORM\OneToMany(mappedBy: 'partie', targetEntity: Reponse::class, cascade: ['persist', 'remove'])]
    private Collection $reponses;

    public function __construct()
    {
        $this->miniJeux = new ArrayCollection();
        $this->reponses = new ArrayCollection();
        $this->dateHeureDebut = new \DateTime();
        $this->nbReponse = 0;
        $this->scoreTotal = 0;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNbReponse(): int
    {
        return $this->nbReponse;
    }

    public function setNbReponse(int $nbReponse): static
    {
        $this->nbReponse = $nbReponse;
        return $this;
    }

    public function getDateHeureDebut(): ?\DateTimeInterface
    {
        return $this->dateHeureDebut;
    }

    public function setDateHeureDebut(\DateTimeInterface $dateHeureDebut): static
    {
        $this->dateHeureDebut = $dateHeureDebut;
        return $this;
    }

    public function getDateHeureFin(): ?\DateTimeInterface
    {
        return $this->dateHeureFin;
    }

    public function setDateHeureFin(?\DateTimeInterface $dateHeureFin): static
    {
        $this->dateHeureFin = $dateHeureFin;
        return $this;
    }

    public function getScoreTotal(): int
    {
        return $this->scoreTotal;
    }

    public function setScoreTotal(int $scoreTotal): static
    {
        $this->scoreTotal = $scoreTotal;
        return $this;
    }

    public function getJoueur(): ?Joueur
    {
        return $this->joueur;
    }

    public function setJoueur(?Joueur $joueur): static
    {
        $this->joueur = $joueur;
        return $this;
    }

    /** @return Collection<int, MiniJeu> */
    public function getMiniJeux(): Collection
    {
        return $this->miniJeux;
    }

    public function addMiniJeux(MiniJeu $miniJeu): static
    {
        if (!$this->miniJeux->contains($miniJeu)) {
            $this->miniJeux->add($miniJeu);
        }
        return $this;
    }

    public function removeMiniJeux(MiniJeu $miniJeu): static
    {
        $this->miniJeux->removeElement($miniJeu);
        return $this;
    }

    /** @return Collection<int, Reponse> */
    public function getReponses(): Collection
    {
        return $this->reponses;
    }

    public function addReponse(Reponse $reponse): static
    {
        if (!$this->reponses->contains($reponse)) {
            $this->reponses->add($reponse);
            $reponse->setPartie($this);
        }
        return $this;
    }

    public function removeReponse(Reponse $reponse): static
    {
        if ($this->reponses->removeElement($reponse)) {
            if ($reponse->getPartie() === $this) {
                $reponse->setPartie(null);
            }
        }
        return $this;
    }

    public function recalculerScore(): static
    {
        $score = 0;
        foreach ($this->reponses as $reponse) {
            $score += $reponse->getScoreObtenu();
        }
        $this->scoreTotal = $score;
        $this->nbReponse = $this->reponses->count();
        return $this;
    }
}
