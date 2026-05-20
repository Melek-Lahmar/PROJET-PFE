# Cartographie Mobile Flutter

## Stack détectée

- Flutter/Dart SDK `^3.9.0`.
- Dépendances principales: Provider, HTTP, secure storage, shared preferences, Google Maps, geolocator, SignalR, notifications, Hive, image picker/compress, charts, scanner, TTS/STT.
- Asset confirmé: `assets/faq.json`.

## Structure

- `lib/main.dart`: initialisation app, providers, routage selon rôle.
- `lib/core`: config, réseau, auth, services transverses.
- `lib/features`: modules admin, client, livreur, confirmatrice, transit, supervisor, chatbot/FAQ.
- `test/widget_test.dart`: test minimal.

## Screens

- Client: accueil, commandes, tracking, réclamations/demandes, avis, profil, adresses, FAQ.
- Livreur: nouvelles commandes, mes commandes, détail, carte, stats, profil, encaissement/incidents.
- Confirmatrice: commandes, réclamations, détail, profil, workflow.
- Admin: dashboard, commandes, livreurs, confirmatrices, produits, réclamations, chat, settings.
- Superviseur: home/alertes/zones selon modules.
- Transit: home et flux inter-dépôts.

## Widgets

- Widgets métier par feature.
- Navigation/rendu conditionnel piloté par providers et session.
- Notifications/local UI initialisées au démarrage.

## Services API

- Client central: `lib/core/network/api_client.dart`.
- Services par domaine: auth, health, offline queue, location, realtime, admin, client, confirmatrice, livreur, transit, supervisor.
- Appels backend souvent écrits en chaînes directes dans les services.

## Modèles

- Modèles par feature pour commandes, réclamations, livreurs, dashboard, transit, client, etc.
- **Risque**: contrats Dart non générés depuis OpenAPI; dérive possible avec DTO backend.

## Navigation

- `_Root` dans `main.dart` sélectionne l'application par rôle/session.
- Rôles détectés: admin, livreur/driver, confirmatrice, client, supervisor, transit.
- Navigation interne par homes/providers propres aux domaines.

## Authentification

- Token stocké via `flutter_secure_storage`.
- `ApiClient` injecte bearer token.
- Callback 401 pour déconnexion/gestion session.

## Intégration backend

- Base URL par défaut locale dans `constants.dart`.
- Endpoint OSRM externe détecté.
- n8n chatbot webhook vide dans la config mobile.
- SignalR utilisé pour temps réel.

## Fonctionnalités principales

- Multi-rôles mobile.
- Livraison terrain: assignation, statuts, position, carte, encaissement.
- Client: suivi, réclamations, avis, adresses.
- Confirmatrice: commandes/réclamations.
- Admin/supervisor/transit: pilotage opérationnel mobile.
- Offline queue/photos détectées.

## Problèmes détectés

- URL backend locale codée dans `constants.dart`; non portable sans build config.
- Configuration/token mobile sensible dans code; valeur non reproduite ici.
- Documentation `CLAUDE.md` mobile partiellement obsolète par rapport à `main.dart`.
- README mobile proche du template Flutter.
- Test mobile quasi inexistant.
- Nombreux services reconstruisent les routes au lieu d'un registre central.
- Usage probable d'APIs Flutter dépréciées comme `withOpacity`.
- n8n webhook vide côté mobile; confirmer si intentionnel.

## Améliorations proposées

- Introduire flavors/config par environnement (`dev`, `demo`, `prod`) et `--dart-define`.
- Externaliser secrets/tokens et supprimer valeurs par défaut sensibles.
- Générer ou synchroniser les modèles depuis Swagger.
- Ajouter tests widget/services pour auth, client tracking, livreur status, confirmatrice.
- Centraliser routes backend mobile.
- Nettoyer docs obsolètes et README.
