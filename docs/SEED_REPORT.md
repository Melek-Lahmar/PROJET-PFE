# Seed Report — Environnement de démo propre (2026-05-12)

Reset complet de la DB + recréation d'un environnement de démo
réutilisable pour les futures sessions de tests UX.

## Récapitulatif

| Étape | Statut | Notes |
|-------|--------|-------|
| 1. Endpoint `/api/admin/dev/seed-clean-demo` créé | ✅ | `AdminDevController.SeedCleanDemo` : `[Authorize(Roles=ADMIN)]` + `IsDevelopment` check + body `{"confirm":"RESET_AND_SEED"}` (400 sinon). Phase 1 DELETE 23 tables transactionnelles + ProfilsUtilisateurs + AspNetUsers/Roles/Claims/Logins/Tokens. Phase 2 crée 5 utilisateurs via UserManager + leurs profils. Phase 3 crée 4 commandes EN_ATTENTE pour client1. |
| 2. UI bouton "Seed démo" Flutter | ✅ | Carte rouge foncé (`#7F1D1D`) dans Paramètres admin, distincte de la carte "Reset DB démo" existante. Dialog de confirmation qui exige de taper exactement "SEED". Loader pendant l'appel + récapitulatif dialog des users/commandes créés en retour. |
| 3. Exécution du seed | ✅ | Backend lancé en background, login admin → token → `POST /api/admin/dev/seed-clean-demo` → réponse `success:true` avec 182 profils supprimés, 10 user-roles, 10 users + 5 nouveaux users et 4 nouvelles commandes. |
| 4. Vérification DB (5 users + 4 commandes) | ✅ | Login validé pour les 5 comptes (admin/client1/confirmatrice1/confirmatrice2/livreur1) ; `GET /api/admin/orders?status=pending` retourne `BL00001` à `BL00004`. |

---

## Builds finaux

```
$ dotnet build --nologo
  0 Erreur(s)
$ flutter analyze (settings screen) → 0 error, 0 warning
```

---

## Utilisateurs créés

| Email | Mot de passe | Rôle | Profil |
|-------|--------------|------|--------|
| `admin@gmail.com` | `admin123` | ADMIN | Administrator (Tunis) |
| `client1@gmail.com` | `123456` | CLIENT | Mohamed Client Demo (Sfax, B2C, CLDEMO1) |
| `confirmatrice1@gmail.com` | `123456` | CONFIRMATEUR | Amira (Sfax) |
| `confirmatrice2@gmail.com` | `123456` | CONFIRMATEUR | Sonia (Tunis) |
| `livreur1@gmail.com` | `123456` | LIVREUR | Ahmed (Sfax) |

---

## Commandes créées (EN_ATTENTE pour `client1@gmail.com`)

| DoPiece | Articles | Net à payer | Créée il y a |
|---------|----------|-------------|--------------|
| BL00001 | 1 × Obręcz aluminiowa 20" górska (34.99 DT) | 43.99 DT | 4 h |
| BL00002 | 3 × Obręcz 20" szosowa + 1 × Transmission vélo enfant | 75.83 DT | 3 h |
| BL00003 | 2 × Dętka 26" szosowa | 19.00 DT | 2 h |
| BL00004 | Pneu 26" estrada + Obręcz 20" + Dętka 26" | 85.49 DT | 1 h |

Tous : COD/HOME, adresse Sfax Ville, frais 8 DT + timbre 1 DT.

---

## Tables nettoyées (phase 1)

profils (182) · user-roles (10) · users (10) · chatbot* (0) ·
sms_log (0) · livreur_position* (0) · avis_commande (0) ·
reclamation_photos/tentatives/reclamations (0) ·
livraison_historiques/livraisons (0) · paiements (0) ·
docligne/docentete (0) · commande_locks (0) ·
confirmatrice_sessions (0) · client_addresses (0) ·
device_tokens (0) · app_config (1 → re-inséré au défaut).

**Conservées :** F_ARTICLE, F_ARTSTOCK, F_CATALOGUE, F_DEPOT,
F_ARTICLE_IMAGE, CMS_HOMEPAGE, AspNetRoles, __EFMigrationsHistory.

---

## Annonce finale

**Reset DB complet réussi. 5 utilisateurs créés (`admin@gmail.com` /
`client1@gmail.com` / `confirmatrice1@gmail.com` /
`confirmatrice2@gmail.com` / `livreur1@gmail.com`). 4 commandes
EN_ATTENTE créées pour client1. Environnement de démo prêt.**
