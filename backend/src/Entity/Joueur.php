<?php

namespace App\Entity;

use App\Repository\JoueurRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

// L'attribut ORM\Entity indique que cette classe correspond à une table SQL.
// Le paramètre repositoryClass désigne le Repository utilisé pour lire la table.
// Sans cet attribut, Doctrine ignorerait la classe.
#[ORM\Entity(repositoryClass: JoueurRepository::class)]
// L'attribut UniqueEntity empêche d'avoir deux joueurs avec le même pseudo
// (règle de validation appliquée avant l'INSERT en base).
#[UniqueEntity(fields: ['pseudo'], message: 'Ce pseudo est deja pris')]
class Joueur
{
    // ORM\Id marque la propriété comme clé primaire de la table.
    #[ORM\Id]
    // ORM\GeneratedValue laisse PostgreSQL générer la valeur (auto-increment).
    #[ORM\GeneratedValue]
    // ORM\Column sans paramètre crée une colonne SQL du même nom que la propriété.
    #[ORM\Column]
    // ?int = entier ou null. L'id reste null tant que l'entité n'a pas été flushée.
    private ?int $id = null;

    // length: 50 = colonne SQL VARCHAR(50). unique: true ajoute un index UNIQUE en base.
    #[ORM\Column(length: 50, unique: true)]
    #[Assert\NotBlank(message: 'Le pseudo est obligatoire')]
    // Assert\Length valide la longueur côté Symfony (avant l'INSERT). {{ limit }} est
    // un placeholder remplacé par la valeur de min/max au moment du message d'erreur.
    #[Assert\Length(min: 2, max: 50, minMessage: 'Le pseudo doit faire au moins {{ limit }} caracteres')]
    private ?string $pseudo = null;

    // OneToMany : un Joueur possède plusieurs Parties.
    // mappedBy: 'joueur' désigne la propriété côté Partie qui pointe vers Joueur
    // (la clé étrangère est portée par la table Partie, pas par Joueur).
    // cascade: ['persist', 'remove'] : un persist/remove sur Joueur est répercuté sur ses Parties.
    #[ORM\OneToMany(mappedBy: 'joueur', targetEntity: Partie::class, cascade: ['persist', 'remove'])]
    private Collection $parties;

    public function __construct()
    {
        // ArrayCollection est l'implémentation Doctrine de l'interface Collection.
        // Sans cette initialisation, $this->parties serait null et add()/contains() planteraient.
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
        // contains() évite d'ajouter deux fois la même Partie (idempotence).
        if (!$this->parties->contains($partie)) {
            $this->parties->add($partie);
            // Synchronisation de la relation bidirectionnelle : on met aussi à jour
            // le côté Partie pour que les deux côtés restent cohérents en mémoire.
            $partie->setJoueur($this);
        }
        return $this;
    }

    public function removePartie(Partie $partie): static
    {
        // removeElement() retire l'objet de la Collection ET renvoie true s'il y était.
        if ($this->parties->removeElement($partie)) {
            // === comparaison stricte : on dissocie seulement si la Partie pointait
            // vers CE joueur précis (pas un autre objet portant le même id).
            if ($partie->getJoueur() === $this) {
                $partie->setJoueur(null);
            }
        }
        return $this;
    }
}
