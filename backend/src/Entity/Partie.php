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

    // Types::DATETIME_MUTABLE = colonne SQL TIMESTAMP, mappée en \DateTime modifiable
    // (DATETIME_IMMUTABLE mapperait vers \DateTimeImmutable).
    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    // ?\DateTimeInterface : interface commune à \DateTime et \DateTimeImmutable.
    // Le \ initial force le namespace global (DateTime n'est pas dans App\Entity).
    private ?\DateTimeInterface $dateHeureDebut = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $dateHeureFin = null;

    #[ORM\Column]
    #[Assert\PositiveOrZero]
    private int $scoreTotal = 0;

    // ManyToOne : plusieurs Parties appartiennent à un seul Joueur.
    #[ORM\ManyToOne(inversedBy: 'parties')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Joueur $joueur = null;

    // ManyToMany : une Partie peut utiliser plusieurs MiniJeu et inversement.
    // inversedBy: 'parties' désigne le côté propriétaire de la relation.
    #[ORM\ManyToMany(targetEntity: MiniJeu::class, inversedBy: 'parties')]
    // JoinTable(name: 'utilise') : Doctrine crée une table SQL nommée 'utilise'
    // (clés étrangères partie_id et mini_jeu_id), au lieu du nom auto-généré.
    #[ORM\JoinTable(name: 'utilise')]
    private Collection $miniJeux;

    // OneToMany : une Partie possède plusieurs Reponse.
    // mappedBy nomme la propriété côté Reponse qui pointe vers Partie.
    // cascade: ['persist', 'remove'] : un persist/remove sur Partie est répercuté
    // automatiquement sur toutes ses Reponse liées.
    #[ORM\OneToMany(mappedBy: 'partie', targetEntity: Reponse::class, cascade: ['persist', 'remove'])]
    private Collection $reponses;

    public function __construct()
    {
        // ArrayCollection est l'implémentation Doctrine de l'interface Collection.
        // Sans cette initialisation, $this->miniJeux serait null et tout appel
        // à add()/contains() planterait avec une erreur PHP.
        $this->miniJeux = new ArrayCollection();
        $this->reponses = new ArrayCollection();
        // new \DateTime() crée un objet date à l'instant présent.
        // Le \ force le namespace global pour atteindre la classe native PHP.
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
        // Variable locale qui accumule les points obtenus sur toutes les réponses.
        $score = 0;
        // foreach itère sur la Collection Doctrine ; chaque $reponse est un objet Reponse.
        foreach ($this->reponses as $reponse) {
            // += additionne et assigne. getScoreObtenu() vaut 0 si la réponse était fausse.
            $score += $reponse->getScoreObtenu();
        }
        // Mise à jour des champs persistés. Aucun flush ici : le contrôleur s'en charge.
        $this->scoreTotal = $score;
        // count() est la méthode de la Collection (ArrayCollection), différente de la
        // fonction PHP count() qui n'opère que sur des tableaux ou objets Countable.
        $this->nbReponse = $this->reponses->count();
        // Retour de $this pour autoriser le chaînage des appels.
        return $this;
    }
}
