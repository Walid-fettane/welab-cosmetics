<?php

namespace App\Entity;

use App\Repository\JoueurRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

#[ORM\Entity(repositoryClass: JoueurRepository::class)]
#[UniqueEntity(fields: ['pseudo'], message: 'Ce pseudo est deja pris')]
class Joueur
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    #[Assert\NotBlank(message: 'Le pseudo est obligatoire')]
    #[Assert\Length(min: 2, max: 50, minMessage: 'Le pseudo doit faire au moins {{ limit }} caracteres')]
    private ?string $pseudo = null;

    #[ORM\OneToMany(mappedBy: 'joueur', targetEntity: Partie::class, cascade: ['persist', 'remove'])]
    private Collection $parties;

    public function __construct()
    {
        $this->parties = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPseudo(): ?string
    {
        return $this->pseudo;
    }

    public function setPseudo(string $pseudo): static
    {
        $this->pseudo = $pseudo;
        return $this;
    }

    /** @return Collection<int, Partie> */
    public function getParties(): Collection
    {
        return $this->parties;
    }

    public function addPartie(Partie $partie): static
    {
        if (!$this->parties->contains($partie)) {
            $this->parties->add($partie);
            $partie->setJoueur($this);
        }
        return $this;
    }

    public function removePartie(Partie $partie): static
    {
        if ($this->parties->removeElement($partie)) {
            if ($partie->getJoueur() === $this) {
                $partie->setJoueur(null);
            }
        }
        return $this;
    }
}
