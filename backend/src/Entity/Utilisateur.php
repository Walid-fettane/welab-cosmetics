<?php

// Entite representant un administrateur du back-office We-Lab Cosmetics.
// Sert a stocker l'email, le mot de passe hashe, les roles et la date de creation du compte.

namespace App\Entity;

use App\Repository\UtilisateurRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UtilisateurRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
class Utilisateur implements UserInterface, PasswordAuthenticatedUserInterface
{
    // Identifiant unique de l'utilisateur, genere automatiquement par la base.
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    // Adresse email utilisee pour se connecter (doit etre unique en base).
    #[ORM\Column(length: 180)]
    private ?string $email = null;

    /**
     * @var list<string> Liste des roles de l'utilisateur (par exemple ROLE_ADMIN)
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string Mot de passe hashe (jamais stocke en clair)
     */
    #[ORM\Column]
    private ?string $password = null;

    // Date a laquelle le compte a ete cree, fixee automatiquement a la creation de l'objet.
    #[ORM\Column(type: 'datetime_immutable')]
    private ?\DateTimeImmutable $dateCreation = null;

    // Constructeur appele a la creation d'un nouvel utilisateur.
    // Fixe la date de creation a l'instant present et donne par defaut le role administrateur.
    public function __construct()
    {
        $this->dateCreation = new \DateTimeImmutable();
        $this->roles = ['ROLE_ADMIN'];
    }

    // Retourne l'identifiant interne (cle primaire) de l'utilisateur.
    public function getId(): ?int
    {
        return $this->id;
    }

    // Retourne l'adresse email de l'utilisateur.
    public function getEmail(): ?string
    {
        return $this->email;
    }

    // Definit l'adresse email de l'utilisateur.
    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    /**
     * Identifiant utilise par Symfony Security pour reconnaitre l'utilisateur (ici son email).
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * Retourne la liste des roles de l'utilisateur.
     * Le role ROLE_USER est ajoute automatiquement pour respecter la convention Symfony.
     *
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // On garantit que chaque utilisateur a au moins le role ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * Definit la liste des roles de l'utilisateur.
     *
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * Retourne le mot de passe hashe stocke en base.
     *
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    // Definit le mot de passe hashe de l'utilisateur (le hashage doit etre fait avant l'appel).
    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    // Retourne la date de creation du compte utilisateur.
    public function getDateCreation(): ?\DateTimeImmutable
    {
        return $this->dateCreation;
    }

    /**
     * Permet a Symfony de stocker l'utilisateur en session sans exposer le hash du mot de passe.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0".self::class."\0password"] = hash('crc32c', $this->password);

        return $data;
    }

    // Methode obsolete conservee pour compatibilite avec Symfony, sera supprimee en Symfony 8.
    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }
}
