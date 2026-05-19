# Test live du chatbot — pas-a-pas (Windows)

## 0. Pre-requis 1 fois

- Node.js >= 18 installe (`node --version`)
- Compte Groq Cloud + cle API → https://console.groq.com/keys
- Backend ASP.NET buildable (`dotnet build` dans `Web-Api(Asp.net)/Web-Api/`)

## 1. Configurer la cle chatbot dans le backend

Edite `Web-Api(Asp.net)/Web-Api/appsettings.json` et ajoute (si pas deja la) :

```json
"Chatbot": {
  "ApiKey": "ma-cle-chatbot-pfe-2026"
}
```

> La meme valeur doit apparaitre dans `start-n8n.bat` (`CHATBOT_API_KEY`).

## 2. Lancer le backend

Dans un terminal :

```bash
cd "Web-Api(Asp.net)/Web-Api"
dotnet run
```

Verifie qu'il ecoute sur `https://localhost:7178`.

Optionnel : seed les donnees test → `POST https://localhost:7178/api/dev/reset-seed`

## 3. Lancer n8n

Double-clique `n8n/start-n8n.bat`.

n8n s'installe la premiere fois (~1 min via npx). Ouvre http://localhost:5678 et cree le compte admin.

## 4. Configurer Groq dans n8n

**Credentials → New → Header Auth** :
- Name : `Groq API Key`
- Header Name : `Authorization`
- Header Value : `Bearer gsk_xxxxxxxxxxxxxxxxxx` (ta cle Groq)
- Save

## 5. Importer le workflow

**Workflows → Import from File** → choisis `admin-chatbot-workflow.json`.

Apres import :
- Verifie que les 2 nodes Groq pointent vers le credential `Groq API Key` (sinon clique-les et relie)
- Active le workflow (toggle "Active" en haut a droite)
- Note l'URL webhook : `http://localhost:5678/webhook/chatbot`

## 6. Tester

Dans un autre terminal :

```cmd
n8n\test-chatbot.bat
```

Tu dois voir 7 reponses JSON avec `success: true` et un `message` en francais.

## 7. Tester depuis Flutter

Edite `flutter/lib/core/constants.dart` et mets l'URL :

```dart
const String n8nChatbotWebhookUrl = 'http://localhost:5678/webhook/chatbot';
```

Pour Android emulateur : `http://10.0.2.2:5678/webhook/chatbot`.

Lance Flutter, login en admin, va dans l'onglet **Workflow / LLM** → bouton **Ouvrir le chat**.

## Debug rapide

| Symptome | Cause probable | Fix |
|---|---|---|
| `connect ECONNREFUSED ::1:7178` dans n8n | Backend pas lance | Lance `dotnet run` |
| `unable to verify the first certificate` | Certif self-signed ASP.NET | `start-n8n.bat` met deja `NODE_TLS_REJECT_UNAUTHORIZED=0`, ferme et relance |
| `401 Unauthorized` sur les endpoints chat | Cle differente backend vs n8n | Aligne `Chatbot:ApiKey` (appsettings) et `CHATBOT_API_KEY` (start-n8n.bat) |
| `Groq 401` | Cle Groq absente/fausse | Recree le credential Header Auth |
| `intent: fallback` toujours | Groq parse echoue | Ouvre l'execution n8n, regarde le node "Parse intent JSON" |
| Webhook 404 | Workflow pas active | Toggle "Active" |

## Ce qu'il faut montrer au jury

1. Ouvrir n8n dans le navigateur → graphe visuel du workflow
2. Lancer une question depuis Flutter
3. Cliquer sur l'execution dans n8n et montrer :
   - le JSON intent parse par Groq (le LLM ne touche pas la base)
   - le node HTTP qui appelle le Web API avec donnees reelles
   - le node Groq de reformulation qui transforme les chiffres en phrase FR
4. La reponse finale dans la bulle Flutter
