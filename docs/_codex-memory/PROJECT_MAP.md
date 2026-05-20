# Cartographie compacte du projet

> Importance: Critique, Haute, Moyenne, Faible.  
> Les dossiers générés (`node_modules`, `bin`, `obj`, `build`, `dist`, `.git`, etc.) sont exclus de l'analyse fonctionnelle.

| Dossier/Fichier | Rôle | Importance | Remarques |
|---|---|---|---|
| `C:\PROJET-PFE` | Racine monorepo PFE | Critique | Contient backend, frontend, mobile, n8n, docs, rapport. |
| `.github` | Configuration GitHub/CI éventuelle | Moyenne | À inspecter seulement si CI/CD devient prioritaire. |
| `.gitignore` | Exclusions Git | Haute | Exclut les artefacts principaux et `.env*`; vérifier les secrets déjà suivis. |
| `docs` | Documentation technique, rapports IA, plans | Critique | Source de contexte, mais plusieurs fichiers peuvent être obsolètes. |
| `docs/_codex-memory` | Mémoire permanente Codex | Critique | À relire au début des prochaines sessions. |
| `docs/BRIEF_GLOBAL_PFE.md` | Brief métier/architecture global | Critique | Référence documentaire la plus complète. |
| `docs/DOCUMENTATION_TECHNIQUE.md` | Documentation technique détaillée | Critique | À recouper avec le code avant action. |
| `docs/SECTION_*.md` | Synthèses par module | Haute | Livreur, confirmatrice, client, admin, chatbot. |
| `docs/*BUTTONS_AUDIT.md` | Audits UX/boutons générés | Moyenne | Utiles comme checklist, pas comme preuve. |
| `docs/PAYMENT_MODULE_*.md` | Documentation paiement | Haute | Konnect/paiement virtuel; à lier aux tests backend. |
| `docs/RAPPORT_FINAL_TRANSIT_INTERDEPOTS.md` | Documentation transit | Haute | Couvre backend, React, Flutter, n8n. |
| `docs/BLOCKERS.md` | Blocages intégration externe | Haute | SMS TT crédits et FCM non configurés selon doc. |
| `backend-aspnet-api` | Solution backend .NET | Critique | API centrale consommée par React, Flutter, n8n. |
| `backend-aspnet-api/Web-Api/Web-Api.csproj` | Projet API ASP.NET Core | Critique | `net8.0`, EF Core, Identity, Hangfire, SignalR, Swagger. |
| `backend-aspnet-api/Web-Api/Program.cs` | Composition applicative | Critique | Auth, CORS, services, jobs, hubs, middleware. |
| `backend-aspnet-api/Web-Api/appsettings.json` | Configuration backend | Critique | Risque secrets/config sensibles; ne pas exposer les valeurs. |
| `backend-aspnet-api/Web-Api/data/AppDbContext.cs` | Modèle EF Core | Critique | Tables métier, relations, indexes, contraintes. |
| `backend-aspnet-api/Web-Api/Controllers` | Endpoints REST | Critique | Surface API principale. |
| `backend-aspnet-api/Web-Api/Services` | Logique métier | Critique | Commandes, paiements, réclamations, geo, transit, notifications. |
| `backend-aspnet-api/Web-Api/Models` | Entités/DTOs | Critique | Contrats backend et DB. |
| `backend-aspnet-api/Web-Api/Migrations` | Historique EF | Haute | Nombreuses migrations; noms temporaires à risque. |
| `backend-aspnet-api/Web-Api.Tests` | Tests backend | Haute | Tests geo/paiement virtuel détectés; couverture limitée. |
| `backend-aspnet-api/Web-Api/wwwroot` | Assets/Kb/SPA statiques | Moyenne | Peut contenir artefacts générés; un fichier KB était déjà modifié. |
| `frontend-react` | Application web React | Critique | Boutique + dashboards rôles + admin. |
| `frontend-react/package.json` | Dépendances/scripts frontend | Critique | React 19, Vite 7, TS, Query, Zustand, Axios. |
| `frontend-react/src/app/routes.tsx` | Routes React | Critique | Source principale navigation et rôles. |
| `frontend-react/src/shared/api` | Client API et endpoints | Critique | Alignement backend à vérifier. |
| `frontend-react/src/features` | Fonctionnalités UI | Haute | Modules métier par domaine. |
| `frontend-react/src/pages` | Pages de haut niveau | Haute | Boutique, auth, dashboards. |
| `frontend-react/dist` | Build généré | Faible | Ignoré; ne pas analyser/modifier. |
| `mobile-flutter` | Application mobile Flutter | Critique | Multi-rôles et terrain. |
| `mobile-flutter/pubspec.yaml` | Dépendances Flutter | Critique | Provider, HTTP, Maps, SignalR, secure storage, Hive. |
| `mobile-flutter/lib/main.dart` | Entrée et routage rôle | Critique | Sélectionne client/livreur/admin/confirmatrice/superviseur/transit. |
| `mobile-flutter/lib/core/network/api_client.dart` | Client HTTP mobile | Critique | Gestion token, erreurs, multipart, timeouts. |
| `mobile-flutter/lib/core/config/constants.dart` | Config mobile | Critique | URL locale/token config; à externaliser. |
| `mobile-flutter/lib/features` | Fonctionnalités mobile | Haute | Admin, client, livreur, confirmatrice, transit, superviseur. |
| `mobile-flutter/test/widget_test.dart` | Test Flutter minimal | Faible | Smoke test seulement. |
| `automation-n8n` | Workflows chatbot/automation | Haute | Plusieurs versions concurrentes. |
| `automation-n8n/*.json` | Workflows n8n | Haute | Webhooks, Groq, backend; choisir version canonique. |
| `automation-n8n/.env.example` | Exemple environnement n8n | Moyenne | Ne doit pas contenir de vrais secrets. |
| `automation-n8n/admin-chatbot-knowledge.md` | Base de connaissance chatbot | Moyenne | Document métier utile pour démo. |
| `Rapport/Rapport_PFE.docx` | Rapport académique | Haute | Alignement avec état réel du code à vérifier avant soutenance. |
