# CLIENT_BUTTONS_AUDIT.md

> Audit exhaustif des boutons cliquables de l'espace client Flutter.
> Périmètre : `flutter/lib/ui/screens/client_*.dart` + widgets associés.
> Date : 2026-05-09

## Résultat

| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| Détail réclamation | TextButton (Annuler dialog) | client_claim_details_screen.dart:70-72 | ✅ OK | Dialog dismiss |
| Détail réclamation | FilledButton (Envoyer dialog) | client_claim_details_screen.dart:73-75 | ✅ OK | Dialog dismiss |
| Détail réclamation | FilledButton (Compris dialog) | client_claim_details_screen.dart:142-144 | ✅ OK | Dialog dismiss |
| Détail réclamation | IconButton (refresh) | client_claim_details_screen.dart:163 | ✅ OK | _load() |
| Détail réclamation | FilledButton.tonalIcon (Commander à nouveau) | client_claim_details_screen.dart:727-731 | ✅ OK | _repeatOrder() |
| Détail réclamation | FilledButton.tonalIcon (Demander un échange) | client_claim_details_screen.dart:735-739 | ✅ OK | _requestEchange() |
| Liste réclamations | IconButton (clear search) | client_claims_screen.dart:147-153 | ✅ OK | Clear |
| Liste réclamations | ChoiceChip (filtres) | client_claims_screen.dart:168-174 | ✅ OK | _filter setter |
| Liste réclamations | PremiumCard (claim tap) | client_claims_screen.dart:229-232 | ✅ OK | _openDetails(claim) |
| Liste réclamations | FloatingActionButton (Nouvelle réclamation) | client_claims_screen.dart:239-243 | ✅ OK | _openCreate() |
| Création réclamation | InkWell (delete photo) | client_create_claim_screen.dart:635-649 | ✅ OK | Remove from _pickedPhotos |
| Création réclamation | InkWell (camera) | client_create_claim_screen.dart:653-664 | ✅ OK | _pickPhoto(ImageSource.camera) |
| Création réclamation | InkWell (gallery) | client_create_claim_screen.dart:666-677 | ✅ OK | _pickPhoto(ImageSource.gallery) |
| Création réclamation | FilledButton.icon (submit) | client_create_claim_screen.dart:685-696 | ✅ OK | _submit() |
| Création réclamation | FilledButton.icon (retry error) | client_create_claim_screen.dart:731-735 | ✅ OK | onRetry callback |
| Création réclamation | InkWell (pick reprog date) | client_create_claim_screen.dart:795-834 | ✅ OK | onPickDate callback |
| Création réclamation | ChoiceChip (créneau) | client_create_claim_screen.dart:847-865 | ✅ OK | onChangeCreneau callback |
| Réponse demande | FilledButton.icon (envoyer) | client_demande_reply_screen.dart:182-191 | ✅ OK | _submit() |
| Liste demandes | PremiumCard (demande tap) | client_demandes_screen.dart:102-106 | ✅ OK | _openDemande(c) |
| Liste demandes | FilledButton.icon (Corriger maintenant) | client_demandes_screen.dart:245-252 | ✅ OK | onTap |
| Liste demandes | OutlinedButton.icon (Voir détail) | client_demandes_screen.dart:255-259 | ✅ OK | onTap |
| Tracking | IconButton (refresh) | client_order_tracking_screen.dart:191-195 | ✅ OK | _load(force: true) |
| Tracking | FilledButton.icon (Créer une réclamation) | client_order_tracking_screen.dart:301-305 | ✅ OK | _openCreateClaim() |
| Tracking | OutlinedButton.icon (Reprogrammer) | client_order_tracking_screen.dart:310-316 | ✅ OK | initialMotifCode REPROGRAMMATION |
| Tracking | InkWell (linked case card) | client_order_tracking_screen.dart:539-587 | ✅ OK | _openLinkedCase() |
| Liste commandes | IconButton (clear search) | client_orders_screen.dart:412-415 | ✅ OK | onClear |
| Liste commandes | GestureDetector (filter chip premium) | client_orders_screen.dart:437-483 | ✅ OK | _statusFilter setter |
| Liste commandes | ClientOrderCard (tap) | client_orders_screen.dart:217-222 | ✅ OK | _openTracking() |
| Liste commandes | FilledButton.tonalIcon (retry) | client_orders_screen.dart:530-534 | ✅ OK | provider.refresh() |
| Liste commandes | FilledButton.tonalIcon (reset filters) | client_orders_screen.dart:635-639 | ✅ OK | onReset |
| Profil | OutlinedButton.icon (logout) | client_profile_screen.dart:127-161 | ✅ OK | dialog → AuthProvider.logout() |
| Profil | Switch (notifications) | client_profile_screen.dart:525-529 | ✅ OK | NotificationPreferences.setSoundEnabled |

## TOTAL : 36 boutons audités, 0 morts, 0 endpoints manquants

## Ajouts à venir (Section 3 — refonte)

Boutons / endpoints à créer (features nouvelles, pas des morts) :

- Bouton « 📍 Suivre en direct » → écran tracking live → endpoint `GET /api/client/orders/{piece}/livreur-position`
- Bouton « 📞 Appeler livreur » + « 💬 SMS livreur » dans tracking
- Section profil « Mes adresses » CRUD → `GET/POST/PUT/DELETE /api/client/addresses`
- Lien « Suivre un colis sans compte » sur login → écran public → `POST /api/public/track`
- Section « Communication » prefs contact (Appel/SMS/Both) → `PUT /api/client/profile`
- Hero card programme fidélité Bronze/Argent/Or → `GET /api/client/loyalty`
- FAQ contextuelle (assets/faq.json statique)
- Bandeau connexion instable + queue offline (mêmes services que livreur)
- SMS pré-livraison automatique côté backend (pas de bouton — auto)
- Notification push « livreur proche » (pas de bouton — auto)
