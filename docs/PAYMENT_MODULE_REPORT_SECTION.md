# Section rapport PFE - Module de paiement virtuel sécurisé

## 1. Rôle du module de paiement

Le module de paiement virtuel sécurisé a pour objectif de simuler un parcours de paiement en ligne complet dans la plateforme e-commerce/logistique. Il permet de créer une commande, d'initialiser une tentative de paiement, de rediriger l'utilisateur vers une page de paiement dédiée, puis de confirmer ou refuser le paiement selon des cartes de test prédéfinies.

Ce module fournit ainsi un comportement proche d'une passerelle de paiement réelle, tout en restant adapté à un environnement de développement, de test et de soutenance.

## 2. Choix d'une passerelle virtuelle

Une passerelle virtuelle a été utilisée afin de démontrer le fonctionnement d'un paiement en ligne sans dépendre d'un opérateur bancaire externe. Ce choix réduit les risques liés aux clés API, aux comptes marchands, aux contraintes de certification et aux transactions financières réelles.

La passerelle virtuelle permet aussi de tester plusieurs scénarios métier : paiement accepté, paiement refusé, paiement annulé, session expirée, fonds insuffisants, carte bloquée, erreur fournisseur et OTP incorrect.

## 3. Simulation d'un vrai paiement

Le parcours implémenté reproduit les principales étapes d'un paiement en ligne :

1. Le client choisit le paiement virtuel sécurisé dans le checkout.
2. Le frontend appelle l'API ASP.NET Core.
3. Le backend crée la commande.
4. Le backend crée une tentative dans la table `B_PAIEMENT`.
5. Le backend génère une référence de paiement virtuelle.
6. Le client est redirigé vers une page de paiement.
7. Le client saisit une carte fictive, un CVV, une date d'expiration et un OTP.
8. Le backend valide les données en mémoire.
9. Le backend met à jour le statut du paiement.
10. Le frontend affiche le statut réel retourné par l'API.

Cette logique garantit que le frontend ne décide pas localement du résultat du paiement. La vérité métier reste centralisée dans le backend.

Une page dédiée de saisie carte est fournie à l'adresse `/checkout/virtual-payment`. Elle affiche le montant, la devise, la référence de commande, la référence de paiement, le fournisseur virtuel, les cartes de test disponibles et un formulaire complet contenant le numéro de carte, la date d'expiration, le CVV, le nom du porteur et l'OTP. Après validation, l'utilisateur est redirigé vers `/checkout/virtual-payment/return`, qui relit le statut réel depuis le backend.

## 4. Protection des données sensibles

Les données sensibles saisies dans le formulaire de paiement virtuel ne sont jamais stockées en base de données. Le numéro de carte, le CVV, l'OTP et le nom du porteur sont uniquement utilisés en mémoire pour valider le scénario de test.

Le module ne journalise pas ces données et n'appelle aucune API bancaire réelle. Toutes les tentatives virtuelles sont marquées avec `PA_IsSandbox = true`, ce qui permet de distinguer clairement les paiements de démonstration des futurs paiements de production.

## 5. Rôle de `B_PAIEMENT`

La table `B_PAIEMENT` sert de source de vérité pour les tentatives de paiement. Elle contient :

- la référence de commande `DO_Piece` ;
- la référence de paiement `PA_Reference` ;
- le fournisseur `PA_Fournisseur` ;
- l'identifiant fournisseur fictif `PA_ProviderPaymentId` ;
- le montant `PA_Montant` ;
- le statut local `PA_Statut` ;
- le statut externe simulé `PA_StatutExterne` ;
- l'indicateur sandbox `PA_IsSandbox`.

Le module virtuel réutilise cette table existante afin d'éviter la création d'une structure redondante.

## 6. Séparation commande / paiement

La commande et le paiement sont volontairement séparés. La commande représente l'intention d'achat et les lignes d'articles, tandis que `B_PAIEMENT` représente l'état financier de la tentative de paiement.

Cette séparation est importante car une commande peut exister même si le paiement est en attente, refusé, annulé ou expiré. Elle facilite aussi l'intégration future d'autres fournisseurs de paiement.

## 7. Statuts de paiement

Le module conserve les statuts existants :

- `INITIE`
- `EN_ATTENTE`
- `SUCCES`
- `ECHEC`
- `ANNULE`
- `EXPIRE`

Chaque carte de test modifie `PA_Statut` et `PA_StatutExterne` selon un scénario précis. Par exemple, la carte `4242 4242 4242 4242` marque le paiement en succès, tandis que la carte `4000 0000 0000 0002` simule un refus.

## 8. Compatibilité future avec Konnect

Le module virtuel a été ajouté à côté de Konnect, sans supprimer ni remplacer les fichiers existants. Konnect reste disponible dans le backend et le frontend :

- contrôleur Konnect ;
- service Konnect ;
- client Konnect ;
- options Konnect ;
- DTO Konnect ;
- page de retour Konnect ;
- API frontend Konnect.

Cette architecture permet d'utiliser la passerelle virtuelle pour les tests et la soutenance, tout en conservant la possibilité de connecter ultérieurement Konnect en production.

La phrase d'architecture retenue est :

> Le système de paiement a été conçu selon une architecture modulaire permettant d'utiliser une passerelle virtuelle en environnement de test, tout en conservant la possibilité d'intégrer ultérieurement une passerelle réelle telle que Konnect.

## 9. Intérêt pour les tests

La passerelle virtuelle rend les tests reproductibles. Les cartes de test donnent toujours le même résultat, ce qui permet de valider les écrans, les statuts, les erreurs et les transitions sans dépendre d'un service externe.

Des tests automatisés xUnit ont été ajoutés pour vérifier l'initiation du paiement, les cartes virtuelles, les validations de sécurité et les cas d'erreur.

## 10. Intérêt pour la soutenance

Pendant la soutenance, le module permet de démontrer un parcours complet :

- choix du mode de paiement ;
- création de commande ;
- création d'une tentative de paiement ;
- page de paiement professionnelle ;
- saisie d'une carte fictive ;
- confirmation backend ;
- page de retour avec statut réel ;
- consultation des statuts dans `B_PAIEMENT`.

Cette démonstration est réaliste sans exposer de vraies données bancaires.

## 11. Limites du module virtuel

Le module virtuel ne réalise pas de transaction bancaire réelle. Il ne vérifie pas une carte auprès d'une banque et ne gère pas les webhooks d'un fournisseur externe. Les résultats sont déterminés par des cartes de test contrôlées par le backend.

Il s'agit donc d'une passerelle sandbox destinée à la validation fonctionnelle, à la démonstration et aux tests.

## 12. Perspectives

La prochaine évolution logique consiste à brancher une passerelle réelle comme Konnect sur la même architecture. Le checkout pourra conserver une structure similaire : initiation backend, redirection vers le fournisseur, retour utilisateur, lecture du statut depuis le backend et mise à jour de `B_PAIEMENT`.

Grâce à la séparation entre les services de paiement, cette migration pourra se faire sans réécrire la logique de commande ni supprimer le module virtuel utilisé pour les tests.
