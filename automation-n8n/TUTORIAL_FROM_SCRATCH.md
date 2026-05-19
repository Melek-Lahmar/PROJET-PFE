# Tutoriel n8n pas-à-pas — construire le workflow chatbot

Ce guide t'accompagne pour **construire le workflow chatbot from scratch** dans
l'UI n8n. Tu ne fais pas un import JSON — tu cliques chaque nœud et tu comprends
ce qu'il fait. C'est ça la valeur pour comprendre / défendre devant le jury.

> **Note** : dans le code Flutter actuel le chatbot utilise l'orchestration
> in-process backend (`POST /api/admin/chat/ask`), donc n8n n'est plus requis
> pour faire tourner l'app. Mais le savoir-faire n8n vaut la peine — ce
> tutoriel reconstruit le pipeline équivalent dans n8n pour la démo.

---

## Ce que tu vas construire

```
Flutter
   │
   │  POST { "question": "Combien de commandes livrées ?" }
   ▼
┌────────────────────────────────────────────────────────────────┐
│ n8n workflow                                                   │
│                                                                │
│  [Webhook] → [Validate] → [Groq Router] → [Parse] → [Switch]   │
│                                                  │             │
│                              ┌───────────────────┼─────────┐   │
│                              ▼                   ▼         ▼   │
│                        [HTTP /query]    [HTTP /analyze]  [KB]  │
│                              │                   │         │   │
│                              └────────┬──────────┘         │   │
│                                       ▼                    │   │
│                              [Groq Formatter] ←────────────┘   │
│                                       │                        │
│                                       ▼                        │
│                              [Respond to Webhook]              │
└────────────────────────────────────────────────────────────────┘
   │
   ▼
Flutter reçoit { success, message, action, data }
```

**Idée** : le LLM ne lit jamais la base. Il fait deux choses :
1. **Comprendre** la question → JSON structuré (action + payload)
2. **Reformuler** les données SQL en français propre

Entre les deux, n8n appelle ton backend C# qui fait la vraie requête SQL.

---

## Partie 1 — Setup avant de toucher n8n

### 1.1 Ce dont tu as besoin

- **n8n** local : `npx n8n` ou Docker (port 5678)
- **Clé Groq** : https://console.groq.com/keys (gratuit pour démo)
- **Backend** ASP.NET qui tourne sur `https://localhost:7178`
- Une **clé chatbot** partagée backend ↔ n8n (ex: `ma-cle-chatbot-pfe-2026`)

### 1.2 Configurer le backend

Dans `Web-Api(Asp.net)/Web-Api/appsettings.json` :

```json
"Chatbot": {
  "ApiKey": "ma-cle-chatbot-pfe-2026"
}
```

Lance le backend : `cd "Web-Api(Asp.net)/Web-Api" && dotnet run`

### 1.3 Lancer n8n

```bash
npx n8n
```

Ouvre `http://localhost:5678`, crée ton compte admin.

### 1.4 Créer la credential Groq dans n8n

`Credentials → Create → Header Auth` :
- Name : **Groq API Key**
- Header Name : `Authorization`
- Header Value : `Bearer gsk_TA_CLE_GROQ`

---

## Partie 2 — Construction du workflow nœud par nœud

`Workflows → Create Workflow` → nomme-le **Admin Chatbot — PFE**.

### Nœud 1 — Webhook (l'entrée)

`Add node → Trigger → Webhook`

Paramètres :
- **HTTP Method** : `POST`
- **Path** : `chatbot`
- **Respond** : `Using 'Respond to Webhook' Node` (important : on répond manuellement à la fin)

Pourquoi : c'est l'URL que Flutter appelle. n8n va donner une URL de test
type `http://localhost:5678/webhook-test/chatbot` et une de prod
`http://localhost:5678/webhook/chatbot`.

### Nœud 2 — Code (validation du payload)

`Add node → Code` (JS).

Code :

```javascript
// On accepte { question, sessionId } depuis Flutter.
const body = $json.body || $json;
const question = (body.question || '').toString().trim();
if (!question) {
  throw new Error('question is required');
}
return [{ json: { question, sessionId: body.sessionId || null } }];
```

Pourquoi : on rejette les payloads vides tout de suite, et on normalise pour
la suite du pipeline.

### Nœud 3 — HTTP Request (Groq Router)

`Add node → HTTP Request`.

Paramètres :
- **Method** : `POST`
- **URL** : `https://api.groq.com/openai/v1/chat/completions`
- **Authentication** : Generic Credential Type → Header Auth → choisis ta credential **Groq API Key**
- **Send Headers** : ON, ajoute `Content-Type: application/json`
- **Send Body** : ON, **Body Content Type** = JSON, **Specify Body** = "Using JSON"

Body (JSON) :

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "Tu es le routeur du chatbot admin d'une plateforme de livraison COD en Tunisie. Tu reçois une question et tu retournes UNIQUEMENT un JSON avec ces champs : action ('query' | 'kb' | 'chitchat'), payload (objet adapté), expected_format ('metric' | 'list' | 'text'). Règles : 'query' pour les chiffres ('combien de commandes', 'top produits'), 'kb' pour les questions conceptuelles ('c'est quoi une réclamation'), 'chitchat' pour les salutations. Pour query, payload = { entity: 'orders'|'claims'|'products', metric: 'count'|'list', filters: { period: 'today'|'7d'|'30d', status: string|null, governorate: string|null } }."
    },
    {
      "role": "user",
      "content": {{ JSON.stringify($json.question) }}
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0
}
```

> Astuce : `{{ JSON.stringify(...) }}` sert à insérer la question avec
> échappement JSON correct (guillemets, accents, etc.).

Pourquoi : Groq lit la question, applique notre prompt système, et nous
retourne un JSON structuré. `response_format: json_object` force Groq à
répondre en JSON valide. `temperature: 0` rend le routage déterministe.

### Nœud 4 — Code (parser la réponse Groq)

`Add node → Code`.

```javascript
const raw = $json.choices?.[0]?.message?.content || '{}';
let routed;
try {
  routed = JSON.parse(raw);
} catch {
  routed = { action: 'chitchat', payload: {}, expected_format: 'text' };
}
const question = $('Validate payload').item.json.question;
return [{ json: { ...routed, originalQuestion: question } }];
```

Pourquoi : la réponse Groq arrive enveloppée dans `choices[0].message.content`.
On l'extrait, parse en JSON, et on garde l'**originalQuestion** pour la
reformulation finale.

### Nœud 5 — Switch (routage par action)

`Add node → Flow → Switch`.

Mode : **Rules**.

Crée 3 routes (output) :

| Output name | Condition |
|---|---|
| `query` | `{{ $json.action }}` equals `query` |
| `kb` | `{{ $json.action }}` equals `kb` |
| `chitchat` | `{{ $json.action }}` equals `chitchat` |

**Fallback Output** : `extra` (chitchat aussi pour les actions inconnues).

Pourquoi : chaque action mène à un traitement différent. On évite les ifs
imbriqués.

### Nœud 6a — HTTP Request (route `query` → backend)

Sur la sortie `query` du Switch, ajoute un HTTP Request.

- **Method** : `POST`
- **URL** : `={{ $env.WEBAPI_BASE_URL || "https://localhost:7178" }}/api/admin/chat/query`
- **Send Headers** : ON, ajoute :
  - `Content-Type: application/json`
  - `X-Chat-Api-Key: ={{ $env.CHATBOT_API_KEY || "ma-cle-chatbot-pfe-2026" }}`
- **Send Body** : ON, JSON :

```json
{
  "entity": "={{ $json.payload.entity }}",
  "metric": "={{ $json.payload.metric }}",
  "filters": {{ JSON.stringify($json.payload.filters || {}) }},
  "groupBy": {{ $json.payload.groupBy ? '"' + $json.payload.groupBy + '"' : 'null' }},
  "limit": {{ $json.payload.limit || 10 }}
}
```

> Si tu veux pas batailler avec les expressions n8n, mets `"={{ $json.payload }}"` directement et désérialise côté backend. Mais explicite c'est plus pédagogique.

- **Options → SSL → Ignore SSL Issues** : ON (le backend dev a un cert auto-signé)

Pourquoi : c'est le seul endroit où on touche la base. Le backend sait faire
les agrégats EF Core de manière sûre — n8n ne fait que le passe-plat.

### Nœud 6b — Set (route `kb` → réponse statique)

Sur la sortie `kb` du Switch, ajoute un nœud `Set` (Edit Fields).

Mode : **Manual**, ajoute un champ :
- Name : `kbAnswer`
- Type : String
- Value : `Réponse depuis la KB statique : {{ $json.originalQuestion }}` (en
  vrai tu peux faire un mapping question→réponse avec un Code, mais pour la
  démo tu peux laisser le formatter Groq aval s'occuper de ça via la KB injectée
  dans le prompt système).

Pourquoi : pas besoin de toucher la base pour les questions conceptuelles.
Tu peux même mettre la KB markdown directement dans le prompt système du
formatter Groq aval — c'est ce que fait la V2 réelle.

### Nœud 6c — Set (route `chitchat`)

Sur la sortie `chitchat` (et `extra`), ajoute un Set :
- `chitchatReply` : `Bonjour ! Je suis l'assistant admin. Pose-moi une question sur les commandes, les réclamations, les livreurs...`

Pourquoi : les salutations n'ont pas besoin du LLM ni de la base. Réponse
canonique en dur.

### Nœud 7 — Merge (réunir les 3 branches)

`Add node → Flow → Merge`.

- **Mode** : `Combine`
- **Combination Mode** : `Multiplex` ou `Append` selon la version n8n.

Connecte les 3 sorties précédentes dessus. La Merge attend une valeur de chaque
branche puis poursuit avec une seule.

> En pratique, pour un workflow plus simple, tu peux laisser les 3 branches
> aller indépendamment vers le Respond final (chacune avec son contenu propre).

### Nœud 8 — HTTP Request (Groq Formatter)

Reformule les données en français propre.

- **Method** : `POST`
- **URL** : `https://api.groq.com/openai/v1/chat/completions`
- **Auth** : Header Auth → Groq API Key
- **Body** :

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "Tu reformules les données du chatbot en 1-3 phrases françaises naturelles, claires, professionnelles. Pas de markdown, pas de code, pas d'emojis. Si la donnée est un nombre ou une liste, énonce-la clairement avec contexte."
    },
    {
      "role": "user",
      "content": "Question : {{ $('Parse routing JSON').item.json.originalQuestion }}\n\nDonnées : {{ JSON.stringify($json) }}\n\nReformule en français."
    }
  ],
  "temperature": 0.3
}
```

Pourquoi : le backend renvoie du JSON brut (`{ value: 13, metric: 'count', ... }`).
Le LLM le transforme en `"Il y a 13 commandes livrées."` — ça donne l'impression
d'une vraie conversation.

### Nœud 9 — Code (extraire le texte final)

```javascript
const message = $json.choices?.[0]?.message?.content?.trim() || 'Pas de réponse.';
const data = $('Parse routing JSON').item.json;
const queryResult = $('HTTP /query').item?.json || null;

return [{ json: {
  success: true,
  message,
  action: data.action,
  data: queryResult,
}}];
```

Pourquoi : on assemble le payload final pour Flutter. Le `message` est la
phrase FR, `data` contient les chiffres bruts si Flutter veut les rendre en
graphe.

### Nœud 10 — Respond to Webhook (la sortie)

`Add node → Respond to Webhook`.

- **Respond With** : `JSON`
- **Response Body** : `={{ $json }}`

Pourquoi : c'est ce nœud qui ferme la boucle commencée par le Webhook initial.
Sans lui, n8n bloque jusqu'au timeout.

---

## Partie 3 — Tester

### 3.1 Activer le workflow

Toggle "Active" en haut à droite.

### 3.2 Test depuis n8n (Execute Workflow)

Clique le nœud Webhook → "Listen for Test Event" → en parallèle dans un terminal :

```bash
curl -X POST http://localhost:5678/webhook-test/chatbot \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"Combien de commandes ?\"}"
```

n8n va exécuter le workflow et te montrer chaque nœud avec son input/output.
**C'est le meilleur moment pour comprendre** : clique sur chaque nœud pour
voir ce qui transite.

### 3.3 Test en mode prod

Une fois le toggle "Active" allumé :

```bash
curl -X POST http://localhost:5678/webhook/chatbot \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"Combien de commandes ?\"}"
```

Tu dois recevoir :

```json
{
  "success": true,
  "message": "Il y a 13 commandes au total.",
  "action": "query",
  "data": { "value": 13, "metric": "count", ... }
}
```

### 3.4 Brancher Flutter

Dans `flutter/lib/core/constants.dart` :

```dart
const n8nChatbotWebhookUrl = 'http://localhost:5678/webhook/chatbot';
```

Et dans `AdminChatService` (si tu veux repartir sur n8n au lieu de
`/api/admin/chat/ask`), faire `POST n8nChatbotWebhookUrl` avec
`{ question, sessionId }`.

> Pour la démo actuelle de l'app, garder l'orchestrateur in-process est plus
> simple (zéro service externe). Mais avoir le n8n qui tourne en parallèle
> permet de **montrer l'orchestration visuelle** au jury.

---

## Partie 4 — Pour aller plus loin

Une fois la V1 simple comprise, tu peux ajouter :

1. **Branche `analyze`** : nouveau Switch output → HTTP `POST /api/admin/chat/analyze` avec `{ operation: 'trend', subject: { entity, metric, filters }, options: ... }`. Retourne une série temporelle.
2. **Branche `predict`** : HTTP `POST /api/admin/chat/predict` avec `{ task: 'return_risk', input: { ... } }`. Retourne probabilité + facteurs.
3. **KB injectée** : passe la KB markdown (14 KB de doc projet) dans le `system` du Groq Router. Comme ça, Groq peut décider tout seul de répondre directement (action `kb`) sans appeler de backend.
4. **Persistence d'historique** : dans le code initial, stocke `sessionId + question + answer` dans une table SQL via un HTTP Request supplémentaire.

C'est exactement ce que fait `admin-chatbot-workflow-v2.json`. Une fois ton V1
simple validé, ouvre le V2 dans n8n (`Import from File`) et compare nœud par
nœud — tu auras tout le mapping mental.

---

## Partie 5 — Checklist de démo jury

Quand tu présenteras n8n au jury :

- [ ] Montrer le **Webhook** : "Flutter envoie ici."
- [ ] Montrer le **Groq Router** : "Le LLM transforme la phrase en JSON."
- [ ] Montrer le **Switch** : "On route selon l'action."
- [ ] Cliquer le **HTTP /query** : "Voilà la requête réelle vers la base via le backend."
- [ ] Montrer le **Groq Formatter** : "Le LLM ne touche jamais la base, il reformule juste."
- [ ] Insister : **deux séparations** = sécurité + traçabilité (le LLM ne peut pas exfiltrer, le backend valide tout).

---

## Erreurs fréquentes

| Symptôme | Cause | Fix |
|---|---|---|
| `401 Unauthorized` sur Groq | Header Authorization manquant | Vérifie la credential, valeur = `Bearer gsk_...` (avec espace) |
| `404 Not Found` sur le backend | Mauvais port HTTPS | Backend dev = `7178` HTTPS ou `5123` HTTP, choisis le bon |
| `SSL handshake failed` | Cert auto-signé non accepté | HTTP Request → Options → "Allow Unauthorized Certs" = ON |
| Groq retourne du texte au lieu de JSON | `response_format` manquant | Ajoute `"response_format": {"type": "json_object"}` dans le body |
| Workflow bloque sans répondre | Pas de "Respond to Webhook" final | Ajoute le nœud final, et configure Webhook initial avec `Respond: Using 'Respond to Webhook' Node` |
| Variables `$env` undefined | Pas configuré | Settings n8n → Variables, ou écris la valeur en dur pour la démo |

---

## Résumé : la valeur pédagogique de n8n

n8n te montre **visuellement** ce que fait l'orchestrateur in-process en C# :

- **Webhook** = endpoint `/api/admin/chat/ask`
- **Groq Router** = `AdminChatOrchestratorService.RouteAsync`
- **Switch + HTTP** = `AdminChatQueryService` / `AdminChatAnalyzeService` / `PredictionService`
- **Groq Formatter** = `AdminChatOrchestratorService.FormatAsync`
- **Respond** = retour JSON `ChatAskResponse`

Avoir les deux côte-à-côte (n8n + C#) renforce ta démo : tu montres le pattern,
puis tu expliques que tu l'as ré-implémenté en C# pour réduire les
dépendances en prod.
