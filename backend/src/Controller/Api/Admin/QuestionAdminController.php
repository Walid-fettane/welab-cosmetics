<?php

// Controller d'administration des questions du jeu We-Lab Cosmetics.
//
// Role : exposer les operations CRUD (Create / Read / Update / Delete)
// sur l'entite Question, ainsi qu'une route auxiliaire pour lister les
// mini-jeux (necessaire au frontend admin pour remplir le menu deroulant
// du formulaire d'ajout / modification de question).
//
// Pourquoi un controller separe de MeController ? Pour respecter le
// principe de responsabilite unique : MeController s'occupe uniquement
// de l'identite de l'admin connecte, alors que ce controller-ci gere
// uniquement les questions. Chaque controller reste petit et facile a relire.
//
// Pourquoi sous /api/admin ? Parce que le firewall "api_admin" defini
// dans config/packages/security.yaml protege toutes les routes commencant
// par /api/admin et impose le role ROLE_ADMIN. Toute requete sans JWT
// valide est rejetee avec une reponse 401 avant meme d'atteindre ce
// controller : aucun controle d'acces supplementaire n'est donc necessaire ici.

namespace App\Controller\Api\Admin;

use App\Entity\Question;
use App\Repository\MiniJeuRepository;
use App\Repository\QuestionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// Le mot-cle "final" interdit a une autre classe d'heriter de celle-ci.
// C'est une convention du style Loulergue : un controller doit etre une
// "feuille" de l'arbre d'heritage, pour eviter qu'un developpeur futur
// ne vienne en derouter le comportement via une sous-classe.
//
// L'attribut #[Route('/api/admin')] place sur la CLASSE definit le prefixe
// commun a toutes les routes du controller : chaque #[Route] place sur une
// methode sera automatiquement prefixe par "/api/admin".
#[Route('/api/admin')]
final class QuestionAdminController extends AbstractController
{
    // Constructeur PHP 8 utilisant la "constructor property promotion".
    // Ecrire "private EntityManagerInterface $em" comme parametre cree
    // automatiquement la propriete privee $this->em ET lui assigne la
    // valeur passee a l'instanciation. C'est un raccourci qui evite
    // d'ecrire la declaration de propriete + l'assignation manuellement.
    //
    // Symfony fait de l'autowiring : il regarde le type de chaque parametre
    // et injecte tout seul le bon service depuis son container.
    public function __construct(
        // EntityManagerInterface est le point d'entree de Doctrine pour
        // PERSISTER (sauvegarder) ou SUPPRIMER des entites en base.
        // C'est lui qui orchestre les transactions et execute les requetes SQL.
        private EntityManagerInterface $em,
        // Le repository sait LIRE les Question en base (find, findBy, ...).
        private QuestionRepository $questionRepository,
        // Idem pour les MiniJeu, utile pour valider la relation et pour
        // l'endpoint /api/admin/mini-jeux.
        private MiniJeuRepository $miniJeuRepository,
    ) {}

    // ============================================================
    // GET /api/admin/questions
    // ------------------------------------------------------------
    // Renvoie la liste de toutes les questions enregistrees, triees
    // par mini-jeu, puis par difficulte, puis par id (ordre stable
    // et previsible pour l'affichage dans la table d'administration).
    //
    // Codes HTTP renvoyes :
    //   - 200 OK : la liste (eventuellement vide) est renvoyee.
    // ============================================================
    //
    // Decorateur #[Route(...)] place sur la methode :
    //   - 1er argument 'path' : '/questions' est concatene au prefixe
    //     '/api/admin' defini sur la classe -> route finale /api/admin/questions.
    //   - 'name'    : identifiant interne de la route (utile pour generer
    //                 des URL ou pour la deboguer via "debug:router").
    //   - 'methods' : liste des verbes HTTP acceptes ; toute autre methode
    //                 sur ce path renverra 405 Method Not Allowed.
    #[Route('/questions', name: 'api_admin_questions_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        // findBy(criteres, tri) : criteres vides => on prend TOUTES les
        // questions. Le 2e argument est un tableau de tri (colonne => sens).
        // Doctrine traduit la relation "miniJeu" en sa colonne de cle
        // etrangere "mini_jeu_id" pour l'ORDER BY SQL.
        $questions = $this->questionRepository->findBy(
            [],
            ['miniJeu' => 'ASC', 'difficulte' => 'ASC', 'id' => 'ASC'],
        );

        // array_map applique une fonction a chaque element du tableau.
        // La fleche "fn(...) => ..." est une "arrow function" PHP qui
        // capture automatiquement $this. On delegue la transformation
        // Question -> tableau associatif a une methode privee dediee,
        // pour eviter de dupliquer le format JSON d'un endpoint a l'autre.
        $payload = array_map(fn(Question $q) => $this->serialiserQuestion($q), $questions);

        // $this->json() est un helper d'AbstractController qui transforme
        // un tableau PHP en JsonResponse (status 200 par defaut). En interne
        // il appelle le composant Serializer de Symfony pour produire le JSON.
        return $this->json($payload);
    }

    // ============================================================
    // POST /api/admin/questions
    // ------------------------------------------------------------
    // Cree une nouvelle question a partir d'un corps JSON.
    //
    // Codes HTTP renvoyes :
    //   - 201 Created     : la question a ete enregistree, son id est renvoye.
    //   - 400 Bad Request : le JSON est invalide ou une regle de validation echoue.
    // ============================================================
    #[Route('/questions', name: 'api_admin_questions_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        // json_decode(corps, true) : le 2e argument "true" demande un tableau
        // associatif (cle => valeur) plutot qu'un objet stdClass. C'est plus
        // pratique pour acceder aux champs avec $data['enonce'] que par
        // notation objet $data->enonce.
        $data = json_decode($request->getContent(), true);

        // Si le decodage echoue (JSON malforme), json_decode renvoie null.
        // On refuse alors immediatement la requete avec un 400.
        if (!is_array($data)) {
            // Response::HTTP_BAD_REQUEST vaut 400. Utiliser la constante
            // (plutot que le nombre 400 directement) rend l'intention
            // explicite a la lecture et evite les fautes de frappe.
            return $this->json(['error' => 'Corps JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        // On instancie une Question vide ; ses setters seront appliques
        // par la methode de validation si toutes les regles passent.
        $question = new Question();

        // Validation + remplissage en une seule operation. Si un probleme
        // est detecte, la methode renvoie deja une JsonResponse 400 toute
        // prete ; sinon elle renvoie null et a applique les setters sur $question.
        $erreur = $this->validerEtAppliquer($data, $question);
        if ($erreur !== null) {
            return $erreur;
        }

        // persist() : on indique a Doctrine "je veux sauvegarder cette
        // nouvelle entite". A ce stade, RIEN n'est ecrit en base : l'entite
        // est simplement marquee comme "a inserer" dans l'unit of work.
        $this->em->persist($question);

        // flush() : execute reellement les requetes SQL accumulees (INSERT,
        // UPDATE, DELETE) en une seule transaction. C'est seulement apres
        // ce flush que l'id auto-genere est disponible sur l'entite.
        $this->em->flush();

        // Response::HTTP_CREATED vaut 201, la convention REST pour signaler
        // qu'une ressource vient d'etre creee. Le corps de reponse contient
        // la question telle qu'elle a ete enregistree (id inclus).
        return $this->json($this->serialiserQuestion($question), Response::HTTP_CREATED);
    }

    // ============================================================
    // PUT /api/admin/questions/{id}
    // ------------------------------------------------------------
    // Met a jour une question existante a partir d'un corps JSON.
    //
    // Codes HTTP renvoyes :
    //   - 200 OK          : la question a ete mise a jour.
    //   - 400 Bad Request : JSON invalide ou validation en echec.
    //   - 404 Not Found   : aucune question n'existe avec cet id.
    // ============================================================
    //
    // requirements: ['id' => '\d+'] : on impose que la portion {id} de l'URL
    // ne contienne QUE des chiffres. Une URL comme /questions/abc ne sera
    // alors meme pas routee jusqu'a cette methode (404 par le routeur).
    #[Route('/questions/{id}', name: 'api_admin_questions_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request): JsonResponse
    {
        // find($id) cherche par CLE PRIMAIRE. C'est l'appel le plus rapide
        // de Doctrine (souvent servi depuis le cache d'identite). Il renvoie
        // l'entite trouvee, ou null si l'id n'existe pas.
        // (A distinguer de findOneBy([...]) qui filtre sur des colonnes
        // arbitraires comme un email, un slug, etc.)
        $question = $this->questionRepository->find($id);
        if ($question === null) {
            return $this->json(['error' => 'Question non trouvee'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Corps JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        // Memes regles de validation que pour la creation : on reutilise
        // la methode privee (DRY). Cela garantit qu'un payload accepte en
        // POST sera aussi accepte en PUT, sans risque d'incoherence.
        $erreur = $this->validerEtAppliquer($data, $question);
        if ($erreur !== null) {
            return $erreur;
        }

        // Pas besoin de persist() ici : Doctrine "suit" deja l'entite
        // chargee via find(). Un simple flush() declenche le UPDATE SQL
        // automatiquement pour les champs qui ont change.
        $this->em->flush();

        return $this->json($this->serialiserQuestion($question));
    }

    // ============================================================
    // DELETE /api/admin/questions/{id}
    // ------------------------------------------------------------
    // Supprime une question. Les Reponse liees sont supprimees
    // automatiquement grace a "cascade: ['remove']" declare sur la relation
    // OneToMany dans Entity/Question.php. Pas de risque de violation de
    // contrainte d'integrite referentielle.
    //
    // Codes HTTP renvoyes :
    //   - 204 No Content : suppression effectuee, aucun corps en reponse.
    //   - 404 Not Found  : aucune question n'existe avec cet id.
    // ============================================================
    #[Route('/questions/{id}', name: 'api_admin_questions_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $question = $this->questionRepository->find($id);
        if ($question === null) {
            return $this->json(['error' => 'Question non trouvee'], Response::HTTP_NOT_FOUND);
        }

        // remove() marque l'entite pour suppression. Le DELETE SQL ne sera
        // execute qu'au flush() suivant. La cascade declaree dans l'entite
        // s'occupe egalement de supprimer toutes les Reponse rattachees.
        $this->em->remove($question);
        $this->em->flush();

        // Response::HTTP_NO_CONTENT vaut 204 : la convention REST pour dire
        // "operation reussie, mais je n'ai rien a renvoyer dans le corps".
        // On utilise ici JsonResponse explicitement (avec null en corps) plutot
        // que $this->json() pour bien marquer qu'aucun contenu ne sera serialise.
        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    // ============================================================
    // GET /api/admin/mini-jeux
    // ------------------------------------------------------------
    // Renvoie la liste minimale des mini-jeux (id, type, nomMiniJeu).
    // Utilisee par le frontend admin pour remplir le menu deroulant
    // "miniJeu" du formulaire d'ajout / modification de question.
    //
    // Codes HTTP renvoyes :
    //   - 200 OK : la liste des mini-jeux.
    // ============================================================
    #[Route('/mini-jeux', name: 'api_admin_minijeux_index', methods: ['GET'])]
    public function miniJeux(): JsonResponse
    {
        // findAll() est equivalent a findBy([]) : on recupere tous les
        // enregistrements de la table mini_jeu, sans filtre ni tri impose.
        $miniJeux = $this->miniJeuRepository->findAll();

        // Conversion en tableaux associatifs limites aux 3 champs demandes.
        // Symfony convertit ensuite ce tableau associatif en JSON via le
        // composant Serializer (appele en coulisse par $this->json()).
        return $this->json(array_map(fn($mj) => [
            'id' => $mj->getId(),
            'type' => $mj->getType(),
            'nomMiniJeu' => $mj->getNomMiniJeu(),
        ], $miniJeux));
    }

    // ============================================================
    // METHODES PRIVEES
    // ============================================================

    // Methode partagee entre create() et update() : valide les donnees
    // recues et, en cas de succes, applique les setters sur la Question
    // passee en parametre.
    //
    // Convention de retour :
    //   - null         : tout est valide, l'entite a ete remplie.
    //   - JsonResponse : une erreur a ete detectee, le caller doit la renvoyer telle quelle.
    private function validerEtAppliquer(array $data, Question $question): ?JsonResponse
    {
        // ----- enonce -----
        // L'operateur "??" (null coalescing) renvoie la valeur de gauche
        // si la cle existe ET n'est pas null, sinon la valeur de droite.
        $enonce = $data['enonce'] ?? null;
        // On combine deux verifications en une :
        //   - is_string : on refuse les autres types (int, array, null, ...).
        //   - trim($x) === '' : on refuse les chaines composees uniquement
        //     d'espaces, qui sont visuellement vides mais passent un is_string.
        // mb_strlen compte correctement les caracteres multi-octets (accents).
        if (!is_string($enonce) || trim($enonce) === '' || mb_strlen($enonce) > 255) {
            return $this->json(
                ['error' => 'enonce est obligatoire et doit faire 255 caracteres maximum'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        // ----- elementADeviner -----
        $element = $data['elementADeviner'] ?? null;
        if (!is_string($element) || trim($element) === '' || mb_strlen($element) > 100) {
            return $this->json(
                ['error' => 'elementADeviner est obligatoire et doit faire 100 caracteres maximum'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        // ----- difficulte -----
        $difficulte = $data['difficulte'] ?? null;
        // in_array(valeur, tableau, true) : le 3e parametre "true" active la
        // comparaison STRICTE (===) qui compare aussi le type. Sans lui, la
        // chaine "1" serait acceptee comme egale a l'entier 1, ce qui n'est
        // pas ce que l'on veut ici (on exige un vrai entier dans le JSON).
        if (!in_array($difficulte, [1, 2, 3], true)) {
            return $this->json(
                ['error' => 'difficulte doit valoir 1, 2 ou 3'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        // ----- miniJeuId -----
        $miniJeuId = $data['miniJeuId'] ?? null;
        if (!is_int($miniJeuId)) {
            return $this->json(
                ['error' => 'miniJeuId est obligatoire et doit etre un entier'],
                Response::HTTP_BAD_REQUEST,
            );
        }
        // find() renvoie le MiniJeu correspondant a cet id, ou null s'il
        // n'existe pas. Plus rapide qu'un findOneBy(['id' => $miniJeuId])
        // car find() utilise le cache d'identite Doctrine.
        $miniJeu = $this->miniJeuRepository->find($miniJeuId);
        if ($miniJeu === null) {
            return $this->json(
                ['error' => 'miniJeuId est obligatoire et doit exister en base'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        // ----- choixPossibles -----
        $choix = $data['choixPossibles'] ?? null;
        // count() est la fonction native PHP qui retourne le nombre d'elements
        // d'un tableau. On verifie d'abord que c'est bien un tableau (sinon
        // count declencherait une erreur), puis sa taille (entre 2 et 6).
        if (!is_array($choix) || count($choix) < 2 || count($choix) > 6) {
            return $this->json(
                ['error' => 'choixPossibles doit etre un tableau de 2 a 6 chaines non vides'],
                Response::HTTP_BAD_REQUEST,
            );
        }
        // On verifie que chaque element du tableau est bien une chaine non vide.
        foreach ($choix as $c) {
            if (!is_string($c) || trim($c) === '') {
                return $this->json(
                    ['error' => 'choixPossibles doit etre un tableau de 2 a 6 chaines non vides'],
                    Response::HTTP_BAD_REQUEST,
                );
            }
        }

        // ----- regle metier -----
        // L'element a deviner DOIT figurer parmi les choix proposes au joueur,
        // sinon la question serait insoluble. Comparaison stricte (true) a
        // nouveau, pour eviter les pieges du type-juggling PHP.
        if (!in_array($element, $choix, true)) {
            return $this->json(
                ['error' => 'elementADeviner doit faire partie de choixPossibles'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        // Toutes les regles sont passees : on applique les valeurs sur l'entite.
        // Les setters renvoient $this (style Loulergue), ce qui permet le
        // chainage en cascade sur une seule expression.
        //
        // Note importante : setMiniJeu() recoit l'OBJET MiniJeu, pas l'id.
        // C'est Doctrine qui se charge ensuite de stocker la cle etrangere
        // mini_jeu_id en base au moment du flush(). Cette abstraction est le
        // coeur de l'ORM : on manipule des objets, pas des identifiants SQL.
        //
        // array_values($choix) reindexe le tableau a partir de 0. Utile au
        // cas ou le client aurait envoye un tableau avec des cles non
        // sequentielles : on stocke ainsi un vrai tableau ordonne en JSON.
        $question
            ->setEnonce($enonce)
            ->setElementADeviner($element)
            ->setDifficulte($difficulte)
            ->setChoixPossibles(array_values($choix))
            ->setMiniJeu($miniJeu);

        // null = tout est OK, le caller peut continuer son traitement.
        return null;
    }

    // Transforme une Question en tableau associatif pret a etre serialise
    // en JSON. Centraliser ce format ici evite les divergences entre les
    // differents endpoints (index, create, update renvoient tous le meme
    // format de question).
    //
    // L'operateur "?->" (nullsafe operator, PHP 8) renvoie null si l'objet
    // a gauche est null, au lieu de declencher une erreur. Securite au cas
    // ou une Question n'aurait pas (encore) de MiniJeu rattache.
    private function serialiserQuestion(Question $q): array
    {
        return [
            'id' => $q->getId(),
            'enonce' => $q->getEnonce(),
            'elementADeviner' => $q->getElementADeviner(),
            'difficulte' => $q->getDifficulte(),
            'choixPossibles' => $q->getChoixPossibles(),
            'miniJeuId' => $q->getMiniJeu()?->getId(),
            'miniJeuNom' => $q->getMiniJeu()?->getNomMiniJeu(),
        ];
    }
}
