# KB Auto-générée
Générée le : 2026-05-19 12:28 UTC

## Statuts livraison (LI_Statut)
- 0 : Confirme — commande validée, en attente livreur
- 1 : EnLivraison — livreur en route
- 2 : Livre — livraison réussie
- 3 : Retour — colis renvoyé
- 4 : Depot — au dépôt, à reprogrammer
- 5 : Reporte — replanifié J+x

## Statuts commande (DO_Valide)
- 0 : EN_ATTENTE
- 1 : CONFIRME
- 2 : TENTATIVE
- 3 : REFUSE

## Motifs report/retour livreur
- CLIENT_NON_JOIGNABLE : compteur tentatives, Demande à la 3e
- CLIENT_ABSENT : compteur tentatives, Demande à la 3e
- ADRESSE_INTROUVABLE : Demande client immédiate (rouge/vert)
- ADRESSE_INCOMPLETE : Demande client immédiate
- NUMERO_INVALIDE : Demande client immédiate
- CLIENT_REFUSE_COMMANDE : escalade confirmatrice
- COLIS_ENDOMMAGE_DEPOT : escalade confirmatrice (photo obligatoire)
- AUTRE_INCIDENT : escalade confirmatrice

## Statuts cas (réclamations + demandes)
- ENVOYEE — nouveau cas en file
- EN_COURS_DE_TRAITEMENT — confirmatrice a pris en charge
- CLOTUREE — résolu
- REFUSEE — rejeté avec motif

## Gouvernorats Tunisiens (24)
- Tunis
- Ariana
- Ben Arous
- Manouba
- Nabeul
- Zaghouan
- Bizerte
- Béja
- Jendouba
- Le Kef
- Siliana
- Sousse
- Monastir
- Mahdia
- Sfax
- Kairouan
- Kasserine
- Sidi Bouzid
- Gabès
- Médenine
- Tataouine
- Gafsa
- Tozeur
- Kebili

## Constantes métier
- Frais livraison HOME : 8 DT (réductions fidélité Section 3.10)
- Timbre fiscal : 1 DT
- Seuil tentatives différées : 3 (Demande créée chez confirmatrice)
- Verrou confirmation pool : 15 min
- Timeout cas inactifs : 30 min
- Délai grâce SignalR confirmatrice : 5 secondes
- DepotPassageNumber max : 10 (garde-fou Hangfire)

## Programme fidélité
- Bronze : 0-9 livraisons réussies (aucun avantage)
- Argent : 10-29 (-10% frais)
- Or : 30-99 (-25% + livraison prioritaire)
- Platine : 100+ (frais offerts + assistance prio)
