# Intégration Sage X3 — Guide de test et diagnostic

## Architecture du flux

```
Livreur marque "Livré"
  → LivreurController.UpdateStatus / BatchUpdateStatus
    → PostSageBlAsync
      → SageX3ConfigService.GetAsync (lit AppSettings DB + fallback appsettings.json)
      → BuildSageDocumentAsync (résout CT_Num + DE_No)
      → INTEGRATION_DOCUMENT_X3.Integration_Document
        → DataService.SetObjects
          → POST http://localhost/WEB_API_STAGE_X3/api/v1/document
```

## Configuration (appsettings.json)

```json
"SageX3": {
  "DefaultClientCode": "FR004",
  "DefaultDepotNo": 26
}
```

**DefaultClientCode** : code client générique envoyé à Sage X3. Les clients créés par l'app (CL+userId) n'existent pas dans F_COMPTET Sage — on utilise FR004 comme client web générique.

**DefaultDepotNo** : numéro de dépôt de dernier recours si `F_DEPOTS` est vide et si le BL n'a pas de dépôt associé.

## Résolution CT_Num et DE_No

### CT_Num
Toujours forcé à `param.DemoCtNum` (= `DefaultClientCode` = "FR004") dans le mode normal.
En mode Demo (`DemoMode=true`), les articles et montants sont aussi remplacés par les valeurs statiques.

### DE_No
Priorité :
1. `entete.DE_No` du BL (s'il est > 0)
2. Premier dépôt de `F_DEPOTS` trié par `DE_No` (comme `BcToBlService`)
3. `param.DefaultDepotNo` de `appsettings.json` (= 26 par défaut)

## Endpoints de diagnostic (DEV uniquement)

### GET /api/dev/sage/config
Retourne la configuration Sage X3 active (connexion + valeurs démo). Utile pour vérifier que les bons paramètres sont chargés.

```bash
curl -X GET http://localhost:5123/api/dev/sage/config
```

### POST /api/dev/sage/test-send
Envoie un document factice (CT_Num=FR004, DE_No=26, articles DIS007/DIS009) vers Sage X3.
Utilise **exactement le même code** que la transition Livré en production.

```bash
curl -X POST http://localhost:5123/api/dev/sage/test-send
```

Réponse attendue (succès) :
```json
{
  "isSuccess": true,
  "error": null,
  "numeroSage": "BL2400XXX",
  "statut": true,
  "sentDoc": { "DO_NumDocument": "DEV-TEST-...", "CT_Num": "FR004", "DE_No": 26 },
  "config": { "AdresseIP_API": "localhost", "Dossier": "SEED", ... }
}
```

Réponse en cas d'erreur :
```json
{
  "isSuccess": false,
  "error": "Client FR004 introuvable dans SEED",
  ...
}
```

### Endpoint legacy (TestSageX3Controller)
```bash
curl -X POST http://localhost:5123/api/test-sage-x3/document
```
Utilise `DocumentX3IntegrationService` (lit `PARAM_CONNEXION_X3` DB table).
Préférer `/api/dev/sage/test-send` qui utilise le même chemin que la production.

## Diagnostic des logs

En activant le niveau `Debug` pour `Web_Api.Controllers`, vous verrez dans les logs :

```
Sage X3 : CT_Num local='CL-xxxx' → forcé à 'FR004' (client web par défaut). DE_No=26.
Sage X3 PREPARE POST BL240001 | DO_NumDocument=BL240001 CT_Num=FR004 DE_No=26 totalTTC=520 lignes=2 | ...
Sage X3 → POST http://localhost/WEB_API_STAGE_X3/api/v1/document | body={...payload JSON...}
Sage X3 ← HTTP 200 OK | body={"IsSuccess":true,"Value":{"M_NumeroSage":"BL2400001",...}}
```

## Causes courantes d'échec

| Symptôme | Cause | Solution |
|---|---|---|
| `"réponse vide"` | WEB_API_STAGE_X3 hors ligne | Vérifier que le service tourne sur `localhost` |
| `"Client FR004 introuvable"` | Dossier Sage incorrect | Vérifier `Dossier` dans la table `AppSettings` (clé `sage.x3.connexion`) |
| `"Dépôt 1 inexistant"` | `DefaultDepotNo` trop bas | Changer `SageX3:DefaultDepotNo=26` dans appsettings.json OU synchroniser F_DEPOTS |
| Timeout | IP Sage incorrecte | Vérifier `AdresseIP_X3` dans la config |

## Synchronisation des dépôts

Si F_DEPOTS est vide, exécuter la sync :

```bash
curl -X POST http://localhost:5123/api/sync/depots \
  -H "Authorization: Bearer <token_admin>"
```

Vérifier ensuite :
```sql
SELECT DE_No, DE_Intitule FROM F_DEPOT ORDER BY DE_No;
```
