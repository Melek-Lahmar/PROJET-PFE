# Audit technique global

## 1. Résumé exécutif

Le projet est fonctionnellement riche et cohérent avec un PFE complet: backend .NET 8, React, Flutter, n8n, documentation et rapport. Les risques majeurs sont surtout la sécurité des configurations, l'alignement API entre clients et backend, la dette documentaire/générée, la couverture de tests limitée et quelques choix dev à verrouiller avant démonstration ou production.

## 2. Points forts

- Architecture multi-modules claire.
- Backend moderne avec Identity, EF Core, SignalR, Hangfire et Swagger.
- Frontend React structuré par rôles et routes protégées.
- Mobile Flutter multi-rôles avec client réseau centralisé.
- Documentation métier abondante.
- Paiement virtuel et géolocalisation disposent de tests backend dédiés.
- Refonte transit/supervision visible dans backend, React et Flutter.

## 3. Problèmes critiques

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | Backend | Secrets/configurations sensibles dans `appsettings.json` | Fuite de clés, DB ou providers | Déplacer vers user-secrets/env/coffre et garder seulement exemples |
| P1 | Backend | Validation TLS Sage désactivée dans `Program.cs` | Risque MITM et non-conformité | Installer certificat fiable ou config sécurisée par environnement |
| P1 | Mobile | URL backend locale et config/token sensible dans `constants.dart` | Build non portable et fuite de configuration | Utiliser flavors et `--dart-define` |
| P1 | Global | Alignement API clients/backend non garanti | Boutons/écrans cassés à la soutenance | Tests de routes + client généré ou registre unique |

## 4. Problèmes backend

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | Backend | Comptes/mots de passe demo dans seeder | Risque si activé hors dev | Garder en dev uniquement, valeurs via env |
| P1 | Backend | Endpoints dev/seed et Hangfire ouverts en Development | Dangereux si mauvais environnement | Vérifier `ASPNETCORE_ENVIRONMENT` et filtrer accès |
| P2 | Backend | Politique mot de passe faible | Sécurité faible | Durcir selon contexte de démo/prod |
| P2 | Backend | Migrations nombreuses avec noms temporaires | Maintenance difficile | Stabiliser après sauvegarde DB |
| P2 | Backend | Couplage direct EF dans domaines complexes | Tests/refactoring plus difficiles | Introduire ports/services ciblés sans refonte massive |
| P2 | Backend | Routes CRUD brutes documents | Exposition modèle interne | Restreindre ou documenter l'usage admin/legacy |

## 5. Problèmes frontend

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | Frontend | Mismatch possible endpoints admin homepage | Actions UI potentiellement cassées | Vérifier routes backend et adapter |
| P2 | Frontend | Appels API partiellement non centralisés | Dérive et duplication | Centraliser ou générer depuis Swagger |
| P2 | Frontend | Pages placeholder probables | Démo moins crédible | Remplacer, masquer ou finaliser |
| P2 | Frontend | Pas de tests frontend détectés | Régressions invisibles | Ajouter smoke tests critiques |
| P3 | Frontend | README boilerplate et docs stale | Onboarding faible | Mettre à jour après validation |

## 6. Problèmes mobile

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | Mobile | Config locale codée | Démo hors réseau local fragile | Flavors/env par contexte |
| P2 | Mobile | Contrats Dart non générés | Incohérences avec backend | Synchroniser modèles |
| P2 | Mobile | Tests quasi absents | Régressions terrain | Tests services/providers clés |
| P2 | Mobile | Routes backend dispersées | Maintenance difficile | Registre d'endpoints mobile |
| P3 | Mobile | Docs mobile obsolètes | Confusion reprise | Mettre à jour README/CLAUDE |

## 7. Problèmes n8n

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | n8n | Plusieurs workflows chatbot concurrents | Mauvaise version en soutenance | Choisir version canonique |
| P2 | n8n | Dépendance à endpoints backend/Groq | Démo fragile si config absente | Smoke test webhook et `.env.example` |
| P2 | n8n | Redondance avec chatbot backend | Architecture confuse | Documenter responsabilité n8n vs backend |

## 8. Problèmes base de données

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | DB | État réel DB inconnu vs migrations | Migration cassée possible | Sauvegarder et comparer avant correction |
| P2 | DB | Tables métier très nombreuses dans un seul DbContext | Complexité | Documenter domaines et indexes |
| P2 | DB | Migrations temporaires | Lisibilité faible | Nettoyage contrôlé seulement si historique maîtrisé |

## 9. Problèmes sécurité

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | Global | Secrets dans fichiers source/config | Fuite credentials | Rotation + externalisation |
| P1 | Backend | TLS bypass Sage | Interception possible | Corriger validation certificat |
| P1 | Backend | Seeds/dev endpoints | Mauvaise exposition | Garde stricte env + rôles |
| P2 | Front/Mobile | Configs locales | Fuites/déploiement fragile | Variables par environnement |

## 10. Problèmes performance

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P2 | Backend | Dashboards et listes potentiellement lourds | Latence | Pagination, indexes, cache ciblé |
| P2 | Mobile | GPS/ping batch à surveiller | Batterie/réseau | Fréquence adaptative |
| P2 | Frontend | Grandes pages dashboard | UI lente | Lazy loading et requêtes ciblées |

## 11. Problèmes architecture

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P2 | Global | Contrats API dupliqués en TS/Dart/C# | Incohérences | OpenAPI comme source de vérité |
| P2 | Global | Docs générées non synchronisées | Mauvaises décisions | Marquer docs obsolètes et garder mémoire Codex |
| P3 | Global | Artefacts générés dans workspace | Bruit Git/analyse | Nettoyage validé |

## 12. Dette technique

- Documentation très riche mais hétérogène.
- Plusieurs versions d'un même module chatbot.
- Tests présents mais trop ciblés.
- Configuration environnement encore trop locale.
- Certains noms de migrations/fichiers ne sont pas prêts pour une livraison propre.

## 13. Risques pour le PFE

- Démonstration cassée par endpoint non aligné ou variable manquante.
- Questions jury sur sécurité des secrets et configuration locale.
- Rapport académique qui décrit une fonctionnalité différemment du code.
- Workflow n8n ou paiement externe indisponible le jour de soutenance.

## 14. Recommandations prioritaires

| Priorité | Module | Problème | Impact | Solution proposée |
|---|---|---|---|---|
| P1 | Global | Secrets/configs | Sécurité | Externaliser et créer exemples propres |
| P1 | Global | Alignement API | Démo | Tester routes critiques React/Flutter/backend |
| P1 | n8n | Version chatbot | Soutenance | Valider workflow canonique |
| P1 | Backend | TLS Sage | Sécurité | Corriger ou documenter en dev uniquement |
| P2 | Global | Tests | Qualité | Ajouter smoke tests par flux |
| P2 | Docs | Stale docs | Coordination | Mettre à jour rapport/docs clés |
