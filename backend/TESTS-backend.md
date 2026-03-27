# We-Lab Cosmetics - Test Backend

A

## Test 1 - Liste des mini-jeux :


bashcurl -s http://localhost:8000/api/mini-jeux | python3 -m json.tool

Voir des mini-jeux avec nb_questions > 0.
---
 

## Test 2 - Creer un joueur :

bashcurl -s -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":"TestWalid"}' | python3 -m json.tool

Voir {"id": ..., "pseudo": "TestWalid"} avec code 201.

---

# Test 3 - Creer un joueur avec pseudo vide (doit echouer) :

bashcurl -s -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":""}' | python3 -m json.tool

Voir une erreur 400.
---

## Test 4 - Creer un joueur deja existant (doit retourner l'existant) :
bashcurl -s -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":"TestWalid"}' | python3 -m json.tool

Voir le meme id qu'au test 2 (pas de doublon).

---


## Test 5 - Creer une partie :

bashcurl -s -X POST http://localhost:8000/api/parties -H "Content-Type: application/json" -d '{"joueur_id":6}' | python3 -m json.tool

Noter l'id dans la reponse (par exemple 6).
---

# Test 6 - Voir la partie (remplace 6 par l'id obtenu) :

bashcurl -s http://localhost:8000/api/parties/6 | python3 -m json.tool

Voir score_total: 0, termine: false.
---

## Test 7 - Questions faciles :
curl -s "http://localhost:8000/api/parties/6/questions?mini_jeu_id=1&difficulte=1" | python3 -m json.tool
voir des questions avec choix_possibles mais SANS la bonne reponse.
---
## Test 8 - Bonne reponse :
curl -s -X POST http://localhost:8000/api/parties/6/reponses -H "Content-Type: application/json" -d '{"question_id":1,"reponse":"Dentifrice","temps_reponse_sec":5}' | python3 -m json.tool
voir correct: true, score_obtenu: 1.
---
## Test 9 - Mauvaise reponse :
bashcurl -s -X POST http://localhost:8000/api/parties/6/reponses -H "Content-Type: application/json" -d '{"question_id":2,"reponse":"MauvaiseReponse","temps_reponse_sec":3}' | python3 -m json.tool
Voir correct: false, score_obtenu: 0.
---
## Test 10 - Terminer :
bashcurl -s -X PATCH http://localhost:8000/api/parties/6/terminer | python3 -m json.tool
voir score_total > 0 et date_fin remplie.
Tu dois voir erreur "Partie deja terminee".
---
## Test 11 - Re-terminer (doit echouer) :
bashcurl -s -X PATCH http://localhost:8000/api/parties/6/terminer | python3 -m json.tool




# TESTS faites : (copié collé depuis mon terminale)
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s http://localhost:8000/api/mini-jeux | python3 -m json.tool
[
    {
        "id": 1,
        "type": "ingredient_produit",
        "nom": "Ingredients et Produits",
        "description": "Associe chaque ingredient a son produit cosmetique",
        "nb_questions": 12
    },
    {
        "id": 2,
        "type": "produit_contenant",
        "nom": "Produits et Contenants",
        "description": "Associe chaque produit a son type de packaging",
        "nb_questions": 12
    },
    {
        "id": 3,
        "type": "action_pole",
        "nom": "Actions et Poles",
        "description": "Associe chaque action a son departement dans l'industrie cosmetique",
        "nb_questions": 11
    }
]
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":"TestWalid"}' | python3 -m json.tool
{
    "id": 6,
    "pseudo": "TestWalid"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":""}' | python3 -m json.tool
{
    "error": "Le pseudo est obligatoire"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/joueurs -H "Content-Type: application/json" -d '{"pseudo":"TestWalid"}' | python3 -m json.tool
{
    "id": 6,
    "pseudo": "TestWalid"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s "http://localhost:8000/api/parties/6/questions?mini_jeu_id=1&difficulte=1" | python3 -m json.tool
[
    {
        "id": 2,
        "enonce": "Quel produit contient du Beurre de karite ?",
        "difficulte": 1,
        "choix_possibles": [
            "Creme mains",
            "Gel douche",
            "Mascara",
            "Dentifrice"
        ]
    },
    {
        "id": 5,
        "enonce": "Quel produit contient de la Keratine ?",
        "difficulte": 1,
        "choix_possibles": [
            "Shampoing",
            "Dentifrice",
            "Creme mains",
            "Deodorant"
        ]
    },
    {
        "id": 1,
        "enonce": "Quel produit contient generalement du Fluor ?",
        "difficulte": 1,
        "choix_possibles": [
            "Dentifrice",
            "Shampoing",
            "Creme visage",
            "Vernis"
        ]
    },
    {
        "id": 4,
        "enonce": "Quel produit contient du Menthol ?",
        "difficulte": 1,
        "choix_possibles": [
            "Dentifrice",
            "Creme solaire",
            "Mascara",
            "Parfum"
        ]
    },
    {
        "id": 3,
        "enonce": "Quel produit contient de l'Aloe Vera ?",
        "difficulte": 1,
        "choix_possibles": [
            "Gel douche",
            "Rouge a levres",
            "Vernis",
            "Fond de teint"
        ]
    }
]
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/parties/6/reponses -H "Content-Type: application/json" -d '{"question_id":1,"reponse":"Dentifrice","temps_reponse_sec":5}' | python3 -m json.tool
{
    "error": "La partie est deja terminee"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/parties/6/reponses -H "Content-Type: application/json" -d '{"question_id":2,"reponse":"MauvaiseReponse","temps_reponse_sec":3}' | python3 -m json.tool
{
    "error": "La partie est deja terminee"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X PATCH http://localhost:8000/api/parties/6/terminer | python3 -m json.tool
{
    "error": "Partie deja terminee"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X PATCH http://localhost:8000/api/parties/6/terminer | python3 -m json.tool
{
    "error": "Partie deja terminee"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/parties -H "Content-Type: application/json" -d '{"joueur_id":6}' | python3 -m json.tool
{
    "id": 8,
    "joueur": "TestWalid",
    "date_debut": "2026-03-27 20:09:05",
    "mini_jeux": [
        {
            "id": 1,
            "type": "ingredient_produit",
            "nom": "Ingredients et Produits"
        },
        {
            "id": 2,
            "type": "produit_contenant",
            "nom": "Produits et Contenants"
        },
        {
            "id": 3,
            "type": "action_pole",
            "nom": "Actions et Poles"
        }
    ]
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/parties/8/reponses -H "Content-Type: application/json" -d '{"question_id":1,"reponse":"Dentifrice","temps_reponse_sec":5}' | python3 -m json.tool
{
    "correct": true,
    "score_obtenu": 1,
    "bonne_reponse": "Dentifrice",
    "score_total_partie": 0
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X POST http://localhost:8000/api/parties/7/reponses -H "Content-Type: application/json" -d '{"question_id":2,"reponse":"MauvaiseReponse","temps_reponse_sec":3}' | python3 -m json.tool
{
    "correct": false,
    "score_obtenu": 0,
    "bonne_reponse": "Creme mains",
    "score_total_partie": 0
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ curl -s -X PATCH http://localhost:8000/api/parties/7/terminer | python3 -m json.tool
{
    "id": 7,
    "score_total": 0,
    "nb_reponse": 1,
    "date_debut": "2026-03-27 19:37:37",
    "date_fin": "2026-03-27 20:10:00"
}
walid@walid:~/Documents/projetSI/welab-cosmetics$ 

