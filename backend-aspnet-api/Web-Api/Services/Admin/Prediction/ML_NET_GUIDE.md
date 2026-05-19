# Guide ML.NET du projet — comprendre & injecter plus de données

Ce document explique **comment fonctionne le moteur ML du chatbot** (couche C, dossier `Services/Admin/Prediction/`) et **comment lui donner plus de données** pour qu'il devienne plus précis. Lecture conseillée avant de modifier `PredictionService.cs`, `PredictionModels.cs` ou `SyntheticDataGenerator.cs`.

---

## 1. C'est quoi ML.NET ?

**ML.NET** est la bibliothèque officielle Microsoft de machine learning pour .NET (C#). Pas besoin de Python ni de TensorFlow : tout est en C# pur, le modèle vit dans le même process que l'API.

Trois choses à retenir :

| Concept | Équivalent | Rôle |
|---|---|---|
| `MLContext` | "moteur" Spark / sklearn | Point d'entrée unique, gère randomness, logging, factories |
| `IDataView` | DataFrame | Représentation tabulaire des données (lazy, comme un curseur SQL) |
| `ITransformer` | Modèle entraîné | Une fois entraîné, on l'applique avec `.Transform(data)` ou via une `PredictionEngine` |

Un projet ML.NET classique fait toujours la même chose :

```
Données brutes (List<T> ou CSV)
   ↓ LoadFromEnumerable / LoadFromTextFile
IDataView
   ↓ pipeline de transformations (encodage, normalisation…)
   ↓ + un trainer (algo)
Pipeline non entraîné (IEstimator)
   ↓ .Fit(data)
Modèle entraîné (ITransformer)
   ↓ .Transform(newData) ou PredictionEngine.Predict(input)
Prédictions
```

---

## 2. Les 3 modèles ML du projet

Tout est dans `Services/Admin/Prediction/` :

| Fichier | Rôle |
|---|---|
| `PredictionModels.cs` | Classes Input/Output (POCOs avec `[LoadColumn]`) |
| `SyntheticDataGenerator.cs` | Génère un dataset réaliste si la vraie DB est trop petite |
| `PredictionService.cs` | Orchestration : chargement données → pipeline → fit → predict |

### 2.1 `return_risk` — Classification binaire

> *"Cette commande risque-t-elle d'être retournée ?"*

- **Type** : Binary Classification
- **Algo** : SDCA Logistic Regression (`SdcaLogisticRegression`)
- **Features** (entrées) : Gouvernorat, Montant, Mode paiement, Type client, Jour de semaine, Nb retours antérieurs
- **Label** (sortie) : `WasReturned` (bool)
- **Sortie** : probabilité 0–1 + facteurs explicatifs

### 2.2 `delivery_first_attempt` — Classification binaire

> *"La livraison va-t-elle réussir au 1er essai ?"*

- **Type** : Binary Classification
- **Algo** : SDCA Logistic Regression (idem)
- **Features** : Gouvernorat, Montant, Mode paiement, Mode livraison, Jour de semaine
- **Label** : `DeliveredFirstAttempt` (bool)

### 2.3 `volume_forecast` — Time series forecasting

> *"Combien de commandes les 7 prochains jours ?"*

- **Type** : Time Series Forecasting
- **Algo** : SSA — Singular Spectrum Analysis (`ForecastBySsa`)
- **Input** : 1 colonne `Orders` (commandes par jour) sur 30+ jours
- **Output** : N points (valeur + borne basse + borne haute, IC 95%)

---

## 3. Anatomie détaillée d'un modèle (`return_risk`)

Voici le code annoté ligne par ligne — c'est le pattern à reproduire pour tout nouveau modèle.

### 3.1 Définir l'Input et l'Output (`PredictionModels.cs`)

```csharp
public class ReturnRiskInput
{
    [LoadColumn(0)] public string Governorate { get; set; } = string.Empty;
    [LoadColumn(1)] public float Amount { get; set; }
    [LoadColumn(2)] public string PaymentMode { get; set; } = string.Empty;
    [LoadColumn(3)] public string ClientType { get; set; } = string.Empty;
    [LoadColumn(4)] public float DayOfWeek { get; set; }
    [LoadColumn(5)] public float PriorReturns { get; set; }
    [LoadColumn(6)] public bool WasReturned { get; set; }   // ← LE LABEL
}

public class ReturnRiskPrediction
{
    [ColumnName("PredictedLabel")] public bool WillReturn { get; set; }
    public float Probability { get; set; }
    public float Score { get; set; }   // ← logit, à passer dans Sigmoid pour avoir [0,1]
}
```

**Règles importantes** :

- `[LoadColumn(N)]` = position dans le CSV si tu charges un fichier. Sinon ignoré quand tu fais `LoadFromEnumerable`.
- Le **label** (la chose à prédire) doit être `bool` pour binary classification, `float` pour régression.
- Tous les champs numériques doivent être `float`, pas `int` ni `double` (ML.NET est strict).

### 3.2 Construire le pipeline (`PredictionService.cs:149-163`)

```csharp
var pipeline = _ml.Transforms.Categorical.OneHotEncoding(new[]
    {
        new InputOutputColumnPair("GovEnc", nameof(ReturnRiskInput.Governorate)),
        new InputOutputColumnPair("PayEnc", nameof(ReturnRiskInput.PaymentMode)),
        new InputOutputColumnPair("CliEnc", nameof(ReturnRiskInput.ClientType))
    })
    .Append(_ml.Transforms.Concatenate("Features",
        "GovEnc", "PayEnc", "CliEnc",
        nameof(ReturnRiskInput.Amount),
        nameof(ReturnRiskInput.DayOfWeek),
        nameof(ReturnRiskInput.PriorReturns)))
    .Append(_ml.Transforms.NormalizeMinMax("Features"))
    .Append(_ml.BinaryClassification.Trainers.SdcaLogisticRegression(
        labelColumnName: nameof(ReturnRiskInput.WasReturned),
        featureColumnName: "Features"));
```

Décodage **étape par étape** :

| Étape | Ce que ça fait | Pourquoi |
|---|---|---|
| `OneHotEncoding` | Transforme `"Sfax"` en `[0,0,1,0,...,0]` | Les algos ne comprennent pas les strings, juste des nombres |
| `Concatenate("Features", ...)` | Met toutes les colonnes dans un seul vecteur `Features` | Les trainers attendent UNE colonne `Features` |
| `NormalizeMinMax` | Ramène toutes les valeurs sur [0,1] | Évite que le montant (0–400) écrase le DayOfWeek (0–6) |
| `SdcaLogisticRegression` | L'algo qui apprend | Régression logistique optimisée par descente de coordonnée stochastique |

### 3.3 Train / Test split + entraînement (`PredictionService.cs:147,165-168`)

```csharp
var dataView = _ml.Data.LoadFromEnumerable(data);
var split = _ml.Data.TrainTestSplit(dataView, testFraction: 0.2);

var model = pipeline.Fit(split.TrainSet);   // ← entraînement
var preds = model.Transform(split.TestSet);
var metrics = _ml.BinaryClassification.Evaluate(preds, labelColumnName: ...);
```

- 80% des données → entraînement
- 20% → test (jamais vu pendant l'entraînement)
- `metrics.Accuracy` = % de bonnes prédictions sur le test set

### 3.4 Prédire en live (`PredictionService.cs:94-96`)

```csharp
var engine = _ml.Model.CreatePredictionEngine<ReturnRiskInput, ReturnRiskPrediction>(
    _returnRiskModel, _returnRiskSchema);
var p = engine.Predict(input);
var prob = Sigmoid(p.Score);   // 0..1
```

**Important** : `PredictionEngine` n'est **pas thread-safe**. Dans le projet on en crée un nouveau à chaque appel — OK pour la démo, mais en prod il faudrait un pool ou utiliser `Transform()` sur un `IDataView`.

---

## 4. Comment les données circulent aujourd'hui

```
                ┌─────────────────────────────────────────┐
                │         POST /api/admin/chat/predict    │
                └────────────────┬────────────────────────┘
                                 ▼
                      PredictionService.PredictReturnRiskAsync
                                 │
                  ┌──────────────┴──────────────┐
                  ▼                             ▼
           EnsureReturnRiskModelAsync   ResolveReturnRiskInputAsync
           (1ère fois seulement)        (à chaque appel)
                  │
                  ▼
           LoadRealReturnRiskAsync
           (lit F_DOCENTETES + F_LIVRAISONS + ProfilsUtilisateurs)
                  │
                  ▼
        Si count >= 50 → real_data
        Sinon          → SyntheticDataGenerator.GenerateReturnRiskDataset(500)
                  │
                  ▼
           Pipeline.Fit() → modèle caché en mémoire (singleton)
                  │
                  ▼
           engine.Predict(input) → ChatPredictResponseDto
```

### Ce qu'il faut savoir

- **Modèle entraîné UNE seule fois par démarrage du backend** (cache en mémoire). Si tu ajoutes de la donnée, **redémarre `dotnet run`** sinon tu utilises l'ancien modèle.
- Le seuil `MinRealReturnSamples = 50` (`PredictionService.cs:35`) : tant que tu n'as pas 50 commandes avec un statut de livraison, ML.NET retombe sur synthetic.
- Pour `volume_forecast` : seuil `MinRealVolumeDays = 30` jours d'historique.
- Pour `delivery_first_attempt` : **toujours synthétique** aujourd'hui (`PredictionService.cs:343-344`) parce que la distinction "1er essai vs réessai" n'est pas explicitement stockée.

---

## 5. Comment injecter plus de données (4 méthodes par effort croissant)

### Méthode A — Laisser la DB grossir naturellement *(0 effort)*

Continuer à utiliser l'app : créer des commandes → les confirmer → les livrer (ou les retourner). Une fois > 50 commandes avec statut de livraison, le service passera **automatiquement** sur `real_data` au prochain redémarrage.

Vérifier dans les logs au démarrage :
```
PredictionService: return_risk trained (XYZ samples, accuracy=0.XXX, source=real_data).
```

### Méthode B — Seed SQL massif *(1h, recommandé pour la démo jury)*

Insérer en bulk des commandes simulées directement dans `F_DOCENTETES` + `F_LIVRAISONS` + `ProfilsUtilisateurs`. C'est ce que `LoadRealReturnRiskAsync` (`PredictionService.cs:182-250`) lit.

Exemple de script T-SQL minimal :

```sql
-- 100 commandes fictives sur 90 jours
DECLARE @i INT = 0;
WHILE @i < 100
BEGIN
    INSERT INTO F_DOCENTETE (DO_Piece, DO_Domaine, DO_Type, DO_Tiers, DO_Date, DO_TotalTTC, DO_ModePaiement)
    VALUES (
        CONCAT('BC', FORMAT(GETDATE(), 'yyMMdd'), RIGHT('0000' + CAST(@i AS VARCHAR), 4)),
        0, 0,
        'CL00001',
        DATEADD(DAY, -ABS(CHECKSUM(NEWID()) % 90), GETDATE()),
        20 + ABS(CHECKSUM(NEWID()) % 380),
        'CASH'
    );
    SET @i += 1;
END;
```

Puis pour générer des **retours** (sinon l'algo voit 100 % succès = inutilisable) :

```sql
-- 12% de retours sur les commandes ci-dessus
INSERT INTO F_LIVRAISONS (DO_Piece, LI_Statut)
SELECT TOP 12 DO_Piece, 3   -- 3 = Retour (cf DeliveryStatusCodes)
FROM F_DOCENTETE WHERE DO_Piece LIKE 'BC%' ORDER BY NEWID();

-- 88% de livraisons OK
INSERT INTO F_LIVRAISONS (DO_Piece, LI_Statut)
SELECT DO_Piece, 1   -- 1 = Livré
FROM F_DOCENTETE WHERE DO_Piece LIKE 'BC%'
  AND DO_Piece NOT IN (SELECT DO_Piece FROM F_LIVRAISONS);
```

> Vérifie les codes exacts dans `Web_Api.Constants.DeliveryStatusCodes`.

**Avantage** : tu vois `trainedFrom: real_data` dans la réponse `/predict`, et l'accuracy reflète tes vraies données.

### Méthode C — Augmenter le synthetic generator *(15 min)*

Si tu veux juste un modèle plus stable pour la démo sans toucher à la DB, augmente la taille du dataset synthétique dans `PredictionService.cs:135` :

```csharp
data = SyntheticDataGenerator.GenerateReturnRiskDataset(500);
//                                                       ↑
//                                  passer à 2000 ou 5000
```

Plus de samples = meilleur entraînement (gain limité au-delà de ~3000 pour ce modèle simple).

### Méthode D — Importer un CSV externe *(2h)*

Si tu trouves un dataset Kaggle proche (e-commerce returns, COD shipments…), tu peux le charger directement :

```csharp
// Ajoute une nouvelle méthode dans PredictionService
private List<ReturnRiskInput> LoadFromCsv(string path)
{
    return _ml.Data.LoadFromTextFile<ReturnRiskInput>(
        path, hasHeader: true, separatorChar: ',')
        .Preview(maxRows: 100000)
        .RowView
        .Select(r => /* mapping */)
        .ToList();
}
```

Ou plus simple : le pipeline peut prendre directement l'`IDataView` retourné par `LoadFromTextFile`, sans repasser par une `List<T>`.

---

## 6. Ajouter une nouvelle feature à un modèle existant

Exemple : on veut ajouter `OrderHourOfDay` (l'heure de la commande, 0–23) au modèle `return_risk`.

**Étape 1** — Ajouter le champ dans `PredictionModels.cs` :
```csharp
public class ReturnRiskInput
{
    // ... existant ...
    [LoadColumn(7)] public float HourOfDay { get; set; }
    [LoadColumn(8)] public bool WasReturned { get; set; }   // décale l'index !
}
```

**Étape 2** — Mettre à jour le pipeline dans `PredictionService.cs:155-159` :
```csharp
.Append(_ml.Transforms.Concatenate("Features",
    "GovEnc", "PayEnc", "CliEnc",
    nameof(ReturnRiskInput.Amount),
    nameof(ReturnRiskInput.DayOfWeek),
    nameof(ReturnRiskInput.PriorReturns),
    nameof(ReturnRiskInput.HourOfDay)))   // ← nouvelle feature
```

**Étape 3** — Renseigner le champ dans `LoadRealReturnRiskAsync` (`PredictionService.cs:235-244`) :
```csharp
result.Add(new ReturnRiskInput
{
    // ... existant ...
    HourOfDay = (float)(o.DO_Date?.Hour ?? 12)
});
```

**Étape 4** — Renseigner le champ dans le synthetic generator (`SyntheticDataGenerator.cs:GenerateReturnRiskDataset`).

**Étape 5** — Mettre à jour `ResolveReturnRiskInputAsync` (`PredictionService.cs:252-295`) pour lire la valeur depuis l'input du chatbot.

**Étape 6** — Redémarrer le backend (le modèle se recompile au 1er appel).

---

## 7. Ajouter un 4ᵉ modèle (exemple : ETA livraison)

Squelette à coller dans le dossier :

```csharp
// PredictionModels.cs
public class EtaInput
{
    public string Governorate { get; set; } = "";
    public float DistanceKm { get; set; }
    public float DayOfWeek { get; set; }
    public float HourOfDay { get; set; }
    public float DurationHours { get; set; }   // LABEL — float donc régression
}
public class EtaPrediction
{
    [ColumnName("Score")] public float DurationHours { get; set; }
}

// PredictionService.cs — pipeline (régression au lieu de classification)
.Append(_ml.Regression.Trainers.Sdca(
    labelColumnName: nameof(EtaInput.DurationHours),
    featureColumnName: "Features"));

// Évaluation : utilise RegressionMetrics au lieu de BinaryClassificationMetrics
var metrics = _ml.Regression.Evaluate(preds, labelColumnName: ...);
// metrics.RSquared, metrics.RootMeanSquaredError
```

Branche-le ensuite dans `PredictAsync` (`PredictionService.cs:74-80`) avec un nouveau case `"eta"` et expose-le via `AdminChatOrchestratorService` (router prompt).

---

## 8. Comment tester / vérifier

### 8.1 Au démarrage backend

Lance `dotnet run` et regarde les logs (1er appel à `/predict` déclenche le train) :
```
PredictionService: return_risk trained (500 samples, accuracy=0.734, source=synthetic).
```
- `samples` : taille du dataset
- `accuracy` : % de bonnes prédictions sur le test set (20%)
- `source` : `synthetic` ou `real_data`

### 8.2 Via curl (avec JWT admin)

```bash
curl -X POST http://localhost:5123/api/admin/chat/predict \
  -H "X-Chat-Api-Key: TA_CLE" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "return_risk",
    "input": { "governorate": "Sfax", "amount": 350, "paymentMode": "CASH" }
  }'
```

Dans la réponse, regarde `meta` :
```json
"meta": {
  "modelType": "BinaryClassification (SDCA Logistic Regression)",
  "trainedFrom": "real_data",   // ← objectif
  "trainSamples": 1247,
  "trainAccuracy": 0.812
}
```

### 8.3 Via le chatbot Flutter

Question type : *"Quel est le risque qu'une commande de 350 DT à Sfax soit retournée ?"*
→ Le router Groq détecte `action=predict` et appelle `/predict` en interne. Le format de réponse contient `factors`, `confidence`, `prediction`.

---

## 9. Glossaire ML.NET

| Terme | Définition |
|---|---|
| **Feature** | Variable d'entrée (gouvernorat, montant…) |
| **Label** | Variable à prédire (retourné ? livré ?) |
| **Pipeline** | Suite de transformations + un trainer |
| **Estimator** | Pipeline pas encore entraîné |
| **Transformer** | Pipeline entraîné (modèle) |
| **OneHot** | Encodage catégoriel : `"Sfax"` → vecteur creux |
| **SDCA** | Stochastic Dual Coordinate Ascent — algo d'optimisation |
| **SSA** | Singular Spectrum Analysis — décomposition d'une série temporelle en tendance + saisonnalité + bruit |
| **Sigmoid** | Fonction qui transforme un score `[-∞, +∞]` en probabilité `[0, 1]` |
| **Train/Test split** | Couper les données pour mesurer la performance sur des données jamais vues |
| **Accuracy** | % de bonnes prédictions (binary classif). Bonne base, mais regarder aussi precision/recall si dataset déséquilibré |
| **R² (R-squared)** | Régression : 1 = parfait, 0 = aléatoire |
| **RMSE** | Régression : erreur moyenne en unités du label (ex : heures) |

---

## 10. Aller plus loin (idées pour soutenance jury)

| Améliorer | Comment | Effort |
|---|---|---|
| Persister le modèle entre redémarrages | `_ml.Model.Save(model, schema, "model.zip")` puis `Load` au boot | 30 min |
| Trainer plus puissant | Remplacer `SdcaLogisticRegression` par `LightGbm` ou `FastTree` | 5 min |
| AutoML | `_ml.Auto().BinaryClassification(...).Run()` choisit le meilleur trainer automatiquement | 1h (ajouter package `Microsoft.ML.AutoML`) |
| Importance des features | `_ml.BinaryClassification.PermutationFeatureImportance(model, ...)` → vrais poids au lieu d'heuristique | 1h |
| Multi-classe (motif retour) | Remplacer `BinaryClassification` par `MulticlassClassification` (ex prédire le motif : injoignable / refus / adresse fausse) | 2h |
| Re-train périodique | Cron qui invalide le cache modèle toutes les 24h | 1h |

---

## TL;DR

- **3 modèles** : `return_risk` (binary), `delivery_first_attempt` (binary), `volume_forecast` (SSA).
- **Cycle** : DTOs Input/Output → pipeline (encode → concat → normalize → trainer) → `Fit` → `Predict`.
- **Source données** : DB réelle si seuil atteint, sinon dataset synthétique réaliste Tunisie.
- **Pour plus de données** : seed SQL (B), grossir le synthetic (C), CSV externe (D).
- **Toujours redémarrer** le backend après avoir injecté de la donnée (modèle caché en mémoire).
- **Vérifier** `meta.trainedFrom == "real_data"` dans la réponse `/predict` pour confirmer.
