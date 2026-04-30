<?php

namespace App\DataFixtures;

use App\Entity\Joueur;
use App\Entity\MiniJeu;
use App\Entity\Partie;
use App\Entity\Question;
// On importe l'entite Utilisateur pour pouvoir creer un compte admin
use App\Entity\Utilisateur;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Faker\Factory;
// Service Symfony qui sait transformer un mot de passe en clair en mot de passe hache (jamais en clair en base)
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    // Constructeur : Symfony injecte automatiquement le service de hachage des mots de passe
    public function __construct(
        private UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        $faker = Factory::create('fr_FR');

        // ============================================================
        // 1. CREER LES 3 MINI-JEUX
        // ============================================================

        $miniJeuIngredient = (new MiniJeu())
            ->setType('ingredient_produit')
            ->setNomMiniJeu('Ingredients et Produits')
            ->setDescriptionMiniJeu('Associe chaque ingredient a son produit cosmetique');
        $manager->persist($miniJeuIngredient);

        $miniJeuContenant = (new MiniJeu())
            ->setType('produit_contenant')
            ->setNomMiniJeu('Produits et Contenants')
            ->setDescriptionMiniJeu('Associe chaque produit a son type de packaging');
        $manager->persist($miniJeuContenant);

        $miniJeuAction = (new MiniJeu())
            ->setType('action_pole')
            ->setNomMiniJeu('Actions et Poles')
            ->setDescriptionMiniJeu('Associe chaque action a son departement dans l\'industrie cosmetique');
        $manager->persist($miniJeuAction);

        // ============================================================
        // 2. QUESTIONS - MINI-JEU 1 : Ingredient -> Produit
        // ============================================================

        $questionsIngredient = [
            ['Quel produit contient generalement du Fluor ?', 'Dentifrice', 1,
             ['Dentifrice', 'Shampoing', 'Creme visage', 'Vernis']],
            ['Quel produit contient du Beurre de karite ?', 'Creme mains', 1,
             ['Creme mains', 'Gel douche', 'Mascara', 'Dentifrice']],
            ['Quel produit contient de l\'Aloe Vera ?', 'Gel douche', 1,
             ['Gel douche', 'Rouge a levres', 'Vernis', 'Fond de teint']],
            ['Quel produit contient du Menthol ?', 'Dentifrice', 1,
             ['Dentifrice', 'Creme solaire', 'Mascara', 'Parfum']],
            ['Quel produit contient de la Keratine ?', 'Shampoing', 1,
             ['Shampoing', 'Dentifrice', 'Creme mains', 'Deodorant']],
            ['Quel produit contient de l\'Acide hyaluronique ?', 'Serum visage', 2,
             ['Serum visage', 'Shampoing', 'Dentifrice', 'Gel douche']],
            ['Quel produit contient du Retinol ?', 'Creme anti-age', 2,
             ['Creme anti-age', 'Deodorant', 'Shampoing', 'Baume a levres']],
            ['Quel produit contient du Zinc ?', 'Creme solaire', 2,
             ['Creme solaire', 'Parfum', 'Mascara', 'Gel coiffant']],
            ['Quel produit contient de la Glycerine ?', 'Lait corporel', 2,
             ['Lait corporel', 'Vernis', 'Mascara', 'Eau de toilette']],
            ['Quel produit contient du Panthenol (provitamine B5) ?', 'Soin capillaire', 3,
             ['Soin capillaire', 'Rouge a levres', 'Fond de teint', 'Parfum']],
            ['Quel produit contient du Niacinamide ?', 'Serum anti-taches', 3,
             ['Serum anti-taches', 'Dentifrice', 'Gel douche', 'Deodorant']],
            ['Quel produit contient du Squalane ?', 'Huile visage', 3,
             ['Huile visage', 'Shampoing', 'Mousse a raser', 'Laque cheveux']],
        ];

        foreach ($questionsIngredient as [$enonce, $reponse, $diff, $choix]) {
            $question = (new Question())
                ->setEnonce($enonce)
                ->setElementADeviner($reponse)
                ->setDifficulte($diff)
                ->setChoixPossibles($choix)
                ->setMiniJeu($miniJeuIngredient);
            $manager->persist($question);
        }

        // ============================================================
        // 3. QUESTIONS - MINI-JEU 2 : Produit -> Contenant
        // ============================================================

        $questionsContenant = [
            ['Dans quel contenant met-on du Dentifrice ?', 'Tube', 1,
             ['Tube', 'Pot', 'Spray', 'Flacon pompe']],
            ['Dans quel contenant met-on du Shampoing ?', 'Bouteille', 1,
             ['Bouteille', 'Tube', 'Poudrier', 'Stick']],
            ['Dans quel contenant met-on du Parfum ?', 'Spray', 1,
             ['Spray', 'Tube', 'Pot', 'Sachet']],
            ['Dans quel contenant met-on du Mascara ?', 'Flaconnette brosse', 1,
             ['Flaconnette brosse', 'Tube', 'Roll on', 'Spray']],
            ['Dans quel contenant met-on un Baume a levres ?', 'Stick', 1,
             ['Stick', 'Bouteille', 'Aerosol', 'Foamer']],
            ['Dans quel contenant met-on un Serum visage ?', 'Flacon compte-gouttes', 2,
             ['Flacon compte-gouttes', 'Tube', 'Pot', 'Aerosol']],
            ['Dans quel contenant met-on du Gel lavant moussant ?', 'Foamer', 2,
             ['Foamer', 'Bouteille', 'Stick', 'Poudrier']],
            ['Dans quel contenant met-on du Deodorant ?', 'Roll on', 2,
             ['Roll on', 'Tube', 'Foamer', 'Flacon compte-gouttes']],
            ['Dans quel contenant met-on du Vernis a ongles ?', 'Flacon pinceau', 2,
             ['Flacon pinceau', 'Spray', 'Stick', 'Sachet']],
            ['Dans quel contenant met-on du Fond de teint fragile ?', 'Flacon Airless', 3,
             ['Flacon Airless', 'Bouteille', 'Tube', 'Pot']],
            ['Dans quel contenant met-on de la Creme riche sterile ?', 'Pot Airless', 3,
             ['Pot Airless', 'Pot', 'Tube', 'Flacon pompe']],
            ['Dans quel contenant met-on du Shampoing sec ?', 'Aerosol', 3,
             ['Aerosol', 'Bouteille', 'Foamer', 'Spray']],
        ];

        foreach ($questionsContenant as [$enonce, $reponse, $diff, $choix]) {
            $question = (new Question())
                ->setEnonce($enonce)
                ->setElementADeviner($reponse)
                ->setDifficulte($diff)
                ->setChoixPossibles($choix)
                ->setMiniJeu($miniJeuContenant);
            $manager->persist($question);
        }

        // ============================================================
        // 4. QUESTIONS - MINI-JEU 3 : Action -> Pole/Metier
        // ============================================================

        $questionsAction = [
            ['Ou se fait la "mise en bouteille du shampoing" ?', 'Unite de production', 1,
             ['Unite de production', 'Laboratoire d\'analyse', 'Service marketing', 'Entrepot']],
            ['Qui concoit le logo d\'un nouveau produit ?', 'Service marketing', 1,
             ['Service marketing', 'Laboratoire R&D', 'Unite de production', 'Controle qualite']],
            ['Ou sont cultivees les plantes aromatiques ?', 'Exploitation agricole', 1,
             ['Exploitation agricole', 'Laboratoire', 'Entrepot', 'Bureau d\'etudes']],
            ['Ou sont stockes les produits finis ?', 'Entrepot logistique', 1,
             ['Entrepot logistique', 'Laboratoire', 'Unite de production', 'Service commercial']],
            ['Ou se fait l\'"objectivation d\'un actif" ?', 'Laboratoire d\'analyse', 2,
             ['Laboratoire d\'analyse', 'Unite de production', 'Service marketing', 'Entrepot']],
            ['Qui teste la stabilite d\'une formule ?', 'Controle qualite', 2,
             ['Controle qualite', 'Service marketing', 'Exploitation agricole', 'Logistique']],
            ['Qui developpe une nouvelle formule de creme ?', 'Laboratoire R&D', 2,
             ['Laboratoire R&D', 'Unite de production', 'Service commercial', 'Entrepot']],
            ['Qui choisit la forme du flacon ?', 'Bureau d\'etudes packaging', 2,
             ['Bureau d\'etudes packaging', 'Laboratoire', 'Service marketing', 'Production']],
            ['Qui verifie la conformite reglementaire INCI ?', 'Affaires reglementaires', 3,
             ['Affaires reglementaires', 'Laboratoire R&D', 'Marketing', 'Production']],
            ['Qui realise les tests sur peaux sensibles ?', 'Laboratoire d\'evaluation clinique', 3,
             ['Laboratoire d\'evaluation clinique', 'Controle qualite', 'R&D', 'Marketing']],
            ['Ou se fait l\'injection plastique des flacons ?', 'Sous-traitant packaging', 3,
             ['Sous-traitant packaging', 'Unite de production', 'Bureau d\'etudes', 'Entrepot']],
        ];

        foreach ($questionsAction as [$enonce, $reponse, $diff, $choix]) {
            $question = (new Question())
                ->setEnonce($enonce)
                ->setElementADeviner($reponse)
                ->setDifficulte($diff)
                ->setChoixPossibles($choix)
                ->setMiniJeu($miniJeuAction);
            $manager->persist($question);
        }

        // ============================================================
        // 5. JOUEURS DE TEST
        // ============================================================

        $joueurs = [];
        $pseudos = ['Wu-Zi', 'CosmeticQueen', 'LaboMaster', 'ChimieForever', 'TesteurPro'];

        foreach ($pseudos as $pseudo) {
            $joueur = (new Joueur())->setPseudo($pseudo);
            $manager->persist($joueur);
            $joueurs[] = $joueur;
        }

        // ============================================================
        // 6. PARTIES DE TEST
        // ============================================================

        foreach ($joueurs as $joueur) {
            $partie = (new Partie())
                ->setJoueur($joueur)
                ->setDateHeureDebut($faker->dateTimeBetween('-1 month', 'now'));

            $partie->addMiniJeux($miniJeuIngredient);
            $partie->addMiniJeux($miniJeuContenant);
            $partie->addMiniJeux($miniJeuAction);

            if ($joueur !== end($joueurs)) {
                $partie->setDateHeureFin(
                    $faker->dateTimeBetween($partie->getDateHeureDebut(), 'now')
                );
            }

            $manager->persist($partie);
        }

        // ============================================================
        // 7. ADMINISTRATEUR PAR DEFAUT
        // ============================================================
        // On cree un compte administrateur de base pour pouvoir se connecter a l'espace admin
        $admin = new Utilisateur();
        // Email qui servira d'identifiant de connexion
        $admin->setEmail('admin@welab.fr');
        // Le role ROLE_ADMIN donne acces aux routes protegees /api/admin/*
        $admin->setRoles(['ROLE_ADMIN']);
        // On hache le mot de passe "admin1234" avant de le stocker (jamais en clair !)
        $admin->setPassword(
            $this->passwordHasher->hashPassword($admin, 'admin1234')
        );
        // On demande a Doctrine de preparer la sauvegarde de cet utilisateur
        $manager->persist($admin);

        // ============================================================
        // 8. SAUVEGARDER EN BDD
        // ============================================================
        $manager->flush();
    }
}
