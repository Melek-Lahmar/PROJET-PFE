# Chatbot n8n + Groq — Guide de setup

Ce dossier contient le workflow n8n importable et les instructions pour faire tourner le chatbot métier devant le jury.

## Architecture

```
Flutter (module chat admin)
   │  POST /webhook/chatbot { question, sessionId }
   ▼
n8n (workflow `Admin Chatbot — PFE Livraison`)
   ├─ Validate payload
   ├─ Groq #1 : parse intention → JSON {intent, entity, filters, ...}
   ├─ Switch : route par intent
   ├─ HTTP : appelle l'endpoint Web API correspondant
   ├─ Groq #2 : reformule la réponse en français à partir des données
   └─ Respond to Webhook → JSON { success, message, intent, data, ui }
```

Le LLM ne voit **jamais** la base. Il ne fait que :
1. comprendre la question (intent)
2. reformuler les données réelles (réponse FR)

## Pré-requis

- n8n local (Docker ou `npx n8n`) — version ≥ 1.50
- Compte Groq Cloud avec une clé API → https://console.groq.com/
- Le backend ASP.NET tourne sur `https://localhost:7178` (ou ton URL)
- Une clé chatbot configurée dans `appsettings.json` :

```json
"Chatbot": { "ApiKey": "ta-cle-longue-aleatoire" }
```

## Démarrage rapide

### 1. Lancer n8n

```bash
# option a — npx (le plus simple pour démo locale)
npx n8n

# option b — docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

n8n s'ouvre sur http://localhost:5678 (créer un compte la première fois).

### 2. Configurer les variables d'environnement

Dans n8n : **Settings → Variables** (ou via env n8n) :

| Variable | Valeur |
|---|---|
| `WEBAPI_BASE_URL` | `https://localhost:7178` (ou ton URL backend) |
| `CHATBOT_API_KEY` | la même clé que dans `appsettings.json` |

### 3. Configurer les credentials Groq

Dans n8n : **Credentials → Create credential → Header Auth** :

- Name: `Groq API Key`
- Header Name: `Authorization`
- Header Value: `Bearer <ta-clé-groq>`

### 4. Importer le workflow

Dans n8n : **Workflows → Import from File** → choisir `admin-chatbot-workflow.json`.

Activer le workflow (toggle "Active" en haut à droite).

L'URL du webhook s'affiche en cliquant sur le node Webhook (ex : `http://localhost:5678/webhook/chatbot`).

### 5. Tester en curl

```bash
curl -X POST http://localhost:5678/webhook/chatbot \
  -H "Content-Type: application/json" \
  -d '{"question": "Combien de commandes livrées aujourd hui ?"}'
```

Réponse attendue (raccourcie) :
```json
{
  "success": true,
  "message": "Il y a 12 commandes livrées aujourd'hui.",
  "intent": "get_orders_count",
  "data": { "count": 12, "label": "livrée(s) sur today" },
  "ui": { "type": "text", "show_table": false, "show_chart": false }
}
```

### 6. Brancher Flutter

Dans `flutter/lib/core/constants.dart` ou via env, configurer :
```dart
const n8nWebhookUrl = 'http://localhost:5678/webhook/chatbot';
```

L'app Flutter envoie la question, lit la réponse, l'affiche dans une bulle.

## Intents supportés (V1)

| Intent | Endpoint Web API | Cas d'usage |
|---|---|---|
| `get_orders_count` | `/api/admin/chat/orders/count` | "Combien de commandes livrées hier ?" |
| `list_orders` | `/api/admin/chat/orders/list` | "Liste-moi les commandes en attente" |
| `get_claims_count` | `/api/admin/chat/claims/count` | "Combien de réclamations non traitées ?" |
| `top_products` | `/api/admin/chat/products/top` | "Quels sont les meilleurs produits ?" |
| `governorate_stats` | `/api/admin/chat/governorates/stats` | "Quel gouvernorat performe le mieux ?" |
| `order_detail` | `/api/admin/chat/orders/{piece}` | "Donne-moi les détails de la commande BC0042" |

## Sécurité

- **Webhook n8n** : exposé sur `localhost` en démo. En prod, mettre derrière un reverse-proxy avec auth.
- **Web API** : protégé par header `X-Chat-Api-Key` (chaque requête de n8n l'injecte).
- **Groq** : clé API stockée dans les credentials n8n, jamais loggée.

## Gestion d'erreurs

Le workflow gère :
- payload invalide → erreur 4xx renvoyée à Flutter
- intent inconnu → fallback "Je n'ai pas compris la question."
- Web API indisponible → message d'erreur clair
- timeout Groq → réponse brute des données

## Demo jury — points à montrer

1. **Le LLM ne voit pas la base** : le node "Groq Parse intent" prend la question pure, retourne un JSON structuré.
2. **Switch n8n visualise le routage** : un graphe lisible.
3. **Données réelles** : montrer le node HTTP avec la réponse JSON brute du Web API.
4. **Reformulation** : Groq génère du français propre à partir des données.
5. **Sécurité** : la clé chatbot est requise sur tous les endpoints `/api/admin/chat/*`.
