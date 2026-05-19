using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.Geo;
using Web_Api.Model;

namespace Web_Api.Services.DevTest
{
    /// <summary>
    /// Reset et seed d'un jeu de données de test cohérent pour les flows
    /// client / livreur / confirmatrice. À utiliser uniquement en dev.
    /// Idempotent : nettoie les données marquées 'BCTEST' avant de les recréer.
    /// </summary>
    public class DevTestDataSeeder
    {
        // ======================================================================
        // Comptes et données figés
        // ======================================================================
        public const string TestOrderPrefix = "BCTEST";

        public const string ClientEmail = "client@gmail.com";
        public const string ClientPassword = "123456";

        public const string LivreurEmail = "livreur@test.com";
        public const string LivreurPassword = "livreur@test.com";

        public const string ConfirmatriceEmail = "confirmatrice.sfax@test.com";
        public const string ConfirmatricePassword = "123456";

        public const string AdminEmail = "admin@test.com";
        public const string AdminPassword = "123456";

        public const string ClientCodeSage = "CTEST001";

        private const string ClientAdresse = "Rue de la Liberté";
        private const string ClientVille = "Sfax Ville";
        private const string ClientCP = "3000";
        private const string ClientTelephone = "22111111";
        private const string ClientNom = "Client Test";

        private const string LivreurNom = "Livreur Test";
        private const string LivreurTelephone = "22222222";

        private const string ConfirmatriceNom = "Confirmatrice Sfax";
        private const string ConfirmatriceTelephone = "22333333";

        private const string AdminNom = "Admin Test";
        private const string AdminTelephone = "22444444";

        // ======================================================================
        // Dépendances
        // ======================================================================
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<DevTestDataSeeder> _logger;

        public DevTestDataSeeder(
            AppDbContext db,
            UserManager<ApplicationUser> userManager,
            ILogger<DevTestDataSeeder> logger)
        {
            _db = db;
            _userManager = userManager;
            _logger = logger;
        }

        // ======================================================================
        // Point d'entrée
        // ======================================================================
        public async Task<DevSeedReport> RunAsync(CancellationToken ct = default)
        {
            _logger.LogInformation("DevTest seed: start");

            await ClearTestDataAsync(ct);
            var accounts = await EnsureAccountsAsync(ct);
            var article = await GetAnyArticleAsync(ct);
            var orders = await SeedOrdersAsync(accounts, article, ct);
            var reclamations = await SeedClientReclamationsAsync(accounts, orders, ct);
            var demandes = await SeedLivreurDemandesAsync(accounts, orders, ct);

            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("DevTest seed: done ({OrdersCount} orders, {CasesCount} cas)",
                orders.Count, reclamations.Count + demandes.Count);

            return new DevSeedReport
            {
                Accounts = new[]
                {
                    new DevSeedAccountInfo { Email = ClientEmail, Role = AppRoles.CLIENT },
                    new DevSeedAccountInfo { Email = LivreurEmail, Role = AppRoles.LIVREUR },
                    new DevSeedAccountInfo { Email = ConfirmatriceEmail, Role = AppRoles.CONFIRMATEUR },
                    new DevSeedAccountInfo { Email = AdminEmail, Role = AppRoles.ADMIN }
                },
                Orders = orders.Select(o => new DevSeedOrderInfo
                {
                    Piece = o.DO_Piece ?? string.Empty,
                    Status = F_DOCENTETE.ToStatusLabel(o.DO_Valide),
                    AssignedToLivreur = o.AssignedLivreurId.HasValue
                }).ToArray(),
                Cases = reclamations.Concat(demandes).Select(r => new DevSeedCaseInfo
                {
                    Code = r.CodeReclamation,
                    DoPiece = r.DoPiece,
                    Source = r.Source,
                    TypeCas = r.TypeCas,
                    Motif = r.Motif,
                    Statut = r.Statut,
                    VisibleClient = r.VisibleClient
                }).ToArray()
            };
        }

        // ======================================================================
        // NETTOYAGE (idempotence)
        // ======================================================================
        private async Task ClearTestDataAsync(CancellationToken ct)
        {
            var testReclamationIds = await _db.F_RECLAMATIONS
                .Where(r => r.DoPiece.StartsWith(TestOrderPrefix))
                .Select(r => r.Id)
                .ToListAsync(ct);

            if (testReclamationIds.Count > 0)
            {
                await _db.F_RECLAMATION_PHOTOS
                    .Where(p => testReclamationIds.Contains(p.ReclamationId))
                    .ExecuteDeleteAsync(ct);
            }

            await _db.F_RECLAMATION_TENTATIVES
                .Where(t => t.CommandePiece.StartsWith(TestOrderPrefix))
                .ExecuteDeleteAsync(ct);

            await _db.F_RECLAMATIONS
                .Where(r => r.DoPiece.StartsWith(TestOrderPrefix))
                .ExecuteDeleteAsync(ct);

            await _db.F_LIVRAISONS
                .Where(l => l.DO_Piece.StartsWith(TestOrderPrefix))
                .ExecuteDeleteAsync(ct);

            await _db.F_DOCLIGNES
                .Where(l => l.DO_Piece != null && l.DO_Piece.StartsWith(TestOrderPrefix))
                .ExecuteDeleteAsync(ct);

            await _db.F_DOCENTETES
                .Where(o => o.DO_Piece != null && o.DO_Piece.StartsWith(TestOrderPrefix))
                .ExecuteDeleteAsync(ct);
        }

        // ======================================================================
        // COMPTES + PROFILS
        // ======================================================================
        private async Task<DevSeedAccounts> EnsureAccountsAsync(CancellationToken ct)
        {
            var client = await EnsureUserAsync(ClientEmail, ClientPassword, AppRoles.CLIENT);
            var clientProfile = await EnsureClientProfileAsync(client.Id, ct);

            var livreur = await EnsureUserAsync(LivreurEmail, LivreurPassword, AppRoles.LIVREUR);
            var livreurProfile = await EnsureEmployeProfileAsync(
                livreur.Id, LivreurNom, LivreurTelephone, "LIV-TEST", ct);

            var confirmatrice = await EnsureUserAsync(ConfirmatriceEmail, ConfirmatricePassword, AppRoles.CONFIRMATEUR);
            var confirmatriceProfile = await EnsureEmployeProfileAsync(
                confirmatrice.Id, ConfirmatriceNom, ConfirmatriceTelephone, "CONF-SFAX", ct);

            var admin = await EnsureUserAsync(AdminEmail, AdminPassword, AppRoles.ADMIN);
            var adminProfile = await EnsureEmployeProfileAsync(
                admin.Id, AdminNom, AdminTelephone, "ADMIN-TEST", ct);

            await _db.SaveChangesAsync(ct);

            return new DevSeedAccounts
            {
                Client = client,
                ClientProfile = clientProfile,
                Livreur = livreur,
                LivreurProfile = livreurProfile,
                Confirmatrice = confirmatrice,
                ConfirmatriceProfile = confirmatriceProfile,
                Admin = admin,
                AdminProfile = adminProfile
            };
        }

        private async Task<ApplicationUser> EnsureUserAsync(string email, string password, string role)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true
                };
                var createResult = await _userManager.CreateAsync(user, password);
                if (!createResult.Succeeded)
                    throw new InvalidOperationException(
                        $"Création du user '{email}' échouée : " +
                        string.Join(" ; ", createResult.Errors.Select(e => e.Description)));
            }
            else
            {
                // Remise à zéro du mot de passe pour garantir celui documenté
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetResult = await _userManager.ResetPasswordAsync(user, token, password);
                if (!resetResult.Succeeded)
                    throw new InvalidOperationException(
                        $"Reset du mot de passe pour '{email}' échoué : " +
                        string.Join(" ; ", resetResult.Errors.Select(e => e.Description)));

                if (!user.EmailConfirmed)
                {
                    user.EmailConfirmed = true;
                    await _userManager.UpdateAsync(user);
                }
            }

            // Rôle unique : enlève les anciens et ajoute celui demandé
            var existingRoles = await _userManager.GetRolesAsync(user);
            var rolesToRemove = existingRoles.Where(r => !string.Equals(r, role, StringComparison.OrdinalIgnoreCase)).ToList();
            if (rolesToRemove.Count > 0)
                await _userManager.RemoveFromRolesAsync(user, rolesToRemove);

            if (!await _userManager.IsInRoleAsync(user, role))
                await _userManager.AddToRoleAsync(user, role);

            return user;
        }

        private async Task<ProfilUtilisateur> EnsureClientProfileAsync(Guid userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            if (profile == null)
            {
                profile = new ProfilUtilisateur
                {
                    UtilisateurId = userId,
                    DateCreation = now
                };
                _db.ProfilsUtilisateurs.Add(profile);
            }

            profile.TypeProfil = TypeProfil.Client;
            profile.TypeClient = TypeClient.B2C;
            profile.NomComplet = ClientNom;
            profile.Telephone = ClientTelephone;
            profile.Gouvernorat = GouvernoratTunisie.Sfax;
            profile.Delegation = ClientVille;
            profile.Adresse = ClientAdresse;
            profile.Pays = "Tunisie";
            profile.CodePostal = ClientCP;
            profile.CodeClientSage = ClientCodeSage;
            profile.EstSynchroniseAvecSage = true;
            profile.DateModification = now;

            return profile;
        }

        private async Task<ProfilUtilisateur> EnsureEmployeProfileAsync(
            Guid userId, string nom, string tel, string codeEmploye, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            if (profile == null)
            {
                profile = new ProfilUtilisateur
                {
                    UtilisateurId = userId,
                    DateCreation = now
                };
                _db.ProfilsUtilisateurs.Add(profile);
            }

            profile.TypeProfil = TypeProfil.Employe;
            profile.TypeClient = null;
            profile.NomComplet = nom;
            profile.Telephone = tel;
            profile.Gouvernorat = GouvernoratTunisie.Sfax;
            profile.Delegation = ClientVille;
            profile.Adresse = "Siège Sfax";
            profile.Pays = "Tunisie";
            profile.CodePostal = ClientCP;
            profile.CodeEmploye = codeEmploye;
            profile.DateModification = now;

            return profile;
        }

        // ======================================================================
        // ARTICLES (optionnel : on réutilise un article existant s'il y en a)
        // ======================================================================
        private async Task<F_ARTICLE?> GetAnyArticleAsync(CancellationToken ct)
        {
            return await _db.F_ARTICLES
                .AsNoTracking()
                .OrderBy(a => a.cbMarq)
                .FirstOrDefaultAsync(ct);
        }

        // ======================================================================
        // COMMANDES (12 pièces BCTEST000001..BCTEST000012)
        // ======================================================================
        private async Task<List<F_DOCENTETE>> SeedOrdersAsync(
            DevSeedAccounts accounts, F_ARTICLE? article, CancellationToken ct)
        {
            var today = DateTime.UtcNow.Date;
            var orders = new List<F_DOCENTETE>();

            // 1 → EN_ATTENTE (nouvelle)
            orders.Add(CreateOrder("BCTEST000001", accounts, today.AddDays(-1),
                F_DOCENTETE.STATUS_EN_ATTENTE, assignedLivreur: false));

            // 2 → CONFIRME (sans livreur)
            orders.Add(CreateOrder("BCTEST000002", accounts, today.AddDays(-2),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: false));

            // 3 → CONFIRME + livreur assigné (en livraison)
            orders.Add(CreateOrder("BCTEST000003", accounts, today.AddDays(-3),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 4 → CONFIRME + livrée (F_LIVRAISON avec LI_DateLivree)
            orders.Add(CreateOrder("BCTEST000004", accounts, today.AddDays(-5),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 5 → TENTATIVE (= reportée)
            orders.Add(CreateOrder("BCTEST000005", accounts, today.AddDays(-4),
                F_DOCENTETE.STATUS_TENTATIVE, assignedLivreur: true));

            // 6 → REFUSE (= retournée)
            orders.Add(CreateOrder("BCTEST000006", accounts, today.AddDays(-6),
                F_DOCENTETE.STATUS_REFUSE, assignedLivreur: true));

            // 7 → CONFIRME + livrée (2e commande livrée pour R5)
            orders.Add(CreateOrder("BCTEST000007", accounts, today.AddDays(-7),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 8 → CONFIRME + livreur (support D1 adresse incorrecte)
            orders.Add(CreateOrder("BCTEST000008", accounts, today.AddDays(-2),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 9 → CONFIRME + livreur (support D2 numéro incorrect)
            orders.Add(CreateOrder("BCTEST000009", accounts, today.AddDays(-2),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 10 → CONFIRME + livreur (support D3 refus client)
            orders.Add(CreateOrder("BCTEST000010", accounts, today.AddDays(-3),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 11 → CONFIRME + livreur (support D4 autre incident)
            orders.Add(CreateOrder("BCTEST000011", accounts, today.AddDays(-3),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            // 12 → CONFIRME + livreur (support D5 3 tentatives téléphone fermé)
            orders.Add(CreateOrder("BCTEST000012", accounts, today.AddDays(-4),
                F_DOCENTETE.STATUS_CONFIRME, assignedLivreur: true));

            foreach (var o in orders)
                _db.F_DOCENTETES.Add(o);
            await _db.SaveChangesAsync(ct);

            // Ajouter 1 ligne par commande (si un article existe en base)
            if (article != null)
            {
                foreach (var o in orders)
                {
                    var ligne = new F_DOCLIGNE
                    {
                        DO_Domaine = o.DO_Domaine,
                        DO_Type = o.DO_Type,
                        DO_Piece = o.DO_Piece,
                        DO_Date = o.DO_Date,
                        CT_Num = o.DO_Tiers,
                        AR_Ref = article.AR_Ref,
                        DL_Design = article.AR_Design,
                        DL_Qte = 1m,
                        DL_PrixUnitaire = article.AR_PrixVen,
                        DL_MontantHT = article.AR_PrixVen,
                        DL_MontantTTC = article.AR_PrixVen,
                        LigneType = LigneTypes.STANDARD,
                        cbCreation = o.cbCreation,
                        cbModification = o.cbCreation
                    };
                    _db.F_DOCLIGNES.Add(ligne);
                }
                await _db.SaveChangesAsync(ct);
            }

            // F_LIVRAISON pour BCTEST000004 et BCTEST000007 (livrées)
            var delivered = new[] { "BCTEST000004", "BCTEST000007" };
            var inTransit = new[] { "BCTEST000003" }; // F_LIVRAISON existe mais non livrée
            foreach (var piece in delivered)
            {
                _db.F_LIVRAISONS.Add(new F_LIVRAISON
                {
                    DO_Piece = piece,
                    LI_Adresse = ClientAdresse,
                    LI_Ville = ClientVille,
                    LI_CodePostal = ClientCP,
                    LI_Statut = 3, // livré
                    LivreurId = accounts.LivreurProfile.cbMarq,
                    LI_DateCreation = today.AddDays(-6),
                    LI_DateLivree = today.AddDays(-1),
                    LI_Commentaire = "Seed test — livrée"
                });
            }
            foreach (var piece in inTransit)
            {
                _db.F_LIVRAISONS.Add(new F_LIVRAISON
                {
                    DO_Piece = piece,
                    LI_Adresse = ClientAdresse,
                    LI_Ville = ClientVille,
                    LI_CodePostal = ClientCP,
                    LI_Statut = 2, // en livraison
                    LivreurId = accounts.LivreurProfile.cbMarq,
                    LI_DateCreation = today.AddDays(-2),
                    LI_DateLivree = null,
                    LI_Commentaire = "Seed test — en livraison"
                });
            }
            await _db.SaveChangesAsync(ct);

            return orders;
        }

        private F_DOCENTETE CreateOrder(
            string piece, DevSeedAccounts accounts, DateTime date, short status, bool assignedLivreur)
        {
            var now = DateTime.UtcNow;
            return new F_DOCENTETE
            {
                DO_Domaine = 0,
                DO_Type = 0, // BC (aligné avec OrdersController et CustomerTrackingBuilder)
                DO_Date = date,
                DO_Ref = null,
                DO_Tiers = ClientCodeSage,
                DO_Piece = piece,
                DO_Valide = status,
                DO_TotalHT = 100m,
                DO_TotalHTNet = 100m,
                DO_TotalTTC = 119m,
                DO_NetAPayer = 119m,
                DO_ModeLivraison = "HOME",
                DO_ModePaiement = "CASH",
                DO_FraisLivraison = 8m,
                DO_TimbreFiscal = 1m,
                DO_AdresseLivraison = ClientAdresse,
                DO_VilleLivraison = ClientVille,
                DO_CodePostalLivraison = ClientCP,
                AssignedLivreurId = assignedLivreur ? accounts.Livreur.Id : null,
                TypeCommande = "NORMALE",
                cbCreation = now,
                cbModification = now
            };
        }

        // ======================================================================
        // RÉCLAMATIONS CLIENT (5 cas)
        // ======================================================================
        private async Task<List<F_RECLAMATION>> SeedClientReclamationsAsync(
            DevSeedAccounts accounts, List<F_DOCENTETE> orders, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var seq = 1;

            string NextCode() => $"REC-{now:yyyyMMdd}-TEST{seq++:D2}";

            var reclamations = new List<F_RECLAMATION>
            {
                // R1 — non livrée, Changement d'adresse, statut Envoyée
                new F_RECLAMATION
                {
                    CodeReclamation = NextCode(),
                    DoPiece = "BCTEST000001",
                    IsGlobal = true,
                    VisibleClient = false,
                    ClientUserId = accounts.Client.Id,
                    ClientProfileId = accounts.ClientProfile.cbMarq,
                    AssignedToUserId = accounts.Confirmatrice.Id,
                    CreatedByUserId = accounts.Client.Id,
                    TypeReclamation = ReclamationTypes.LIVRAISON,
                    TypeCas = Auth.Constants.TypeCas.RECLAMATION,
                    Motif = ClientMotifs.CHANGEMENT_ADRESSE,
                    Description = string.Empty,
                    Statut = ReclamationStatuses.ENVOYEE,
                    Source = ReclamationSources.CLIENT,
                    CorrectionProposee = JsonSerializer.Serialize(new
                    {
                        address = "Nouvelle rue Habib Bourguiba, Sfax",
                        latitude = 34.7406m,
                        longitude = 10.7603m
                    }),
                    CorrectionAppliquee = false,
                    CreatedAt = now, UpdatedAt = now
                },
                // R2 — non livrée, Changement de numéro, statut En cours de traitement
                new F_RECLAMATION
                {
                    CodeReclamation = NextCode(),
                    DoPiece = "BCTEST000002",
                    IsGlobal = true,
                    VisibleClient = false,
                    ClientUserId = accounts.Client.Id,
                    ClientProfileId = accounts.ClientProfile.cbMarq,
                    AssignedToUserId = accounts.Confirmatrice.Id,
                    CreatedByUserId = accounts.Client.Id,
                    TypeReclamation = ReclamationTypes.LIVRAISON,
                    TypeCas = Auth.Constants.TypeCas.RECLAMATION,
                    Motif = ClientMotifs.CHANGEMENT_NUMERO,
                    Description = string.Empty,
                    Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT,
                    Source = ReclamationSources.CLIENT,
                    CorrectionProposee = JsonSerializer.Serialize(new { phone = "22555444" }),
                    CorrectionAppliquee = false,
                    CreatedAt = now, UpdatedAt = now
                },
                // R3 — non livrée, Demande d'annulation, statut Envoyée
                new F_RECLAMATION
                {
                    CodeReclamation = NextCode(),
                    DoPiece = "BCTEST000003",
                    IsGlobal = true,
                    VisibleClient = false,
                    ClientUserId = accounts.Client.Id,
                    ClientProfileId = accounts.ClientProfile.cbMarq,
                    AssignedToUserId = accounts.Confirmatrice.Id,
                    CreatedByUserId = accounts.Client.Id,
                    TypeReclamation = ReclamationTypes.LIVRAISON,
                    TypeCas = Auth.Constants.TypeCas.RECLAMATION,
                    Motif = ClientMotifs.ANNULATION,
                    Description = string.Empty,
                    Statut = ReclamationStatuses.ENVOYEE,
                    Source = ReclamationSources.CLIENT,
                    CreatedAt = now, UpdatedAt = now
                },
                // R4 — livrée, Colis endommagé, statut Envoyée
                new F_RECLAMATION
                {
                    CodeReclamation = NextCode(),
                    DoPiece = "BCTEST000004",
                    IsGlobal = true,
                    VisibleClient = false,
                    ClientUserId = accounts.Client.Id,
                    ClientProfileId = accounts.ClientProfile.cbMarq,
                    AssignedToUserId = accounts.Confirmatrice.Id,
                    CreatedByUserId = accounts.Client.Id,
                    TypeReclamation = ReclamationTypes.PRODUIT,
                    TypeCas = Auth.Constants.TypeCas.RECLAMATION,
                    Motif = ClientMotifs.COLIS_ENDOMMAGE,
                    Description = string.Empty,
                    Statut = ReclamationStatuses.ENVOYEE,
                    Source = ReclamationSources.CLIENT,
                    CreatedAt = now, UpdatedAt = now
                },
                // R5 — livrée, Colis non correspondant, statut Clôturée
                new F_RECLAMATION
                {
                    CodeReclamation = NextCode(),
                    DoPiece = "BCTEST000007",
                    IsGlobal = true,
                    VisibleClient = false,
                    ClientUserId = accounts.Client.Id,
                    ClientProfileId = accounts.ClientProfile.cbMarq,
                    AssignedToUserId = accounts.Confirmatrice.Id,
                    CreatedByUserId = accounts.Client.Id,
                    TypeReclamation = ReclamationTypes.PRODUIT,
                    TypeCas = Auth.Constants.TypeCas.RECLAMATION,
                    Motif = ClientMotifs.COLIS_NON_CORRESPONDANT,
                    Description = string.Empty,
                    Statut = ReclamationStatuses.CLOTUREE,
                    Source = ReclamationSources.CLIENT,
                    CreatedAt = now.AddDays(-1),
                    UpdatedAt = now,
                    ClosedAt = now,
                    ResolvedAt = now
                }
            };

            foreach (var r in reclamations)
                _db.F_RECLAMATIONS.Add(r);
            await _db.SaveChangesAsync(ct);
            return reclamations;
        }

        // ======================================================================
        // DEMANDES LIVREUR (5 cas)
        // ======================================================================
        private async Task<List<F_RECLAMATION>> SeedLivreurDemandesAsync(
            DevSeedAccounts accounts, List<F_DOCENTETE> orders, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var today = now.Date;
            var seq = 10;

            string NextCode() => $"REC-{now:yyyyMMdd}-TEST{seq++:D2}";

            // D1 — Adresse incorrecte, visible client, Envoyée (rouge côté client)
            var d1 = new F_RECLAMATION
            {
                CodeReclamation = NextCode(),
                DoPiece = "BCTEST000008",
                IsGlobal = true,
                VisibleClient = true,
                ClientUserId = accounts.Client.Id,
                ClientProfileId = accounts.ClientProfile.cbMarq,
                AssignedToUserId = accounts.Confirmatrice.Id,
                CreatedByUserId = accounts.Livreur.Id,
                TypeReclamation = ReclamationTypes.LIVRAISON,
                TypeCas = Auth.Constants.TypeCas.DEMANDE,
                Motif = LivreurMotifs.ADRESSE_INCORRECTE,
                Description = "Signalement livreur — adresse introuvable sur le terrain",
                Statut = ReclamationStatuses.ENVOYEE,
                Source = ReclamationSources.LIVREUR,
                TentativesCount = 1,
                FirstAttemptAt = now,
                LastAttemptAt = now,
                CreatedAt = now, UpdatedAt = now
            };

            // D2 — Numéro incorrect, visible client, En cours (vert — client a répondu)
            var d2 = new F_RECLAMATION
            {
                CodeReclamation = NextCode(),
                DoPiece = "BCTEST000009",
                IsGlobal = true,
                VisibleClient = true,
                ClientUserId = accounts.Client.Id,
                ClientProfileId = accounts.ClientProfile.cbMarq,
                AssignedToUserId = accounts.Confirmatrice.Id,
                CreatedByUserId = accounts.Livreur.Id,
                TypeReclamation = ReclamationTypes.LIVRAISON,
                TypeCas = Auth.Constants.TypeCas.DEMANDE,
                Motif = LivreurMotifs.NUMERO_INCORRECT,
                Description = "Signalement livreur — numéro ne répond pas",
                Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT,
                Source = ReclamationSources.LIVREUR,
                CorrectionProposee = JsonSerializer.Serialize(new { phone = "22555999" }),
                CorrectionAppliquee = false,
                TentativesCount = 1,
                FirstAttemptAt = now.AddHours(-4),
                LastAttemptAt = now.AddHours(-4),
                LastClientReplyAt = now.AddMinutes(-30),
                CreatedAt = now.AddHours(-5), UpdatedAt = now
            };

            // D3 — Refus client, non visible client, Envoyée (remontée directe confirmatrice)
            var d3 = new F_RECLAMATION
            {
                CodeReclamation = NextCode(),
                DoPiece = "BCTEST000010",
                IsGlobal = true,
                VisibleClient = false,
                ClientUserId = accounts.Client.Id,
                ClientProfileId = accounts.ClientProfile.cbMarq,
                AssignedToUserId = accounts.Confirmatrice.Id,
                CreatedByUserId = accounts.Livreur.Id,
                TypeReclamation = ReclamationTypes.LIVRAISON,
                TypeCas = Auth.Constants.TypeCas.DEMANDE,
                Motif = LivreurMotifs.CLIENT_REFUSE,
                Description = "Le client a refusé la commande sans motif précis.",
                Statut = ReclamationStatuses.ENVOYEE,
                Source = ReclamationSources.LIVREUR,
                TentativesCount = 1,
                FirstAttemptAt = now, LastAttemptAt = now,
                CreatedAt = now, UpdatedAt = now
            };

            // D4 — Autre incident, non visible client, Refusée (couvre le statut REFUSEE)
            var d4 = new F_RECLAMATION
            {
                CodeReclamation = NextCode(),
                DoPiece = "BCTEST000011",
                IsGlobal = true,
                VisibleClient = false,
                ClientUserId = accounts.Client.Id,
                ClientProfileId = accounts.ClientProfile.cbMarq,
                AssignedToUserId = accounts.Confirmatrice.Id,
                CreatedByUserId = accounts.Livreur.Id,
                TypeReclamation = ReclamationTypes.AUTRE,
                TypeCas = Auth.Constants.TypeCas.DEMANDE,
                Motif = LivreurMotifs.AUTRE,
                Description = "Incident ponctuel, description test d'au moins dix caractères.",
                Statut = ReclamationStatuses.REFUSEE,
                Source = ReclamationSources.LIVREUR,
                MotifRefus = "Motif non éligible après vérification confirmatrice.",
                TentativesCount = 1,
                FirstAttemptAt = now.AddDays(-1), LastAttemptAt = now.AddDays(-1),
                CreatedAt = now.AddDays(-1), UpdatedAt = now, ClosedAt = now
            };

            // D5 — 3 tentatives Téléphone fermé, non visible client, Envoyée
            var d5 = new F_RECLAMATION
            {
                CodeReclamation = NextCode(),
                DoPiece = "BCTEST000012",
                IsGlobal = true,
                VisibleClient = false,
                ClientUserId = accounts.Client.Id,
                ClientProfileId = accounts.ClientProfile.cbMarq,
                AssignedToUserId = accounts.Confirmatrice.Id,
                CreatedByUserId = accounts.Livreur.Id,
                TypeReclamation = ReclamationTypes.LIVRAISON,
                TypeCas = Auth.Constants.TypeCas.DEMANDE,
                Motif = LivreurMotifs.TELEPHONE_ETEINT,
                Description = "Signalement livreur — téléphone fermé 3 jours.",
                Statut = ReclamationStatuses.ENVOYEE,
                Source = ReclamationSources.LIVREUR,
                TentativesCount = 3,
                FirstAttemptAt = today.AddDays(-2),
                LastAttemptAt = today,
                CreatedAt = today.AddDays(-2), UpdatedAt = now
            };

            _db.F_RECLAMATIONS.AddRange(d1, d2, d3, d4, d5);
            await _db.SaveChangesAsync(ct);

            // Tentatives pour D5 (3 jours différents, unicité respectée par l'index)
            _db.F_RECLAMATION_TENTATIVES.AddRange(
                new F_RECLAMATION_TENTATIVE
                {
                    ReclamationId = d5.Id,
                    CommandePiece = "BCTEST000012",
                    DateJour = today.AddDays(-2),
                    Motif = LivreurMotifs.TELEPHONE_ETEINT,
                    LivreurUserId = accounts.Livreur.Id,
                    CreatedAt = today.AddDays(-2), UpdatedAt = today.AddDays(-2)
                },
                new F_RECLAMATION_TENTATIVE
                {
                    ReclamationId = d5.Id,
                    CommandePiece = "BCTEST000012",
                    DateJour = today.AddDays(-1),
                    Motif = LivreurMotifs.TELEPHONE_ETEINT,
                    LivreurUserId = accounts.Livreur.Id,
                    CreatedAt = today.AddDays(-1), UpdatedAt = today.AddDays(-1)
                },
                new F_RECLAMATION_TENTATIVE
                {
                    ReclamationId = d5.Id,
                    CommandePiece = "BCTEST000012",
                    DateJour = today,
                    Motif = LivreurMotifs.TELEPHONE_ETEINT,
                    LivreurUserId = accounts.Livreur.Id,
                    CreatedAt = now, UpdatedAt = now
                }
            );
            await _db.SaveChangesAsync(ct);

            return new List<F_RECLAMATION> { d1, d2, d3, d4, d5 };
        }
    }

    // ==========================================================================
    // DTOs d'entrée/sortie pour le rapport du seed
    // ==========================================================================
    public class DevSeedAccounts
    {
        public ApplicationUser Client { get; set; } = null!;
        public ProfilUtilisateur ClientProfile { get; set; } = null!;
        public ApplicationUser Livreur { get; set; } = null!;
        public ProfilUtilisateur LivreurProfile { get; set; } = null!;
        public ApplicationUser Confirmatrice { get; set; } = null!;
        public ProfilUtilisateur ConfirmatriceProfile { get; set; } = null!;
        public ApplicationUser Admin { get; set; } = null!;
        public ProfilUtilisateur AdminProfile { get; set; } = null!;
    }

    public class DevSeedReport
    {
        public string Message { get; set; } = "Reset + seed OK";
        public DevSeedAccountInfo[] Accounts { get; set; } = Array.Empty<DevSeedAccountInfo>();
        public DevSeedOrderInfo[] Orders { get; set; } = Array.Empty<DevSeedOrderInfo>();
        public DevSeedCaseInfo[] Cases { get; set; } = Array.Empty<DevSeedCaseInfo>();
    }

    public class DevSeedAccountInfo
    {
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    public class DevSeedOrderInfo
    {
        public string Piece { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool AssignedToLivreur { get; set; }
    }

    public class DevSeedCaseInfo
    {
        public string Code { get; set; } = string.Empty;
        public string DoPiece { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string TypeCas { get; set; } = string.Empty;
        public string Motif { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public bool VisibleClient { get; set; }
    }
}
