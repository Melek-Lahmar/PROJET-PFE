# Cahier des charges complet pour Claude Code

## Contexte général

Je travaille déjà sur une application Flutter existante et avancée avec un backend Web API ASP.NET.

Important :

- Ne refais pas l'application.
- N'ajoute pas une autre app séparée.
- Travaille dans l'existant.
- Je veux surtout ajouter et améliorer des modules dans le projet actuel.
- Je veux un résultat très professionnel, moderne, premium, cohérent visuellement, prêt à être montré devant un jury.

---

# Partie 1 — Espace Admin complet en Flutter

## Objectif

Je veux un espace Admin complet dans Flutter, à l'intérieur de la même application existante.

Je veux un espace Admin qui serve de cockpit métier pour piloter toute l'activité.

Le jury doit voir un espace :

- moderne
- très propre
- premium
- utile métier
- riche en KPI
- visuellement fort
- agréable à utiliser

Je veux que tu développes réellement cet espace admin, puis que tu tests ce que tu as développé.

---

## Contraintes générales

- Développer en Flutter, dans la même application existante.
- Garder une cohérence totale avec le design premium déjà présent dans l'app.
- Éviter toute refonte backend inutile.
- Si un petit ajout backend est nécessaire pour des agrégations admin, fais-le proprement.
- Si un gros changement backend devient nécessaire, isole-le clairement avant d'aller trop loin.
- Je veux des composants réutilisables, une vraie hiérarchie visuelle, et des animations élégantes.

---

## Structure attendue de l'espace Admin

Je veux plusieurs onglets/sections. Tu peux légèrement ajuster les noms si tu trouves plus professionnel, mais je veux au minimum :

- Dashboard global
- Commandes / Colis
- Livreurs
- Confirmatrices
- Réclamations / Demandes
- Produits / Ventes
- Workflow / LLM
- Profil / Paramètres admin si tu juges utile

Je veux une navigation claire, moderne, premium et cohérente.

---

## 1. Dashboard global

Je veux un dashboard global très fort visuellement et très utile.

Je veux :

- un filtre principal par gouvernorat
- une vue globale sur tous les statuts possibles des commandes / colis
- de grosses cartes KPI premium
- des graphiques modernes
- une lecture rapide de l'état global de l'activité

KPI souhaités :

- total commandes
- total colis
- total livrées
- total retournées
- total reportées
- total en cours
- total en attente
- total réclamations
- total demandes
- taux de livraison
- taux de retour
- taux de report
- taux de réclamation
- volume aujourd'hui
- volume cette semaine
- volume ce mois

Graphiques souhaités :

- courbe livrées vs retournées
- répartition des commandes par statut
- répartition par gouvernorat
- évolution dans le temps
- si possible comparaison période actuelle vs précédente

---

## 2. Onglet Commandes / Colis

Je veux une vue admin dédiée aux commandes / colis.

Je veux :

- filtre par gouvernorat
- filtres par statut
- filtres par date / période
- recherche par numéro / client / ville / gouvernorat
- KPI utiles
- graphiques par statut
- liste ou tableau moderne

KPI utiles :

- total commandes
- livrées
- retournées
- reportées
- en livraison
- en attente
- refusées si pertinent
- commandes par gouvernorat
- commandes par statut

But métier :

Je veux que l'admin puisse identifier rapidement :

- les zones avec le plus de volume
- les zones avec le plus de retours
- les zones avec le plus de reports
- les gouvernorats les plus performants
- les gouvernorats les moins performants

---

## 3. Onglet Livreurs

Je veux une vraie vue admin des livreurs.

Dans la liste générale, je veux :

- nom
- téléphone / email si utile
- gouvernorat
- en ligne ou non
- disponible / pause / inactif
- dernière activité / dernière utilisation
- commandes en cours
- livrées
- retournées
- reportées
- taux de livraison
- taux de retour
- nombre de réclamations liées à ses colis
- nombre de demandes / incidents remontés par lui

Dans le détail livreur, je veux :

- statut actuel : online / offline / pause
- dernière activité
- historique récent
- total colis traités
- total livrés
- total retournés
- total reportés
- total en cours
- total incidents / demandes remontées
- total réclamations liées
- KPI jour / semaine / mois
- courbes d'activité
- taux de réussite
- taux de retour
- charge actuelle
- qualité opérationnelle

Je veux beaucoup de KPI, mais les KPI les plus utiles d'abord.

---

## 4. Onglet Confirmatrices

Je veux une vraie vue admin des confirmatrices.

Dans la liste générale, je veux :

- nom
- email / téléphone si utile
- gouvernorat si pertinent
- online ou offline
- en pause ou non
- dernière activité
- commandes confirmées
- réclamations traitées
- demandes traitées
- cas actifs
- clôturés / résolus
- refusés
- envoyés / non traités

Dans le détail confirmatrice, je veux :

- online / offline / pause
- dernière activité
- dernière attribution
- total commandes confirmées
- total réclamations traitées
- total demandes traitées
- nombre de cas encore ouverts
- clôturés
- refusés
- en cours
- envoyés / non traités
- KPI jour / semaine / mois
- courbes d'activité
- éventuellement temps moyen de traitement si faisable
- performance comparative si pertinent

---

## 5. Onglet Réclamations / Demandes

Je veux une vue admin claire sur le SAV.

Je veux voir :

- réclamations envoyées
- réclamations en cours
- réclamations clôturées / résolues
- réclamations refusées
- demandes envoyées
- demandes en cours
- demandes clôturées / résolues
- demandes refusées
- demandes non traitées

Je veux :

- KPI globaux
- graphiques par statut
- courbes d'évolution
- répartition par gouvernorat
- répartition par motif
- top motifs de réclamation
- top motifs de demande
- taux de résolution
- taux de refus
- cas encore non traités

But métier :

Permettre à l'admin de comprendre rapidement :

- quels motifs reviennent le plus
- quels gouvernorats ont le plus de problèmes
- où il y a trop de cas non traités
- quels acteurs sont les plus concernés

---

## 6. Onglet Produits / Ventes

Je veux une vue analytics produit inspirée des dashboards modernes type Shopify / Converty.

Je veux :

- top produits les plus vendus
- top produits par gouvernorat
- meilleur produit global
- meilleur gouvernorat
- volume par produit
- volume par gouvernorat
- courbes de performance
- répartition en pourcentage

KPI souhaités :

- produit le plus vendu
- produit le plus retourné
- produit avec le plus de réclamations
- gouvernorat le plus performant
- gouvernorat avec le plus de retours
- gouvernorat avec le plus de commandes
- pourcentage des ventes par gouvernorat
- pourcentage des retours par gouvernorat

Si possible :

- une représentation lisible de la Tunisie par gouvernorat
- sinon une visualisation très claire des gouvernorats

---

## 7. Onglet Workflow / LLM

Je veux un onglet admin dédié à la partie workflow / LLM / automatisations.

Je veux y voir :

- les workflows existants
- leur statut
- les automatisations actives
- le chatbot / assistant LLM
- des logs utiles
- le nombre de questions posées
- les intents ou types de questions les plus fréquents
- les succès / erreurs
- le dernier usage
- éventuellement les endpoints les plus sollicités

Je veux quelque chose de lisible, moderne, propre et professionnel.

---

## 8. Filtres et recherche

Je veux un système de filtres admin réutilisable et cohérent.

Minimum :

- filtre par gouvernorat
- filtre par date / période
- filtre par statut
- filtre par type de cas
- filtre par livreur
- filtre par confirmatrice
- filtre par produit
- recherche textuelle si pertinent

Je veux que ces filtres soient :

- rapides
- beaux
- modernes
- cohérents sur tout l'espace admin

---

## 9. Design / UX attendus

Je veux un design Flutter très moderne, premium, type dashboard SaaS haut de gamme.

Je veux :

- cartes KPI premium
- hiérarchie visuelle forte
- graphiques modernes
- spacing propre
- couleurs cohérentes
- composants réutilisables
- badges lisibles
- tableaux / listes propres
- sections bien structurées
- excellente lisibilité
- expérience fluide et agréable

Je veux que le jury regarde l'espace admin et dise :

> "C'est moderne, professionnel, agréable, bien pensé et très propre."

---

## 10. Animations et micro-interactions

Je veux des animations élégantes et discrètes.

Par exemple :

- skeletons de chargement
- apparition douce des cartes KPI
- animation légère des compteurs
- transitions fluides entre sections
- feedback visuel sur filtres et actions
- graphiques animés proprement si pertinent
- loaders propres
- états vides premium

---

## 11. Backend / Data

Je veux que tu t'appuies au maximum sur l'existant.

- Si les endpoints existent déjà, utilise-les.
- S'il manque des endpoints admin ou des agrégations, crée ce qu'il faut proprement.
- Pas de duplication inutile.
- Pas de bricolage.
- Si un endpoint admin dédié est nécessaire, crée-le proprement.

---

## 12. Tests

Je veux que tu développes tout, puis que tu testes ce que tu as fait.

Je veux des tests sur :

- affichage des onglets
- filtres
- recherche
- calcul des KPI
- rendu des graphiques
- navigation
- responsive / lisibilité
- états vides
- erreurs
- cohérence des données
- fluidité générale

---

## 13. Initiative

Si tu vois des améliorations utiles et cohérentes, n'hésite pas à les ajouter.

Par exemple :

- meilleurs KPI
- meilleures courbes
- comparatif période actuelle vs précédente
- top performers
- zones à risque
- cartes d'insights utiles
- widgets synthétiques modernes

---

## 14. Ce que j'attends dans ton retour final

À la fin, donne-moi exactement :

- ce que tu as développé
- les onglets / sections créés
- les KPI ajoutés
- les graphiques ajoutés
- les endpoints backend créés ou modifiés si besoin
- les fichiers principaux modifiés
- les tests effectués
- les bugs corrigés
- ce qui est terminé
- ce qui peut encore être amélioré plus tard

---

# Partie 2 — Module Chatbot métier avec n8n + Groq + Web API

## Contexte

Mon app Flutter est déjà existante et fonctionnelle.

- Je ne veux pas une autre app.
- Je veux ajouter un module chatbot dans l'app existante.

Important :

- Je veux que la partie LLM soit simple à comprendre.
- Je veux pouvoir bien la présenter devant le jury.
- Je veux une logique propre, sécurisée, professionnelle.
- Je veux utiliser n8n pour orchestrer le workflow.
- Je veux utiliser Groq comme LLM principal.
- Je veux que les données métier viennent uniquement de mon Web API ASP.NET.
- Pas de connexion directe à la base de données dans cette V1.

---

## Objectif exact du chatbot

Je veux ajouter dans Flutter :

- un écran / module chat
- un champ d'envoi de message
- un affichage de réponses
- une intégration avec n8n

Le chatbot doit répondre à des questions métier liées à mon système.

Exemples :

- combien de commandes aujourd'hui ?
- combien de commandes livrées ?
- quelles sont les commandes reportées ?
- combien de commandes retournées ?
- quelles commandes ont une réclamation ?
- combien de réclamations ouvertes ?
- quelles demandes non traitées existent ?
- combien de commandes dans un gouvernorat donné ?
- quelles commandes d'un client donné ?
- quelles réclamations sont liées à une commande ?
- quelles demandes viennent du livreur ?
- quels produits se vendent le mieux ?
- quel gouvernorat performe le mieux ?

---

## Architecture attendue

Je veux cette architecture :

```
Flutter existant
→ interface chat
→ webhook n8n
→ Groq (analyse intention)
→ JSON structuré
→ routage par intention
→ appel HTTP vers le Web API
→ récupération des données métier
→ Groq (reformulation finale)
→ réponse JSON propre
→ affichage dans Flutter
```

Je veux éviter :

- accès direct à la base
- hallucinations sans données réelles
- logique floue ou peu présentable

---

## Partie LLM — explication étape par étape (très important pour moi)

Je veux que tu construises cette partie de manière très pédagogique, pour que je puisse bien la comprendre et bien la présenter devant le jury.

### Étape 1 — L'utilisateur pose une question

Dans Flutter, l'utilisateur écrit une question métier.

Exemple :

> "Combien de commandes livrées aujourd'hui ?"

### Étape 2 — Flutter envoie la question à n8n

Flutter envoie le message à un webhook n8n avec un payload JSON propre.

### Étape 3 — n8n transmet la question à Groq pour comprendre l'intention

Groq ne doit pas répondre directement.

Il doit d'abord analyser la question et la traduire en intention métier structurée.

Exemple de sortie attendue :

```json
{
  "intent": "get_orders_count",
  "entity": "orders",
  "filters": {
    "status": "LIVRE",
    "date_from": "today",
    "date_to": "today",
    "governorate": null,
    "order_number": null,
    "client_query": null,
    "product_query": null
  },
  "needs_table": false,
  "needs_chart": false
}
```

### Étape 4 — n8n route l'intention

n8n lit l'intention et choisit quel endpoint du Web API appeler.

Exemple :

- si intent = `get_orders_count`
- alors appeler un endpoint type `/api/admin/orders/count`

### Étape 5 — le Web API retourne les vraies données

Le Web API interroge la base et retourne les vraies données.

Exemple :

```json
{
  "count": 12
}
```

### Étape 6 — n8n redonne les données à Groq pour reformulation

Groq reçoit :

- la question initiale
- l'intention
- les données réelles

Puis Groq reformule une réponse claire.

Exemple :

> "Il y a 12 commandes livrées aujourd'hui."

### Étape 7 — n8n renvoie un JSON final à Flutter

Le webhook renvoie un JSON stable à Flutter.

Exemple :

```json
{
  "success": true,
  "message": "Il y a 12 commandes livrées aujourd'hui.",
  "intent": "get_orders_count",
  "data": {
    "count": 12
  },
  "ui": {
    "type": "text",
    "show_table": false,
    "show_chart": false
  }
}
```

### Étape 8 — Flutter affiche la réponse

Flutter lit le JSON et affiche la réponse dans l'interface de chat.

---

## Ce que je veux que tu implémentes pour la partie chatbot

### Dans Flutter

Je veux que tu ajoutes :

- un écran de chat bien intégré à l'app existante
- un champ texte
- un bouton envoyer
- des bulles de messages propres
- un état loading
- une gestion d'erreur claire
- un service Flutter dédié pour appeler n8n
- les modèles nécessaires

### Dans n8n

Je veux un vrai workflow avec au minimum :

- Webhook
- Validation / normalisation du payload
- Appel Groq pour parser l'intention
- Structured output parser / JSON parser
- Switch / router par intention
- HTTP Request vers le Web API
- Appel Groq pour reformuler la réponse finale
- Respond to Webhook

### Dans le Web API

Je veux que tu :

- réutilises les endpoints existants si possible
- ajoutes les endpoints nécessaires proprement si besoin
- gardes le Web API comme seule couche métier qui connaît la base

---

## Contraintes importantes pour le chatbot

- utiliser Groq comme LLM principal
- garder une V1 simple
- passer par le Web API
- pas de connexion directe à la base
- ajouter seulement ce module dans l'app Flutter existante
- ne pas refaire toute l'application
- penser sécurité, lisibilité, maintenabilité

---

## Sécurité attendue

Je veux prévoir :

- sécurisation du webhook n8n
- authentification ou clé API
- sécurisation des appels vers le Web API
- validation du payload
- journalisation minimale
- gestion des erreurs

---

## Gestion d'erreurs attendue

Je veux que tu gères proprement :

- payload invalide
- question vide
- Groq ne comprend pas
- intent inconnu
- Web API indisponible
- données non trouvées
- réponse vide
- timeout ou erreur réseau

Je veux des réponses JSON propres pour Flutter.

---

## Ce que j'attends dans ton retour final pour la partie chatbot

Je veux que tu me donnes :

- l'architecture recommandée
- le workflow n8n étape par étape
- les nodes n8n à créer
- la configuration Groq complète
- le schéma JSON d'intention
- les payloads entrée / sortie
- les endpoints Web API nécessaires
- les variables d'environnement nécessaires
- la logique de sécurité
- la gestion d'erreurs
- les fichiers Flutter à ajouter / modifier
- un exemple d'appel Flutter
- un exemple de réponse JSON
- si possible un workflow n8n prêt à importer ou très proche d'un vrai export
- un plan de test simple de bout en bout

---

# Exigence finale générale

Je veux que tu :

- développes réellement les modules demandés
- gardes une approche professionnelle
- testes ce que tu as fait
- présentes clairement les étapes
- rends le tout très bien présentable devant un jury

Je veux une vraie exécution concrète, pas seulement des idées.
