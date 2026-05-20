# Plan d'optimisation

> Plan sans modification directe du code. Toute action source nécessite validation explicite de Melek.

| Étape | Action | Module | Risque | Priorité | Validation nécessaire |
|---|---|---|---|---|---|
| 1 | Relire `PROJECT_MEMORY.md`, `PROJECT_MAP.md`, `NEXT_ACTIONS.md` au début de session | Global | Faible | P1 | Non |
| 2 | Vérifier Git: fichiers suivis sensibles et artefacts générés | Global | Moyen | P1 | Oui avant nettoyage |
| 3 | Externaliser secrets backend vers env/user-secrets | Backend | Moyen | P1 | Oui |
| 4 | Remplacer validation TLS désactivée Sage | Backend | Moyen | P1 | Oui |
| 5 | Créer `.env.example` propre backend/frontend/mobile/n8n | Global | Faible | P1 | Oui |
| 6 | Choisir workflow n8n canonique et documenter la démo | n8n | Faible | P1 | Oui |
| 7 | Vérifier routes critiques API avec Swagger/cURL/Postman | Backend | Faible | P1 | Oui |
| 8 | Vérifier mismatch admin homepage frontend/backend | Frontend/Backend | Moyen | P1 | Oui |
| 9 | Vérifier parcours paiement Konnect/virtuel | Frontend/Backend | Moyen | P1 | Oui |
| 10 | Vérifier parcours commande client -> confirmatrice -> livreur | Global | Moyen | P1 | Oui |
| 11 | Centraliser/générer contrats API TypeScript | Frontend | Moyen | P2 | Oui |
| 12 | Centraliser endpoints Dart ou générer client mobile | Mobile | Moyen | P2 | Oui |
| 13 | Ajouter smoke tests frontend sur routes clés | Frontend | Moyen | P2 | Oui |
| 14 | Ajouter tests Flutter services/providers critiques | Mobile | Moyen | P2 | Oui |
| 15 | Étendre tests backend: auth, order, reclamation, livreur | Backend | Moyen | P2 | Oui |
| 16 | Nettoyer pages placeholder ou les masquer pour soutenance | Frontend/Mobile | Moyen | P2 | Oui |
| 17 | Homogénéiser style UI dashboards | Frontend | Moyen | P2 | Oui |
| 18 | Optimiser dashboard: pagination, filtres, requêtes ciblées | Backend/Frontend | Moyen | P2 | Oui |
| 19 | Nettoyer code mort après recherche usages | Global | Moyen | P2 | Oui |
| 20 | Nettoyer migrations temporaires uniquement après sauvegarde DB | Backend/DB | Élevé | P2 | Oui strict |
| 21 | Mettre à jour README frontend/mobile/backend | Docs | Faible | P3 | Oui |
| 22 | Aligner `Rapport_PFE.docx` avec état réel du code | Rapport | Moyen | P2 | Oui |
| 23 | Préparer scénario soutenance bout-en-bout | Global | Faible | P1 | Oui |
| 24 | Créer checklist de données de démo | DB/Global | Moyen | P1 | Oui |
| 25 | Documenter limites assumées: SMS, FCM, providers externes | Docs | Faible | P2 | Oui |
