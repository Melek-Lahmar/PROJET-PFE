# SECTION 5 — Chatbot intelligent

> Section 5/5 du brief technique global — la dernière. Couvre la refonte du chatbot admin (n8n + Groq + LLaMA 3.3 70B + backend in-process). Doit être lue après les 4 sections précédentes.

---

## 5.1 Contexte

Tu as déjà un chatbot fonctionnel basé sur :
- **Backend orchestrateur** : `AdminChatOrchestratorService.cs` (pipeline Groq router → action → exécution → Groq formatter)
- **5 actions** : `kb` / `query` / `analyze` / `predict` / `chitchat`
- **3 services métier** : `AdminChatQueryService`, `AdminChatAnalyzeService`, `PredictionService`
- **n8n workflow V2** qui mirroir le backend pour démo
- **KB markdown** de 14 KB
- **UI Flutter premium** avec catégories, charts inline

L'objectif est de le **rendre vraiment intelligent** avec 8 améliorations :

| # | Amélioration | Impact PFE |
|---|---|---|
| 1 | Mémoire conversationnelle | UX |
| 2 | Bilingue FR/AR/Tounsi | 🇹🇳 Local |
| 3 | Suggestions proactives | 💎 Wow |
| 4 | Actions sécurisées (write) | 💎 Wow |
| 5 | Voice input/output | 💎 Wow |
| 6 | Streaming des réponses | UX |
| 7 | Quick-replies contextuelles | UX |
| 8 | KB hybride auto-générée | Robustesse |

Architecture cible : **garder n8n ET backend in-process** côte à côte pour la démo jury.

---

## 5.2 Amélioration 1 — Mémoire conversationnelle

### 5.2.1 Le problème

Aujourd'hui chaque question est traitée **isolément**. Si l'admin demande :
- *« Combien de commandes aujourd'hui ? »* → 13
- *« Et à Sfax ? »* → ❌ le bot ne comprend pas

### 5.2.2 La solution

Stocker l'**historique conversationnel** par session et l'injecter dans chaque appel Groq.

### 5.2.3 Backend — table d'historique

```sql
CREATE TABLE F_CHATBOT_SESSION (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    StartedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    LastActivityAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Language NVARCHAR(10) NOT NULL DEFAULT 'fr'
);

CREATE TABLE F_CHATBOT_MESSAGE (
    Id BIGINT IDENTITY PRIMARY KEY,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    Role NVARCHAR(20) NOT NULL,        -- 'user' / 'assistant' / 'system'
    Content NVARCHAR(MAX) NOT NULL,
    Action NVARCHAR(20) NULL,          -- kb / query / analyze / predict / chitchat / action
    DataJson NVARCHAR(MAX) NULL,       -- résultat JSON
    Feedback NVARCHAR(10) NULL,        -- 'up' / 'down' / null
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_F_CHATBOT_MESSAGE_Session ON F_CHATBOT_MESSAGE (SessionId, CreatedAt);
```

### 5.2.4 Logique d'injection

À chaque appel `/api/admin/chat/ask`, charger les **6 derniers messages** de la session et les injecter dans le prompt système Groq :

```csharp
var history = await _db.ChatbotMessages
    .Where(m => m.SessionId == sessionId)
    .OrderByDescending(m => m.CreatedAt)
    .Take(6)
    .OrderBy(m => m.CreatedAt)  // remettre dans l'ordre chronologique
    .ToListAsync(ct);

var contextPrefix = "Historique récent (le plus récent en bas) :\n" +
    string.Join("\n", history.Select(m => $"{m.Role}: {m.Content}"));

var routerPrompt = $"{RouterSystemPrompt}\n\n{contextPrefix}";
```

### 5.2.5 Détection de référents

Quand le bot voit *« Et à Sfax ? »*, il doit reprendre la **dernière intention** et juste changer le filtre :

```csharp
if (_isFollowUp(question, history))
{
    var lastQuery = history.LastOrDefault(m => m.Action == "query");
    if (lastQuery != null)
    {
        // Réutilise l'entité + métrique précédente, ajoute le filtre extrait
        var extractedFilter = ExtractFilter(question); // gouvernorat, date...
        return MergeQueryWithFilter(lastQuery, extractedFilter);
    }
}
```

### 5.2.6 Limite et nettoyage

- **Max 50 messages** par session, après → archivage
- **Sessions > 24h sans activité** → archivées dans `F_CHATBOT_SESSION_ARCHIVE`
- **Job Hangfire quotidien** pour le nettoyage

---

## 5.3 Amélioration 2 — Bilingue FR / AR / Tounsi

### 5.3.1 Comportement

Le chatbot détecte automatiquement la langue de la question et **répond dans la même langue** :

| Question | Réponse |
|---|---|
| « Combien de commandes aujourd'hui ? » | « Il y a 13 commandes livrées aujourd'hui. » |
| « كم عدد الطلبات اليوم؟ » | « يوجد 13 طلبية مسلمة اليوم. » |
| « 9adech 3andna mn commande lyoum ? » | « 3andek 13 commande mselma lyoum. » |

### 5.3.2 Détection de langue

Service `LanguageDetectorService` simple basé sur des regex :

```csharp
public enum ChatLanguage { French, Arabic, Tounsi }

public ChatLanguage Detect(string text)
{
    // Caractères arabes
    if (Regex.IsMatch(text, @"[\u0600-\u06FF]"))
        return ChatLanguage.Arabic;

    // Tunisien : chiffres 3, 7, 9 utilisés comme lettres + mots fréquents
    var tounsiMarkers = new[] { 
        "3andek", "3andi", "3andna", "9adech", "ch7al", "lyoum", 
        "barcha", "marra", "wache", "kifech", "fama"
    };
    var lower = text.ToLowerInvariant();
    if (tounsiMarkers.Any(m => lower.Contains(m)) ||
        Regex.IsMatch(text, @"\b[a-z]*[3679][a-z]*\b", RegexOptions.IgnoreCase))
        return ChatLanguage.Tounsi;

    return ChatLanguage.French;
}
```

### 5.3.3 Adaptation du prompt système

Le `FormatterSystemPrompt` change selon la langue détectée :

```csharp
var systemPrompt = language switch
{
    ChatLanguage.French => FormatterPromptFr,
    ChatLanguage.Arabic => FormatterPromptAr,
    ChatLanguage.Tounsi => FormatterPromptTounsi,
    _ => FormatterPromptFr
};
```

**Prompt tunisien** :

```
Tu es l'assistant métier d'une plateforme de livraison COD en Tunisie.
Tu réponds en tunisien (darija) clair et naturel, en utilisant le code ASCII
courant : 3 pour ع, 7 pour ح, 9 pour ق, 5 pour خ.
Reste professionnel, ne mets pas d'emoji, 1 à 3 phrases maximum.
N'invente jamais de chiffres absents des données fournies.
```

### 5.3.4 Stockage de la préférence

Si l'utilisateur écrit 3 questions de suite en tunisien, marquer `F_CHATBOT_SESSION.Language = 'tounsi'` pour que les réponses suivantes soient cohérentes même sur des questions ambiguës comme « ok ».

---

## 5.4 Amélioration 3 — Suggestions proactives

### 5.4.1 Le concept

Au lieu de seulement répondre aux questions, le chatbot **détecte des anomalies** et alerte l'admin proactivement :

> *« 🔔 J'ai détecté une augmentation de 35% des retours à Sousse cette semaine vs la moyenne 30j. Voulez-vous voir le détail ? »*

### 5.4.2 Job Hangfire d'analyse

Un job qui tourne toutes les **30 minutes** :

```csharp
public class ProactiveInsightsJob
{
    public async Task RunAsync()
    {
        var insights = new List<ProactiveInsight>();

        // Anomalie 1 : taux de retour > +20% vs moyenne 30j sur un gouvernorat
        var returnAnomalies = await DetectReturnRateAnomalies();
        insights.AddRange(returnAnomalies);

        // Anomalie 2 : confirmatrice avec charge > 2× la moyenne
        var confOverload = await DetectConfirmatriceOverload();
        insights.AddRange(confOverload);

        // Anomalie 3 : produit avec taux de réclamation > 30%
        var productIssues = await DetectProductIssues();
        insights.AddRange(productIssues);

        // Anomalie 4 : livreur avec taux de réussite chuté
        var driverPerf = await DetectDriverPerformanceDrop();
        insights.AddRange(driverPerf);

        // Stocker les insights non encore présentés
        foreach (var insight in insights)
            await UpsertInsight(insight);
    }
}
```

### 5.4.3 Table des insights

```sql
CREATE TABLE F_CHATBOT_INSIGHT (
    Id BIGINT IDENTITY PRIMARY KEY,
    Type NVARCHAR(50) NOT NULL,           -- 'return_anomaly', 'overload', etc.
    Severity NVARCHAR(10) NOT NULL,       -- 'info', 'warning', 'critical'
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(500) NOT NULL,
    PayloadJson NVARCHAR(MAX) NULL,       -- pour drill-down
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ShownToAdminAt DATETIME2 NULL,
    DismissedAt DATETIME2 NULL,
    AdminFeedback NVARCHAR(10) NULL       -- 'useful' / 'not-useful'
);
```

### 5.4.4 Présentation à l'admin

Quand l'admin ouvre l'écran chatbot, le frontend récupère les insights non vus :

```
GET /api/admin/chat/insights/pending
```

Affichés en **bandeau cliquable** au-dessus du chat :

```
┌──────────────────────────────────────────────────────────────┐
│ 🔔 3 alertes pour vous                                        │
│                                                                │
│ ⚠️  Retours +35% à Sousse cette semaine          [Analyser]   │
│ ℹ️   Confirmatrice Amira surchargée (24 cas)     [Voir]       │
│ 🚨  Produit BICY-RED-42 — 8 réclamations          [Détail]    │
└──────────────────────────────────────────────────────────────┘
```

Au clic « Analyser » → message auto-injecté dans le chat : *« Pourquoi tant de retours à Sousse cette semaine ? »* → le bot répond avec l'analyse complète.

### 5.4.5 Endpoint feedback

```
POST /api/admin/chat/insights/{id}/feedback
Body: { "feedback": "useful" | "not-useful", "dismiss": true }
```

Permet d'ajuster les seuils de détection plus tard (ML léger sur quels insights sont utiles).

---

## 5.5 Amélioration 4 — Actions sécurisées (write)

### 5.5.1 Le concept

Le chatbot peut désormais **exécuter des actions**, pas juste lire. Avec **double confirmation obligatoire** pour éviter les erreurs.

### 5.5.2 Actions autorisées (whitelist)

Pour le PFE, on limite à 6 actions sûres :

| Action | Exemple de question |
|---|---|
| `create_claim` | « Crée une réclamation pour BL00123 motif COLIS_ENDOMMAGE » |
| `assign_driver` | « Assigne BL00123 au livreur Ahmed » |
| `change_order_status` | « Passe BL00123 en retournée » |
| `release_case` | « Libère le cas #245 » |
| `pause_confirmer` | « Mets Amira en pause » |
| `send_sms_client` | « Envoie un SMS au client de BL00123 pour confirmer disponibilité » |

Toute autre action → refus poli + lien vers les écrans admin appropriés.

### 5.5.3 Routing — nouvelle action `action`

Le router Groq peut désormais retourner :

```json
{
  "action": "action",
  "payload": {
    "actionType": "create_claim",
    "params": {
      "doPiece": "BL00123",
      "motif": "COLIS_ENDOMMAGE",
      "description": "Demande chatbot"
    }
  }
}
```

### 5.5.4 Mécanisme de double confirmation

Quand le router détecte une action :

**Étape 1** — Le bot répond avec une **demande de confirmation** :

```
Vous voulez créer une réclamation :
- Commande : BL00123
- Motif : COLIS_ENDOMMAGE
- Description : "Demande chatbot"

Tapez "OUI" pour confirmer ou "ANNULER" pour annuler.
```

L'action est stockée dans une table `F_CHATBOT_PENDING_ACTION` avec un TTL de 2 minutes.

**Étape 2** — L'admin tape « OUI » :

```csharp
if (question.Trim().ToUpperInvariant() == "OUI")
{
    var pending = await _db.PendingActions
        .Where(a => a.UserId == userId && a.ExpiresAt > DateTime.UtcNow)
        .OrderByDescending(a => a.CreatedAt)
        .FirstOrDefaultAsync();
    
    if (pending != null)
    {
        await ExecuteAction(pending.ActionType, pending.ParamsJson);
        return "✅ Action exécutée avec succès.";
    }
}
```

### 5.5.5 Audit trail obligatoire

Chaque action exécutée est loggée :

```sql
CREATE TABLE F_CHATBOT_ACTION_LOG (
    Id BIGINT IDENTITY PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    ParamsJson NVARCHAR(MAX) NOT NULL,
    Result NVARCHAR(20) NOT NULL,  -- 'success' / 'failed'
    ErrorMessage NVARCHAR(500) NULL,
    OriginalQuestion NVARCHAR(500) NOT NULL,
    ExecutedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

L'admin peut voir tout son historique d'actions dans son profil ou dans une vue admin dédiée.

### 5.5.6 Garde-fous

- **Permissions** : seul un compte avec rôle `ADMIN` peut exécuter ces actions (les confirmatrices/livreurs n'ont pas accès au chatbot d'actions)
- **Rate limit** : max 10 actions/minute par utilisateur
- **Actions destructives bloquées** : pas de DELETE, pas de UPDATE en masse, pas de modification utilisateurs
- **Sandbox dev** : en environnement non-prod, les actions sont **simulées** (log mais pas exécutées) pour permettre les tests

---

## 5.6 Amélioration 5 — Voice input / output

### 5.6.1 Voice input (parler au chatbot)

Bouton micro à côté du champ de saisie. Au tap :
1. Demande permission micro (Android/iOS)
2. Enregistre la voix
3. Transcrit en texte avec **Speech-to-Text natif** (`speech_to_text` package Flutter)
4. Pré-remplit le champ
5. L'admin valide ou modifie avant envoi

```dart
class VoiceInputService {
  final SpeechToText _speech = SpeechToText();

  Future<String?> listen({String localeId = 'fr-FR'}) async {
    final available = await _speech.initialize();
    if (!available) return null;
    
    String? result;
    await _speech.listen(
      onResult: (r) => result = r.recognizedWords,
      localeId: localeId,
      listenFor: const Duration(seconds: 30),
    );
    return result;
  }
}
```

**Multilingue** : l'utilisateur peut choisir `fr-FR` / `ar-TN` dans les paramètres.

### 5.6.2 Voice output (le chatbot parle)

Bouton 🔊 dans chaque bulle assistant. Au tap, lit la réponse à voix haute.

Utilise `flutter_tts` (gratuit, supporte FR + AR) :

```dart
class VoiceOutputService {
  final FlutterTts _tts = FlutterTts();

  Future<void> speak(String text, ChatLanguage lang) async {
    await _tts.setLanguage(lang switch {
      ChatLanguage.French => 'fr-FR',
      ChatLanguage.Arabic => 'ar',
      ChatLanguage.Tounsi => 'ar-TN',
      _ => 'fr-FR',
    });
    await _tts.setSpeechRate(0.5);
    await _tts.speak(text);
  }
}
```

### 5.6.3 Mode mains-libres

Toggle dans paramètres : *« Mode mains-libres »*. Quand activé :
- Tap sur le micro = écoute
- Réponse lue automatiquement à voix haute
- À la fin, retour automatique en mode écoute

Utile pour un admin en voiture (cas Tunisie : « va de Tunis à Sousse, je suis au volant »).

---

## 5.7 Amélioration 6 — Streaming des réponses

### 5.7.1 Le problème

Aujourd'hui : l'admin attend 3-5 secondes que le LLM finisse → bulle apparaît d'un coup.

**Avec streaming** : les premiers mots apparaissent en 500ms, le texte s'écrit progressivement. Perception de rapidité ×3.

### 5.7.2 Backend — endpoint SSE

Nouveau endpoint :
```
POST /api/admin/chat/ask-stream
```

Retourne un flux **Server-Sent Events** :

```csharp
[HttpPost("ask-stream")]
public async Task AskStream([FromBody] ChatAskRequestDto req, CancellationToken ct)
{
    Response.Headers.Add("Content-Type", "text/event-stream");
    Response.Headers.Add("Cache-Control", "no-cache");

    // 1. Routing (rapide, non-streamé)
    var routed = await _orchestrator.RouteAsync(req.Question, ct);
    await SendEvent("routing", new { action = routed.Action });

    // 2. Exécution (data brute)
    var data = await _orchestrator.ExecuteAsync(routed, ct);
    await SendEvent("data", data);

    // 3. Formatter en streaming via Groq
    await foreach (var chunk in _groq.StreamCompleteAsync(formatterPrompt, ct))
    {
        await SendEvent("chunk", new { text = chunk });
    }

    await SendEvent("done", new { });
}
```

### 5.7.3 Flutter — affichage progressif

Côté Flutter, utiliser `EventSource` ou un parser SSE manuel sur Dio :

```dart
Stream<ChatChunk> askStream(String question) async* {
  final response = await _dio.post('/api/admin/chat/ask-stream',
    data: {'question': question},
    options: Options(responseType: ResponseType.stream));
  
  await for (final raw in response.data.stream) {
    final lines = utf8.decode(raw).split('\n');
    for (final line in lines) {
      if (line.startsWith('event: chunk')) {
        // Extraire le text du JSON suivant et yield
        yield ChatChunk(text: extractedText);
      }
    }
  }
}
```

L'UI ajoute progressivement chaque chunk à la bulle :

```dart
StreamBuilder<ChatChunk>(
  stream: chatService.askStream(question),
  builder: (context, snapshot) {
    final text = accumulatedChunks.join('');
    return Text(text, ...);
  },
)
```

### 5.7.4 Indicateur visuel

Pendant le streaming, afficher un curseur clignotant à la fin du texte :
```dart
Text(text + (isStreaming ? '▋' : ''))
```

---

## 5.8 Amélioration 7 — Quick-replies contextuelles

### 5.8.1 Le concept

Après chaque réponse du bot, afficher 2-4 boutons de **suivi pertinent** :

```
🤖 Il y a 13 commandes livrées aujourd'hui.

[ Voir le détail ]  [ Comparer avec hier ]  [ Par gouvernorat ]
```

Au tap sur un quick-reply, la question correspondante est envoyée comme si l'admin l'avait tapée.

### 5.8.2 Génération des quick-replies

Le **formatter Groq** retourne aussi des suggestions, dans un champ `suggestions` du JSON :

```json
{
  "message": "Il y a 13 commandes livrées aujourd'hui.",
  "action": "query",
  "data": {...},
  "suggestions": [
    "Voir le détail",
    "Comparer avec hier",
    "Par gouvernorat",
    "Exporter Excel"
  ]
}
```

### 5.8.3 Prompt formatter enrichi

```
Après ta réponse, propose 3-4 questions de suivi pertinentes
que l'admin pourrait poser. Format JSON strict :
{
  "message": "...",
  "suggestions": ["...", "...", "..."]
}
```

### 5.8.4 Mapping action → suggestions par défaut

Si Groq ne retourne pas de suggestions, fallback hardcodé par action :

```csharp
public List<string> DefaultSuggestions(string action) => action switch
{
    "query" => new() { "Comparer avec la période précédente", "Par gouvernorat", "Exporter Excel" },
    "analyze" => new() { "Voir le détail", "Prédire la suite", "Exporter PDF" },
    "predict" => new() { "Voir les facteurs", "Comparer avec données réelles", "Réentraîner" },
    "kb" => new() { "Voir un exemple", "Cas particuliers", "Procédure complète" },
    _ => new() { "Aide", "Liste des commandes", "Statistiques du jour" }
};
```

### 5.8.5 UI Flutter

Composant `QuickRepliesRow` :

```dart
Wrap(
  spacing: 8,
  runSpacing: 8,
  children: suggestions.map((s) => 
    ActionChip(
      label: Text(s),
      avatar: const Icon(Icons.bolt, size: 16),
      onPressed: () => _sendMessage(s),
    )
  ).toList(),
)
```

---

## 5.9 Amélioration 8 — KB hybride auto-générée

### 5.9.1 Problème

Aujourd'hui le `.md` de 14 KB est **maintenu à la main**. Si tu changes un statut dans le code, tu dois penser à mettre à jour le `.md`. Source de désynchronisation.

### 5.9.2 KB hybride

Tu as choisi : **statique pour le métier + générée pour les enums/statuts**.

Architecture :

```
KB finale = KB_statique.md (rédigée à la main)
          + KB_generee.md (auto à chaque démarrage)
```

### 5.9.3 Générateur de KB

Nouveau service `KbGeneratorService` qui s'exécute au démarrage backend :

```csharp
public class KbGeneratorService : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# KB Auto-générée");
        sb.AppendLine($"Générée le : {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine();

        // 1. Statuts livraison
        sb.AppendLine("## Statuts livraison (LI_Statut)");
        foreach (var s in Enum.GetValues<LiStatut>())
            sb.AppendLine($"- {(int)s} : {s} — {GetDescription(s)}");

        // 2. Motifs client
        sb.AppendLine("\n## Motifs réclamation client");
        foreach (var m in ClientMotifs.All)
            sb.AppendLine($"- {m.Code} : {m.Label}");

        // 3. Motifs livreur
        sb.AppendLine("\n## Motifs demande livreur");
        foreach (var m in LivreurMotifs.All)
            sb.AppendLine($"- {m.Code} : {m.Label} (nature : {m.Nature})");

        // 4. Statuts cas
        sb.AppendLine("\n## Statuts des cas (réclamations + demandes)");
        foreach (var s in ReclamationStatuses.All)
            sb.AppendLine($"- {s}");

        // 5. Gouvernorats actifs
        sb.AppendLine("\n## Gouvernorats");
        foreach (var g in TunisianGovernorates.All)
            sb.AppendLine($"- {g}");

        // 6. Constantes métier
        sb.AppendLine("\n## Constantes métier");
        sb.AppendLine($"- Frais livraison HOME : {BusinessConstants.FraisLivraisonHome} DT");
        sb.AppendLine($"- Timbre fiscal : {BusinessConstants.TimbreFiscal} DT");
        sb.AppendLine($"- Seuil tentatives : {BusinessConstants.SeuilTentatives}");
        sb.AppendLine($"- Verrou confirmation : {BusinessConstants.VerrouMinutes} min");

        await File.WriteAllTextAsync(
            "wwwroot/kb/kb_auto_generated.md",
            sb.ToString(), ct);
    }
}
```

### 5.9.4 Concaténation au démarrage

Au boot, le service `KbProvider` charge :

```csharp
public class KbProvider
{
    private string? _cachedKb;

    public async Task<string> GetFullKbAsync()
    {
        if (_cachedKb != null) return _cachedKb;

        var statique = await File.ReadAllTextAsync("wwwroot/kb/kb_statique.md");
        var generee = await File.ReadAllTextAsync("wwwroot/kb/kb_auto_generated.md");

        _cachedKb = $"{statique}\n\n---\n\n{generee}";
        return _cachedKb;
    }

    public void InvalidateCache() => _cachedKb = null;
}
```

### 5.9.5 Endpoint admin pour rafraîchir

```
POST /api/admin/chat/kb/refresh
```

Régénère la KB auto et invalide le cache. Utile en démo si tu modifies un enum à chaud.

---

## 5.10 Refonte UI Flutter — assemblage

### 5.10.1 Structure de l'écran chatbot

```
┌──────────────────────────────────────────────────────────────┐
│ 🤖 Assistant Admin                              [⚙️] [📊]    │
├──────────────────────────────────────────────────────────────┤
│ 🔔 3 alertes pour vous                                        │
│ ⚠️  Retours +35% à Sousse                       [Analyser]    │
│ ℹ️   Confirmatrice surchargée                   [Voir]        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Bulles de chat (streaming, charts inline, voice 🔊)          │
│                                                                │
│ [ Voir le détail ] [ Comparer hier ] [ Par gouvernorat ]     │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│ [🎤] [Tapez votre question...                  ] [Envoyer ▶] │
└──────────────────────────────────────────────────────────────┘
```

### 5.10.2 Composants à créer/modifier

| Composant | Statut | Rôle |
|---|---|---|
| `admin_chat_screen.dart` | À enrichir | Container principal |
| `proactive_insights_banner.dart` | **À créer** | Bandeau alertes |
| `chat_bubble.dart` | À enrichir | Streaming + voice + suggestions |
| `quick_replies_row.dart` | **À créer** | Boutons suggestions |
| `voice_input_button.dart` | **À créer** | Bouton micro |
| `voice_output_button.dart` | **À créer** | Bouton 🔊 |
| `pending_action_card.dart` | **À créer** | Confirmation OUI/ANNULER |
| `chat_feedback_buttons.dart` | **À créer** | 👍/👎 sous chaque réponse |

### 5.10.3 Modèle `ChatMessage` enrichi

```dart
class ChatMessage {
  // existant
  final String id;
  final ChatMessageRole role;
  final String text;
  final DateTime timestamp;
  final String? action;
  final ChatChartType chartType;
  final List<ChatChartPoint> chartPoints;
  final List<ChatRowItem> rows;
  final bool isError;

  // nouveau
  final List<String> suggestions;        // quick-replies
  final ChatLanguage language;            // pour TTS
  final bool isStreaming;                 // streaming en cours
  final PendingAction? pendingAction;    // action en attente confirmation
  final String? feedback;                 // 'up' / 'down' / null
}
```

---

## 5.11 Audit logique chatbot

### 5.11.1 Périmètre

Claude Code produit `CHATBOT_BUTTONS_AUDIT.md` couvrant :

- **Flutter UI** : tous les boutons de `flutter/lib/ui/admin/screens/admin_chat_screen.dart` + composants liés
- **Backend services** : 
  - `AdminChatOrchestratorService` — pipeline complet
  - `AdminChatQueryService` — toutes les métriques retournent des chiffres
  - `AdminChatAnalyzeService` — toutes les analyses fonctionnent
  - `PredictionService` — toutes les prédictions retournent une valeur
- **n8n workflow V2** : tous les nœuds testés avec données réalistes
- **KB markdown** : pas de doublons, pas de sections obsolètes

### 5.11.2 Tests fonctionnels obligatoires

Liste de **20 questions test** que le chatbot doit traiter correctement :

```
1.  "Combien de commandes aujourd'hui ?" → query
2.  "Top 5 produits ce mois" → query
3.  "Tendance des retours sur 3 mois" → analyze
4.  "Risque de retour de BL00123" → predict
5.  "Bonjour" → chitchat
6.  "C'est quoi une réclamation ?" → kb
7.  "Et à Sfax ?" (après q1) → query (mémoire)
8.  "كم عدد الطلبات اليوم؟" → query (arabe)
9.  "9adech 3andna mn commande lyoum" → query (tounsi)
10. "Crée une réclamation pour BL00123" → action (puis OUI)
11. "Pourquoi tant de retours à Sousse ?" → analyze
12. "Volume prévu sur 7 jours" → predict
13. "Quelle est la météo ?" → refus poli (hors périmètre)
14. "Donne-moi le mot de passe admin" → refus
15. "Compare livreurs Ahmed et Mohamed" → analyze
16. "Anomalie cette semaine ?" → analyze
17. "Liste des cas urgents" → query
18. "Quel produit le plus retourné ?" → query
19. "Distribution des montants commandes" → analyze
20. "Top gouvernorat performant" → query
```

Pour chaque, vérifier : **action correcte** + **données plausibles** + **réponse claire**.

---

## 5.12 Cohérence avec l'existant

### 5.12.1 Ne PAS toucher

- Pipeline orchestrateur Groq router → action → formatter (architecture saine)
- Endpoints `/api/admin/chat/query`, `/analyze`, `/predict`
- KB statique métier (`admin-chatbot-knowledge.md`)
- UI premium des bulles + catégories de welcome
- n8n workflow V2 (juste l'enrichir, pas le réécrire)

### 5.12.2 Migrations DB

```sql
-- Mémoire conversationnelle
CREATE TABLE F_CHATBOT_SESSION (...);
CREATE TABLE F_CHATBOT_MESSAGE (...);

-- Insights proactifs
CREATE TABLE F_CHATBOT_INSIGHT (...);

-- Actions sécurisées
CREATE TABLE F_CHATBOT_PENDING_ACTION (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    ParamsJson NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAt DATETIME2 NOT NULL  -- 2 minutes
);

CREATE TABLE F_CHATBOT_ACTION_LOG (...);
```

### 5.12.3 Packages Flutter à ajouter

```yaml
dependencies:
  speech_to_text: ^7.0.0
  flutter_tts: ^4.2.0
  # dio: déjà présent
  # provider: déjà présent
```

### 5.12.4 NuGet à ajouter (backend)

- Pas de nouveau package, tout est faisable avec ce qui existe déjà

---

## 5.13 Plan d'exécution recommandé

Ordre d'implémentation pour minimiser le risque :

1. **Audit chatbot** → fichier `CHATBOT_BUTTONS_AUDIT.md`
2. **Migrations DB** : 5 tables nouvelles
3. **KB hybride** :
   - Service `KbGeneratorService` (HostedService au boot)
   - `KbProvider` avec cache et invalidation
   - Endpoint `POST /api/admin/chat/kb/refresh`
4. **Mémoire conversationnelle** :
   - Stockage sessions + messages
   - Injection des 6 derniers messages dans le router
   - Détection de référents (« Et à Sfax ? »)
5. **Bilingue FR/AR/Tounsi** :
   - `LanguageDetectorService`
   - 3 prompts système (FR/AR/Tounsi)
   - Stockage langue dans la session
6. **Streaming SSE** :
   - Endpoint `/ask-stream` côté backend
   - Parser Dio côté Flutter
   - Bulle qui s'auto-remplit avec curseur
7. **Quick-replies** :
   - Champ `suggestions` dans la réponse
   - Composant `QuickRepliesRow` Flutter
   - Fallbacks par action
8. **Voice I/O** :
   - `speech_to_text` + `flutter_tts`
   - Boutons micro / haut-parleur
   - Mode mains-libres
9. **Suggestions proactives** :
   - Job Hangfire 30 min
   - Détecteurs d'anomalies
   - Bandeau alertes Flutter
10. **Actions sécurisées** :
    - Whitelist 6 actions
    - Mécanisme double confirmation
    - Audit trail
    - Garde-fous (permissions, rate limit)
11. **n8n workflow V3** : enrichir le V2 avec les nouvelles branches
12. **Tests fonctionnels** : 20 questions test
13. **Re-audit final**

---

## 5.14 Tests manuels obligatoires (5 scénarios clés)

**Scénario 1 — Mémoire conversationnelle**
1. Question : « Combien de commandes aujourd'hui ? » → 13
2. Question : « Et à Sfax ? » → bot comprend → 4
3. Question : « Et hier ? » → bot comprend → 11

**Scénario 2 — Bilingue tunisien**
1. Question : « 9adech 3andna mn commande retourné lyoum ? »
2. Bot répond en tunisien : « Lyoum 3andek 3 commande mra33da. »
3. Continuer en tunisien → conversation cohérente

**Scénario 3 — Action sécurisée avec confirmation**
1. Question : « Crée une réclamation pour BL00123 motif COLIS_ENDOMMAGE »
2. Bot demande : « Tapez OUI pour confirmer »
3. Taper « OUI »
4. Vérifier en DB que `F_RECLAMATION` contient bien l'enregistrement
5. Vérifier `F_CHATBOT_ACTION_LOG` contient l'audit

**Scénario 4 — Suggestion proactive**
1. Forcer manuellement une anomalie (insérer 10 retours à Sousse en 1h)
2. Lancer le job `ProactiveInsightsJob`
3. Recharger l'écran chatbot
4. Vérifier que le bandeau « Retours +X% à Sousse » apparaît
5. Cliquer « Analyser » → message auto envoyé → bot répond

**Scénario 5 — Voice + Streaming**
1. Tap sur micro → dire « combien de commandes livrées cette semaine »
2. Texte transcrit dans le champ
3. Envoyer
4. Vérifier que la réponse arrive en streaming (mots par mots)
5. Tap sur 🔊 → la réponse est lue à voix haute

---

## 5.15 Démo jury — script suggéré (5 minutes)

Pour ta soutenance, voici un script qui montre le maximum de valeur :

```
1. (30s) Ouverture : « Voici l'assistant intelligent de la plateforme. »
   → Montrer le bandeau d'alerte proactif (préparé en amont)

2. (1 min) Question simple en français
   → « Combien de commandes livrées cette semaine ? »
   → Montrer le streaming + le chart inline

3. (1 min) Question de suivi (mémoire)
   → « Et à Sfax ? »
   → Montrer que le bot comprend le contexte

4. (1 min) Question en tunisien (effet wow local)
   → « 9adech 3andna mn reclamation lyoum ? »
   → Réponse en tunisien

5. (1 min) Action sécurisée
   → « Crée une réclamation pour BL00123 motif COLIS_ENDOMMAGE »
   → Confirmation OUI/ANNULER
   → Taper OUI → action exécutée

6. (30s) Voice
   → Tap micro → « risque de retour de BL00045 »
   → Réponse vocale lue

7. (30s) Conclusion : montrer l'architecture (n8n + backend)
   → 2 implémentations parallèles, montrer la traçabilité et la sécurité
```

---

**Fin de la section Chatbot. C'est la dernière des 5 sections. Le brief technique global est complet.**
