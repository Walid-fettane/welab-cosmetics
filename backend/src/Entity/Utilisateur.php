<?php

// Entite representant un administrateur du back-office We-Lab Cosmetics.
// Sert a stocker l'email, le mot de passe hashe, les roles et la date de creation du compte.

namespace App\Entity;

use App\Repository\UtilisateurRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UtilisateurRepository::class)]
// UniqueConstraint(name, fields) : Doctrine crée un index UNIQUE en base SQL nommé
// UNIQ_IDENTIFIER_EMAIL portant sur la colonne email (équivalent d'un CONSTRAINT SQL).
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
// implements UserInterface : oblige Symfony Security à reconnaître la classe comme
// utilisateur (méthodes getUserIdentifier, getRoles, eraseCredentials obligatoires).
// implements PasswordAuthenticatedUserInterface : ajoute getPassword(), nécessaire pour
// que le firewall puisse comparer le mot de passe envoyé au mot de passe haché en base.
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
    // type 'datetime_immutable' = colonne SQL TIMESTAMP, mappée en \DateTimeImmutable
    // (objet date qui ne peut pas être modifié après création, plus sûr que \DateTime).
    #[ORM\Column(type: 'datetime_immutable')]
    private ?\DateTimeImmutable $dateCreation = null;

    // Constructeur appele a la creation d'un nouvel utilisateur.
    // Fixe la date de creation a l'instant present et donne par defaut le role administrateur.
    public function __construct()
    {
        // new \DateTimeImmutable() : objet date à l'instant présent. Le \ initial force
        // le namespace global (DateTimeImmutable est une classe native PHP, pas dans App).
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
    // Méthode imposée par UserInterface. Symfony l'appelle pour identifier l'utilisateur
    // dans la session et dans les logs. Le cast (string) garantit le type retour même
    // si $this->email est null (transformé alors en chaîne vide).
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
    // Méthode imposée par UserInterface. Symfony l'appelle pour vérifier les droits
    // (ex. isGranted('ROLE_ADMIN')). array_unique évite les doublons si ROLE_USER
    // était déjà présent dans $this->roles.
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
    // Méthode magique PHP appelée automatiquement par serialize($this). Ce code est
    // généré par la commande "make:user" : Symfony s'en sert pour mettre l'utilisateur
    // en session/cache sans transporter le hash brut du mot de passe.
    public function __serialize(): array
    {
        // (array) $obj : cast d'objet en tableau associatif. Pour les propriétés
        // PRIVÉES, PHP préfixe automatiquement la clé par "\0NomDeClasse\0"
        // (où \0 est le caractère NUL, octet de valeur 0). C'est la convention
        // interne PHP pour distinguer une propriété privée d'une propriété publique
        // du même nom dans la représentation tableau d'un objet.
        $data = (array) $this;
        // self::class renvoie le nom complet de la classe ("App\Entity\Utilisateur").
        // hash('crc32c', $hash) calcule un hash CRC32C (32 bits) du mot de passe DÉJÀ
        // haché : on remplace donc le hash bcrypt complet par une empreinte courte,
        // suffisante pour invalider la session si le mot de passe change, mais inutile
        // à un attaquant (impossible de remonter au hash bcrypt depuis ce CRC).
        $data["\0".self::class."\0password"] = hash('crc32c', $this->password);

        return $data;
    }

    // Methode obsolete conservee pour compatibilite avec Symfony, sera supprimee en Symfony 8.
    // L'attribut #[\Deprecated] (PHP 8.4+) annote la méthode comme obsolète : tout
    // appel direct générera un warning "deprecated" dans les logs PHP.
    // Le \ initial force le namespace global (Deprecated est un attribut natif PHP).
    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }
}
