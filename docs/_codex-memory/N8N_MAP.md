# Cartographie n8n

## Workflows détectés

- `automation-n8n/admin-chatbot-workflow.json`: workflow initial "Admin Chatbot - PFE Livraison", webhook `/chatbot`, validation payload, Groq intent, switch, appels backend, format réponse.
- `automation-n8n/admin-chatbot-workflow-cloud.json`: variante cloud proche du workflow initial.
- `automation-n8n/admin-chatbot-workflow-v2.json`: version COD orientée backend `/chat/query`, `/chat/analyze`, `/chat/predict`, KB et Groq formatting.
- `automation-n8n/admin-chatbot-workflow-v3.json`: version bilingue/actions/insights, webhook `/admin-chat-v3`, backend `/chat/ask`, actions, insights.

## Rôle métier

- Fournir un assistant admin/chatbot capable de répondre sur commandes, réclamations, produits, statistiques et connaissances projet.
- Connecter n8n, Groq et API backend pour transformer une question admin en réponse exploitable.

## Déclencheurs

- Webhooks HTTP POST dans les workflows JSON.
- Scripts batch `start-n8n.bat` et `test-chatbot.bat` pour usage local.

## Intégrations

- n8n Webhook.
- Groq via requêtes HTTP.
- Backend ASP.NET Core via endpoints admin/chat ou routes métier.
- Base de connaissance Markdown `admin-chatbot-knowledge.md`.

## Appels API

- Workflow initial: routes backend de comptage/liste commandes, réclamations, produits, gouvernorats, détail commande.
- V2: `/chat/query`, `/chat/analyze`, `/chat/predict` et KB pass-through.
- V3: `/chat/ask`, actions et insights.
- Les URLs et credentials doivent être gérés par variables/credentials n8n.

## Risques

- Plusieurs versions concurrentes; risque de démontrer/importer le mauvais workflow.
- Config/API keys possibles dans environnement n8n; ne jamais committer de vrai `.env`.
- Workflows dépendants de endpoints backend qui peuvent évoluer.
- Redondance avec le chatbot backend/admin React.
- Documentation n8n à synchroniser avec la version retenue.

## Améliorations

- Désigner une version canonique, probablement v3 si validée par Melek.
- Archiver ou renommer clairement les anciennes versions.
- Créer un `.env.example` minimal et vérifier qu'aucun secret réel n'est suivi.
- Ajouter tests de smoke: webhook -> backend -> réponse JSON attendue.
- Documenter le scénario de soutenance et les variables nécessaires.
