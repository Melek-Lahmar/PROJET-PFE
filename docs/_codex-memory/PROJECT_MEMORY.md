# Mémoire technique du projet PFE

> Dernière analyse Codex: 2026-05-19.  
> Convention: **[SOURCE]** confirmé par fichier source, **[DOC]** confirmé par documentation, **[HYP]** hypothèse à vérifier.  
> À chaque nouvelle session: relire d'abord `PROJECT_MEMORY.md`, `PROJECT_MAP.md`, `NEXT_ACTIONS.md`.

## 1. Sujet réel du projet

- **[DOC]** Plateforme PFE de commerce/livraison COD pour INFOSOFT/COD Tunisia, connectée au contexte Sage X3.
- **[SOURCE]** Monorepo avec API ASP.NET Core, frontend React, application Flutter, workflows n8n, documentation et rapport académique.
- **[SOURCE]** Les modules couvrent catalogue, commandes, paiement, livraison, réclamations, supervision, admin, chatbot et automatisation.

## 2. Objectif métier

- **[DOC]** Digitaliser un parcours e-commerce complet: consultation catalogue, panier, commande, paiement, conversion BC/BL, livraison, suivi et réclamation.
- **[DOC]** Réduire le travail manuel des équipes admin/confirmatrice/livreur et améliorer la traçabilité.
- **[SOURCE]** Le backend expose des endpoints pour clients, vendeurs, confirmatrices, livreurs, superviseurs et administrateurs.

## 3. Modules principaux

- **[SOURCE]** `backend-aspnet-api/Web-Api`: API REST, SignalR, Hangfire, EF Core, Identity, paiements, géolocalisation, jobs.
- **[SOURCE]** `frontend-react`: application React/Vite/TypeScript avec boutique, dashboards par rôle et interface admin.
- **[SOURCE]** `mobile-flutter`: application Flutter multi-rôles pour client, livreur, confirmatrice, admin, superviseur et transit.
- **[SOURCE]** `automation-n8n`: workflows de chatbot admin et documentation d'exploitation.
- **[DOC]** `docs`: briefs, audits IA, rapports techniques, modules métier.
- **[DOC]** `Rapport/Rapport_PFE.docx`: rapport académique.

## 4. Acteurs du système

- **[DOC]** Client: catalogue, panier, commande, paiement, suivi, réclamation, avis.
- **[DOC]** Vendeur: création de commandes pour clients, consultation catalogue et suivi.
- **[DOC]** Confirmatrice/confirmateur: confirmation commandes, transformation BC vers BL, traitement réclamations.
- **[DOC]** Livreur: prise en charge, livraison, incidents, encaissement, positions.
- **[DOC]** Administrateur: utilisateurs, dashboard, produits, stocks, paramètres, chatbot, réclamations.
- **[SOURCE]** Superviseur/transit: zones dépôt, alertes superviseur, transferts inter-dépôts.

## 5. Stack technique

- **[SOURCE]** Backend: .NET 8, ASP.NET Core Web API, EF Core 8 SQL Server, ASP.NET Identity, JWT, SignalR, Hangfire, Swagger.
- **[SOURCE]** Frontend: React 19, Vite 7, TypeScript, React Router 7, TanStack Query, Zustand, Axios, Tailwind CSS 4, Recharts, Leaflet, SignalR.
- **[SOURCE]** Mobile: Flutter/Dart SDK ^3.9.0, Provider, HTTP, secure storage, SignalR, Google Maps, geolocator, notifications, Hive.
- **[SOURCE]** Automatisation: n8n workflows JSON, webhook, Groq, appels HTTP vers backend.
- **[DOC]** Rapport: SQL Server, Sage X3/Sage tables, Swagger, Konnect, VS/VS Code/Android Studio.

## 6. Architecture globale

- **[SOURCE]** React et Flutter consomment principalement l'API `backend-aspnet-api/Web-Api`.
- **[SOURCE]** Backend persiste via `AppDbContext` et expose des hubs SignalR `/hubs/reclamations` et `/hubs/supervisor`.
- **[SOURCE]** Hangfire exécute des jobs récurrents: incrément dépôt quotidien et insights toutes les 30 minutes.
- **[SOURCE]** n8n expose des webhooks chatbot et appelle le backend ou Groq selon la version du workflow.
- **[HYP]** Sage X3 est représenté par des tables `F_*`, mais la connexion réelle à Sage doit être validée en environnement.

## 7. Frontend React

- **[SOURCE]** Routes définies dans `frontend-react/src/app/routes.tsx` avec guards `ProtectedRoute`, `RoleRoute`, `PublicShopRoute`.
- **[SOURCE]** Services API: `src/shared/api/axiosClient.ts`, `endpoints.ts`, services par domaine.
- **[SOURCE]** Auth persistée dans Zustand (`melek-auth`), panier/comparaison/layout aussi via stores.
- **[SOURCE]** Dashboards disponibles pour admin, livreur, confirmateur, superviseur et client.
- **[SOURCE]** Mode clair/sombre géré par `layoutStore`, valeur par défaut sombre.

## 8. Backend ASP.NET Core Web API

- **[SOURCE]** Projet principal `Web-Api.csproj` cible `net8.0`.
- **[SOURCE]** `Program.cs` configure EF Core SQL Server, Identity, JWT, CORS dev, SignalR, Hangfire, Swagger, middleware global d'erreurs.
- **[SOURCE]** `AppDbContext.cs` contient les entités métier: documents, livraisons, paiements, réclamations, avis, livreur, transit, chatbot, config.
- **[SOURCE]** Plusieurs services concentrent la logique métier: commandes, paiements, réclamations, dashboard, transit, géolocalisation, SMS/push/email.
- **[SOURCE]** Tests xUnit présents pour géopolygones et paiement virtuel.

## 9. Mobile Flutter

- **[SOURCE]** `mobile-flutter/lib/main.dart` choisit l'application selon le rôle de session.
- **[SOURCE]** API centralisée dans `lib/core/network/api_client.dart` avec bearer token, timeouts, multipart, erreur structurée.
- **[SOURCE]** `lib/core/config/constants.dart` contient URL backend locale et configuration mobile.
- **[SOURCE]** Fonctionnalités confirmées: client, livreur, confirmatrice, admin, superviseur, transit, chatbot/FAQ, tracking.

## 10. Automatisation n8n

- **[SOURCE]** Quatre workflows chatbot: `admin-chatbot-workflow.json`, `-cloud.json`, `-v2.json`, `-v3.json`.
- **[SOURCE]** Déclencheurs webhook et appels vers Groq/backend selon workflow.
- **[SOURCE]** Documentation n8n: `SETUP.md`, `HOWTO-LIVE-TEST.md`, `TUTORIAL_FROM_SCRATCH.md`, base de connaissance.
- **[HYP]** Le workflow canonique de démonstration doit être choisi: v3 semble le plus récent, mais validation requise.

## 11. Base de données

- **[SOURCE]** SQL Server via EF Core et `AppDbContext`.
- **[SOURCE]** Tables principales: `F_DOCENTETE`, `F_DOCLIGNE`, `F_LIVRAISON`, `B_PAIEMENT`, `F_ARTICLE`, `F_ARTSTOCK`, `F_DEPOT`, `F_RECLAMATION`, `F_AVIS_COMMANDE`, `F_TRANSFERT`, `F_SUPERVISOR_ALERT`, `F_APP_CONFIG`, tables chatbot.
- **[SOURCE]** Migrations nombreuses dans `Web-Api/Migrations`; certaines ont des noms non professionnels ou temporaires.
- **[HYP]** L'état exact de la base locale/prod doit être comparé aux migrations avant toute correction.

## 12. Flux principaux

- **[DOC]** Client: catalogue -> panier -> commande -> paiement/livraison -> suivi -> avis/réclamation.
- **[SOURCE]** Paiement: Konnect et paiement virtuel via `PaymentsController`, `KonnectPaymentService`, `VirtualPaymentService`.
- **[SOURCE]** Commande: création client/guest/vendeur, consultation, timeline, transit summary.
- **[SOURCE]** Confirmatrice: verrouillage, statut, transformation BC vers BL, traitement réclamation.
- **[SOURCE]** Livreur: pool disponible, assignation, statut, encaissement, position, incidents.
- **[SOURCE]** Superviseur/transit: zones dépôt, transferts, alertes, audit.

## 13. Fonctionnalités confirmées par les sources

- **[SOURCE]** Auth JWT + rôles, profils, reset password et auth externe Google/Facebook.
- **[SOURCE]** Catalogue articles/catalogues/dépôts/stocks et images.
- **[SOURCE]** Commandes, BC/BL, tracking public et client.
- **[SOURCE]** Paiements Konnect et virtuels avec endpoints d'initiation/status/webhook.
- **[SOURCE]** Réclamations/demandes unifiées avec tentatives, photos et redistribution.
- **[SOURCE]** Dashboards admin, confirmatrice, livreur, superviseur.
- **[SOURCE]** SignalR pour réclamations/supervision.
- **[SOURCE]** Application Flutter multi-rôles.

## 14. Hypothèses à vérifier

- **[HYP]** Les rapports IA dans `docs` sont partiellement obsolètes par rapport au code actuel.
- **[HYP]** Les endpoints frontend admin homepage `sections/reorder` et `images` ne correspondent pas clairement aux routes backend extraites.
- **[HYP]** Le workflow n8n v3 est la version à utiliser en soutenance.
- **[HYP]** La configuration mobile doit être variabilisée par environnement avant déploiement.
- **[HYP]** Les routes CRUD brutes `docentetes`/`doclignes` sont héritées et non destinées au public final.

## 15. Risques techniques

- **[SOURCE]** Secrets/configurations sensibles présents dans `backend-aspnet-api/Web-Api/appsettings.json`.
- **[SOURCE]** Données de seed démo avec mots de passe dans `IdentitySeeder.cs`.
- **[SOURCE]** Validation TLS désactivée pour le client Sage dans `Program.cs`.
- **[SOURCE]** URL backend locale et token/config mobile dans `mobile-flutter/lib/core/config/constants.dart`.
- **[SOURCE]** Multiples workflows n8n pour le même chatbot.
- **[SOURCE]** Migrations nombreuses et noms temporaires.
- **[SOURCE]** Tests limités et aucune suite frontend/mobile significative détectée.

## 16. Priorités de correction

- **[SOURCE]** Externaliser secrets et configurations sensibles.
- **[SOURCE]** Corriger la validation TLS Sage.
- **[SOURCE]** Vérifier alignement routes frontend/mobile/backend.
- **[SOURCE]** Choisir un workflow chatbot canonique.
- **[SOURCE]** Nettoyer docs obsolètes, fichiers générés et migrations temporaires sans casser l'historique.
- **[SOURCE]** Ajouter tests ciblés sur paiement, commande, réclamation et routes critiques.

## 17. Notes importantes pour les prochaines sessions

- **[SOURCE]** Ne pas modifier le code sans validation explicite de Melek.
- **[SOURCE]** Relire cette mémoire et `NEXT_ACTIONS.md` avant toute correction.
- **[SOURCE]** `backend-aspnet-api/Web-Api/wwwroot/kb/kb_auto_generated.md` était déjà modifié avant cette analyse; ne pas l'attribuer à Codex.
- **[DOC]** Les docs contiennent beaucoup de rapports générés par IA: utiliser comme contexte, pas comme vérité finale.
- **[SOURCE]** En cas de vérification route/API, privilégier `Program.cs`, controllers, services et appels clients réels.

## Annexe - Markdown docs analysés

| Fichier | Synthèse compacte |
|---|---|
| `docs/ADMIN_BUTTONS_AUDIT.md` | **[DOC]** Audit boutons admin React/Flutter; affirme 66 audités et 0 morts, à vérifier en UI réelle. |
| `docs/AGENTS.md` | **[DOC]** Conventions agent, commandes et architecture; chemins legacy à vérifier. |
| `docs/BLOCKERS.md` | **[DOC]** Blocages externes: crédits SMS Tunisie Telecom et clé FCM non configurés. |
| `docs/BRIEF_GLOBAL_PFE.md` | **[DOC]** Brief global riche: COD Tunisie, rôles, règles métier, stack, flux et statuts. |
| `docs/CHANGES_2026-05-03_client_premium.md` | **[DOC]** Passe premium client Flutter; liste chantiers, fichiers et validations. |
| `docs/CHANGES_2026-05-03_design_pass.md` | **[DOC]** Passe design premium: chatbot, KPIs, map, livreur, avis client. |
| `docs/CHANGES_2026-05-03_other_roles.md` | **[DOC]** Passe premium confirmatrice/livreur/admin; périmètre et recommandations. |
| `docs/CHANTIER_1_GEO_REPORT.md` | **[DOC]** Données géo et polygones: service geo, endpoints, dépendances, tests. |
| `docs/CHATBOT_BUTTONS_AUDIT.md` | **[DOC]** Audit UI chatbot et méthodes backend; affirme absence de stubs. |
| `docs/CLAUDE.md` | **[DOC]** Guide agent proche d'AGENTS; utile mais potentiellement obsolète. |
| `docs/CLIENT_BUTTONS_AUDIT.md` | **[DOC]** Audit boutons client; checklist UX à valider par parcours réel. |
| `docs/CONFIRMATRICE_BUTTONS_AUDIT.md` | **[DOC]** Audit boutons confirmatrice; à recouper avec endpoints et app mobile. |
| `docs/CORRECTIONS_REPORT.md` | **[DOC]** Rapport corrections logiques V3, refontes UX et builds finaux. |
| `docs/DEPOT_FIXES_REPORT.md` | **[DOC]** Correctifs dépôt: sous-statuts livreur, reload, flow acceptation, profil. |
| `docs/DOCUMENTATION_TECHNIQUE.md` | **[DOC]** Documentation technique centrale: système, stack, flux inter-apps, env, roadmap. |
| `docs/FINAL_FIXES_REPORT.md` | **[DOC]** Correctifs finaux V3 et ajouts confirmatrice premium. |
| `docs/FINAL_REPORT.md` | **[DOC]** Rapport V2 final: SignalR theme, offline queue, migrations, 401/403. |
| `docs/HTTP_FIX_REPORT.md` | **[DOC]** Rapport corrections HTTP: migrations, middleware global, ApiException Flutter. |
| `docs/IMPLEMENTATION_DECISIONS.md` | **[DOC]** Décisions transverses et par module issues du master prompt. |
| `docs/LIVREUR_BUTTONS_AUDIT.md` | **[DOC]** Audit boutons livreur et endpoints confirmés; à tester sur mobile. |
| `docs/MERGE_REPORT_2026-05-06.md` | **[DOC]** Rapport fusion backend Flutter/React vers version finale unique. |
| `docs/PAYMENT_MODULE_ANALYSIS.md` | **[DOC]** Analyse paiement: backend, frontend, checkout, commandes, Konnect, `B_PAIEMENT`. |
| `docs/PAYMENT_MODULE_REPORT_SECTION.md` | **[DOC]** Texte rapport pour paiement virtuel sécurisé et séparation commande/paiement. |
| `docs/PAYMENT_MODULE_TEST_REPORT.md` | **[DOC]** Endpoints, fichiers et scénarios automatisés du module paiement. |
| `docs/PROMPT_CC_Chantier1_Geo_Polygones.md` | **[DOC]** Prompt détaillé chantier geo/polygones; source d'exigences, pas preuve code. |
| `docs/prompt_claude_code_admin_llm.md` | **[DOC]** Cahier des charges espace admin Flutter et assistant LLM. |
| `docs/PROMPT_FINAL_DEFINITIF.md` | **[DOC]** Prompt final pour terminer le brief PFE; exigences à recouper. |
| `docs/PROMPT_FINAL_V2_CORRECTIONS.md` | **[DOC]** Prompt corrections logiques 9 points + 2 ajouts. |
| `docs/PROMPT_FINAL_V3_FIXES.md` | **[DOC]** Prompt corrections V3 et ajouts confirmatrice premium. |
| `docs/PROMPT_MAITRE_v3_REFONTE_COMPLETE.md` | **[DOC]** Prompt maître refonte zones/livraison/transit/photos/réclamations. |
| `docs/RAPPORT_CORRECTIF_SUPERVISEUR_LIVREURS.md` | **[DOC]** Correctif superviseur/livreurs/zones/transit; aucun changement de schéma selon doc. |
| `docs/RAPPORT_FINAL_TRANSIT_INTERDEPOTS.md` | **[DOC]** Rapport complet transit inter-dépôts: backend, React, Flutter, n8n, endpoints. |
| `docs/RAPPORT_FINAL.md` | **[DOC]** Rapport master prompt v2; fichiers, décisions, instructions de test. |
| `docs/RAPPORT_REFONTE_PRETE_A_TESTER.md` | **[DOC]** Refonte prête à tester: modifications backend/React/Flutter et limites. |
| `docs/REFONTE_FINAL.md` | **[DOC]** Synthèse finale refonte demandes/réclamations et règles métier. |
| `docs/REFONTE_SUMMARY.md` | **[DOC]** Résumé refonte: séparation demande/réclamation, statuts, pool livreur. |
| `docs/SECTION_1_LIVREUR.md` | **[DOC]** Module livreur Flutter: stats, livraisons, statuts, backend attendu. |
| `docs/SECTION_2_CONFIRMATRICE.md` | **[DOC]** Module confirmatrice: pause, fermeture app, commandes, états, workflow. |
| `docs/SECTION_3_CLIENT.md` | **[DOC]** Module client Flutter: SMS, commandes, suivi, réclamations, avis. |
| `docs/SECTION_4_ADMIN.md` | **[DOC]** Module admin React/Flutter: compteurs réclamations, KPIs, dashboards. |
| `docs/SECTION_5_CHATBOT.md` | **[DOC]** Chatbot intelligent: mémoire, historique, référents, actions. |
| `docs/SEED_REPORT.md` | **[DOC]** Seed environnement démo: utilisateurs, commandes, tables nettoyées. |
| `docs/TESTS_RECLAMATIONS_LOGIQUE.md` | **[DOC]** Tests papier logique réclamations/demandes, motifs et attribution. |
| `docs/TESTS_RESULTS.md` | **[DOC]** Résultats tests par section livreur/confirmatrice et scénarios. |
| `docs/VERIFICATION_REPORT.md` | **[DOC]** Rapport vérification backend et Flutter, sous-tâches par rôle. |
