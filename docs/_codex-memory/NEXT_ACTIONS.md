# Prochaines actions recommandées

## À faire immédiatement

1. Valider avec Melek que cette mémoire est la base de reprise officielle.
2. Confirmer si l'objectif suivant est correction sécurité, stabilisation démo ou nettoyage documentation.
3. Vérifier que `docs/_codex-memory` est bien conservé dans Git.
4. Vérifier si `frontend-react/.env.local` et autres configs locales sont suivies ou seulement présentes localement.
5. Décider le workflow n8n canonique pour la soutenance.
6. Lister les routes critiques à tester en priorité.
7. Préparer une sauvegarde de la base avant toute action migration.

## À faire après validation

1. Externaliser les secrets backend/mobile/n8n.
2. Corriger la validation TLS Sage.
3. Tester et corriger les endpoints admin homepage côté React/backend.
4. Ajouter des smoke tests: auth, checkout, paiement, commande, réclamation, livreur.
5. Nettoyer ou masquer les pages placeholder.
6. Mettre à jour README backend/frontend/mobile/n8n.
7. Harmoniser les contrats API React/Flutter/backend.
8. Préparer un scénario de démonstration chronométré.
9. Aligner le rapport académique avec les fonctionnalités réellement stables.

## À vérifier manuellement

1. Connexion avec chaque rôle: admin, client, vendeur, confirmatrice, livreur, superviseur.
2. Parcours client complet: catalogue -> panier -> checkout -> paiement -> suivi.
3. Parcours guest checkout avec paiement virtuel/Konnect.
4. Transformation BC vers BL par confirmatrice.
5. Assignation livreur, changement statut, encaissement, incident.
6. Création et traitement réclamation/demande.
7. Dashboard admin et exports.
8. Transit inter-dépôts et alertes superviseur.
9. Webhook n8n choisi.
10. SMS/FCM si ces intégrations sont montrées.

## Questions à poser à Melek

1. Quelle version du chatbot doit être présentée: backend seul, n8n v3, ou les deux?
2. La soutenance sera-t-elle en local, réseau LAN, ou hébergement public?
3. Quelle base SQL Server est la référence: locale, démo, ou production?
4. Les intégrations Konnect, SMS, FCM, Groq et Sage doivent-elles fonctionner réellement ou être simulées?
5. Peut-on nettoyer les migrations temporaires ou faut-il préserver l'historique complet?
6. Quels modules sont prioritaires pour la note: client, admin, livreur, confirmatrice, IA, transit?

## Fichiers à ne pas modifier sans validation

- `backend-aspnet-api/Web-Api/appsettings.json`
- `backend-aspnet-api/Web-Api/Program.cs`
- `backend-aspnet-api/Web-Api/data/AppDbContext.cs`
- `backend-aspnet-api/Web-Api/Migrations/*`
- `backend-aspnet-api/Web-Api/Seed/IdentitySeeder.cs`
- `frontend-react/src/app/routes.tsx`
- `frontend-react/src/shared/api/endpoints.ts`
- `mobile-flutter/lib/core/config/constants.dart`
- `mobile-flutter/lib/core/network/api_client.dart`
- `automation-n8n/*.json`
- `Rapport/Rapport_PFE.docx`

## Fichiers critiques à sauvegarder avant modification

- Base SQL Server utilisée par `DefaultConnection`.
- `backend-aspnet-api/Web-Api/appsettings.json` et éventuels fichiers env locaux.
- Dossier `backend-aspnet-api/Web-Api/Migrations`.
- Workflows `automation-n8n/*.json`.
- `Rapport/Rapport_PFE.docx`.
- Toute donnée de démonstration importée depuis Sage/SQL.
