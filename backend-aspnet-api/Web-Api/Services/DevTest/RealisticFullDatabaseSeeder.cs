using System.Data.Common;
using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.Geo;
using Web_Api.Model;
using Web_Api.Services;

namespace Web_Api.Services.DevTest
{
    public sealed class RealisticFullDatabaseSeeder
    {
        public const string CommonPassword = "123456789";
        public const string RequiredConfirmValue = "RESET_AND_SEED_FULL_DATABASE";

        private const decimal TvaRate = 0.19m;
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole<Guid>> _roleManager;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<RealisticFullDatabaseSeeder> _logger;
        private readonly Random _rng = new(20260529);

        public RealisticFullDatabaseSeeder(
            AppDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole<Guid>> roleManager,
            IWebHostEnvironment env,
            ILogger<RealisticFullDatabaseSeeder> logger)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
            _env = env;
            _logger = logger;
        }

        public async Task<RealisticSeedReport> RunAsync(CancellationToken ct = default)
        {
            if (!_env.IsDevelopment())
                throw new InvalidOperationException("Le seed complet est autorisé uniquement en Development.");

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var report = new RealisticSeedReport
            {
                DatabaseName = await ResolveDatabaseNameAsync(ct)
            };

            await ResetBusinessDataAsync(report, ct);
            await EnsureRolesAsync(report, ct);

            var depots = await SeedDepotsAsync(report, ct);
            var zones = await SeedZonesAsync(depots, report, ct);
            var users = await SeedUsersAsync(depots, zones, report, ct);
            var catalogues = await SeedCataloguesAsync(report, ct);
            var articles = await SeedArticlesAsync(catalogues, report, ct);

            await SeedStocksAsync(articles, depots, report, ct);
            await SeedHomepageAsync(articles, catalogues, users, report, ct);
            var devis = await SeedDevisAsync(users, articles, report, ct);
            var orders = await SeedCommandesAsync(users, articles, depots, report, ct);
            await SeedLivraisonsAsync(orders, users, zones, report, ct);
            await SeedTransfertsAsync(orders, users, articles, depots, report, ct);
            await SeedReclamationsAsync(orders, users, articles, report, ct);
            await SeedPaiementsAsync(orders, report, ct);
            await SeedClientAddressesAndLivreurPositionsAsync(users, zones, report, ct);

            report.AccountsFilePath = await GenerateAccountsTxtFileAsync(users.Accounts, report.DatabaseName, ct);
            await ValidateSeedAsync(report, ct);

            await tx.CommitAsync(ct);

            _logger.LogInformation("Realistic full seed completed: {Counts}", JsonSerializer.Serialize(report.Counts));
            return report;
        }

        public async Task<RealisticSeedSummary> GetSummaryAsync(CancellationToken ct = default)
        {
            var roleCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var role in AppRoles.All)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role);
                roleCounts[role] = usersInRole.Count;
            }

            return new RealisticSeedSummary
            {
                DatabaseName = await ResolveDatabaseNameAsync(ct),
                RoleCounts = roleCounts,
                Users = await _db.Users.CountAsync(ct),
                Depots = await _db.F_DEPOTS.CountAsync(ct),
                Zones = await _db.F_DEPOT_ZONES.CountAsync(ct),
                Catalogues = await _db.F_CATALOGUES.CountAsync(ct),
                Articles = await _db.F_ARTICLES.CountAsync(ct),
                Stocks = await _db.F_ARTSTOCKS.CountAsync(ct),
                Devis = await _db.F_DEVIS_ENTETES.CountAsync(ct),
                Commandes = await _db.F_DOCENTETES.CountAsync(ct),
                LignesCommandes = await _db.F_DOCLIGNES.CountAsync(ct),
                Livraisons = await _db.F_LIVRAISONS.CountAsync(ct),
                Transferts = await _db.F_TRANSFERTS.CountAsync(ct),
                Reclamations = await _db.F_RECLAMATIONS.CountAsync(ct),
                Paiements = await _db.B_PAIEMENTS.CountAsync(ct),
                AccountsFilePath = ResolveAccountsFilePath()
            };
        }

        private async Task ResetBusinessDataAsync(RealisticSeedReport report, CancellationToken ct)
        {
            var deleted = report.Deleted;

            deleted["reclamationMessages"] = await ExecuteIfTableExistsAsync("F_RECLAMATION_MESSAGE", ct);
            deleted["deliveryIncidentPhotos"] = await _db.F_DELIVERY_INCIDENT_PHOTOS.ExecuteDeleteAsync(ct);
            deleted["reclamationPhotos"] = await ExecuteIfTableExistsAsync("F_RECLAMATION_PHOTO", ct);
            deleted["reclamationTentatives"] = await _db.F_RECLAMATION_TENTATIVES.ExecuteDeleteAsync(ct);
            deleted["reclamations"] = await _db.F_RECLAMATIONS.ExecuteDeleteAsync(ct);

            deleted["transfertAuditLogs"] = await _db.F_TRANSFERT_AUDIT_LOGS.ExecuteDeleteAsync(ct);
            deleted["transferts"] = await _db.F_TRANSFERTS.ExecuteDeleteAsync(ct);
            deleted["supervisorAlerts"] = await _db.F_SUPERVISOR_ALERTS.ExecuteDeleteAsync(ct);

            deleted["avisPromptStates"] = await ExecuteIfTableExistsAsync("F_AVIS_PROMPT_STATE", ct);
            deleted["avisCommandes"] = await ExecuteIfTableExistsAsync("F_AVIS_COMMANDE", ct);
            deleted["livraisonHistoriques"] = await _db.F_LIVRAISON_HISTORIQUES.ExecuteDeleteAsync(ct);
            deleted["livraisons"] = await _db.F_LIVRAISONS.ExecuteDeleteAsync(ct);
            deleted["paiements"] = await _db.B_PAIEMENTS.ExecuteDeleteAsync(ct);
            deleted["docLignes"] = await _db.F_DOCLIGNES.ExecuteDeleteAsync(ct);
            deleted["docEntetes"] = await _db.F_DOCENTETES.ExecuteDeleteAsync(ct);

            deleted["devisEvents"] = await _db.F_DEVIS_EVENTS.ExecuteDeleteAsync(ct);
            deleted["devisLignes"] = await _db.F_DEVIS_LIGNES.ExecuteDeleteAsync(ct);
            deleted["devisEntetes"] = await _db.F_DEVIS_ENTETES.ExecuteDeleteAsync(ct);

            deleted["clientFavoris"] = await _db.F_CLIENT_FAVORIS.ExecuteDeleteAsync(ct);
            deleted["clientAddresses"] = await _db.F_CLIENT_ADDRESSES.ExecuteDeleteAsync(ct);
            deleted["clientDeviceTokens"] = await _db.F_CLIENT_DEVICE_TOKENS.ExecuteDeleteAsync(ct);
            deleted["livreurPositions"] = await _db.F_LIVREUR_POSITIONS.ExecuteDeleteAsync(ct);
            deleted["livreurPositionHistory"] = await _db.F_LIVREUR_POSITION_HISTORIES.ExecuteDeleteAsync(ct);
            deleted["livreurActionLogs"] = await _db.F_LIVREUR_ACTION_LOGS.ExecuteDeleteAsync(ct);
            deleted["livreurAbandonLogs"] = await _db.F_LIVREUR_ABANDON_LOGS.ExecuteDeleteAsync(ct);
            deleted["smsLogs"] = await _db.F_SMS_LOGS.ExecuteDeleteAsync(ct);
            deleted["commandeLocks"] = await _db.CommandeConfirmationLocks.ExecuteDeleteAsync(ct);
            deleted["confirmatriceSessions"] = await _db.F_CONFIRMATRICE_SESSIONS.ExecuteDeleteAsync(ct);

            deleted["chatbotActionLogs"] = await _db.F_CHATBOT_ACTION_LOGS.ExecuteDeleteAsync(ct);
            deleted["chatbotPendingActions"] = await _db.F_CHATBOT_PENDING_ACTIONS.ExecuteDeleteAsync(ct);
            deleted["chatbotMessages"] = await _db.F_CHATBOT_MESSAGES.ExecuteDeleteAsync(ct);
            deleted["chatbotInsights"] = await _db.F_CHATBOT_INSIGHTS.ExecuteDeleteAsync(ct);
            deleted["chatbotSessions"] = await _db.F_CHATBOT_SESSIONS.ExecuteDeleteAsync(ct);

            deleted["homepageTemplates"] = await _db.HomepageTemplates.ExecuteDeleteAsync(ct);
            deleted["homepages"] = await _db.HOMEPAGES.ExecuteDeleteAsync(ct);
            deleted["appSettings"] = await _db.AppSettings.ExecuteDeleteAsync(ct);
            deleted["appConfig"] = await _db.F_APP_CONFIGS.ExecuteDeleteAsync(ct);

            deleted["articleImages"] = await _db.F_ARTICLE_IMAGES.ExecuteDeleteAsync(ct);
            deleted["stocks"] = await _db.F_ARTSTOCKS.ExecuteDeleteAsync(ct);
            deleted["articles"] = await _db.F_ARTICLES.ExecuteDeleteAsync(ct);
            deleted["catalogues"] = await _db.F_CATALOGUES.ExecuteDeleteAsync(ct);
            deleted["livreurZones"] = await _db.F_LIVREUR_ZONES.ExecuteDeleteAsync(ct);
            deleted["depotZones"] = await _db.F_DEPOT_ZONES.ExecuteDeleteAsync(ct);
            deleted["depots"] = await _db.F_DEPOTS.ExecuteDeleteAsync(ct);

            await _db.Database.ExecuteSqlRawAsync(
                "UPDATE AspNetUsers SET CustomerProfilecbMarq = NULL WHERE CustomerProfilecbMarq IS NOT NULL", ct);
            deleted["identityUserRoles"] = await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserRoles", ct);
            deleted["identityUserClaims"] = await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserClaims", ct);
            deleted["identityUserLogins"] = await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserLogins", ct);
            deleted["identityUserTokens"] = await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserTokens", ct);
            deleted["users"] = await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUsers", ct);
            deleted["profils"] = await _db.ProfilsUtilisateurs.ExecuteDeleteAsync(ct);
        }

        private async Task<int> ExecuteIfTableExistsAsync(string tableName, CancellationToken ct)
        {
            var sql = $"""
                IF OBJECT_ID(N'dbo.{tableName}', N'U') IS NOT NULL
                    DELETE FROM dbo.{tableName};
                """;
            return await _db.Database.ExecuteSqlRawAsync(sql, ct);
        }

        private async Task EnsureRolesAsync(RealisticSeedReport report, CancellationToken ct)
        {
            foreach (var roleName in AppRoles.All)
            {
                if (!await _roleManager.RoleExistsAsync(roleName))
                {
                    var result = await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
                    EnsureIdentitySuccess(result, $"Creation role {roleName}");
                    report.Counts.RolesCreated++;
                }
                else
                {
                    report.Counts.RolesExisting++;
                }
            }

            await _db.SaveChangesAsync(ct);
        }

        private async Task<List<DepotSeed>> SeedDepotsAsync(RealisticSeedReport report, CancellationToken ct)
        {
            var depots = new List<DepotSeed>
            {
                new(1, "DEP-TUN", "Dépôt Central Tunis", "Zone industrielle Charguia 1, Tunis 2035", "Tunis", "2035", GouvernoratTunisie.Tunis, "Médina", 36.8065m, 10.1815m, true),
                new(2, "DEP-SFX", "Dépôt Sfax", "Route de Gabès km 3, Sfax 3000", "Sfax", "3000", GouvernoratTunisie.Sfax, "Sfax Ville", 34.7406m, 10.7603m, false),
                new(3, "DEP-SOU", "Dépôt Sousse", "Zone industrielle Sidi Abdelhamid, Sousse 4061", "Sousse", "4061", GouvernoratTunisie.Sousse, "Sousse Sidi Abdelhamid", 35.8256m, 10.6084m, false),
                new(4, "DEP-NAB", "Dépôt Nabeul", "Route de Hammamet, Nabeul 8000", "Nabeul", "8000", GouvernoratTunisie.Nabeul, "Nabeul", 36.4513m, 10.7350m, false),
                new(5, "DEP-BIZ", "Dépôt Bizerte", "Zone industrielle Menzel Jemil, Bizerte 7080", "Bizerte", "7080", GouvernoratTunisie.Bizerte, "Menzel Jemil", 37.2744m, 9.8739m, false),
                new(6, "DEP-MON", "Dépôt Monastir", "Zone industrielle Monastir, Monastir 5000", "Monastir", "5000", GouvernoratTunisie.Monastir, "Monastir", 35.7643m, 10.8113m, false),
                new(7, "DEP-GAB", "Dépôt Gabès", "Route de Médenine, Gabès 6000", "Gabès", "6000", GouvernoratTunisie.Gabes, "Gabès Médina", 33.8815m, 10.0982m, false),
                new(8, "DEP-KAI", "Dépôt Kairouan", "Zone industrielle Kairouan, Kairouan 3100", "Kairouan", "3100", GouvernoratTunisie.Kairouan, "Kairouan Nord", 35.6781m, 10.0963m, false),
                new(9, "DEP-MED", "Dépôt Médenine", "Route de Djerba, Médenine 4100", "Médenine", "4100", GouvernoratTunisie.Medenine, "Médenine Nord", 33.3549m, 10.5055m, false),
            };

            foreach (var depot in depots)
            {
                var (adresse, complement) = SplitDepotAddress(depot.Address);
                _db.F_DEPOTS.Add(new F_DEPOT
                {
                    DE_No = depot.No,
                    DE_Code = depot.Code,
                    DE_Intitule = Truncate(depot.Name, 35),
                    DE_Adresse = adresse,
                    DE_Complement = complement,
                    DE_CodePostal = depot.PostalCode,
                    DE_Ville = depot.City,
                    DE_Pays = "TUN",
                    DE_Principal = depot.IsPrincipal ? (short)1 : (short)0,
                    DE_CodeSociete = "PFE",
                    DE_Banque = "BIAT"
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Depots = depots.Count;
            return depots;
        }

        private async Task<List<ZoneSeed>> SeedZonesAsync(List<DepotSeed> depots, RealisticSeedReport report, CancellationToken ct)
        {
            var zones = new List<ZoneSeed>
            {
                Z(1, "Tunis Centre", GouvernoratTunisie.Tunis, "Médina"), Z(1, "La Marsa", GouvernoratTunisie.Tunis, "La Marsa"),
                Z(1, "Ariana Ville", GouvernoratTunisie.Ariana, "Ariana Ville"), Z(1, "Ben Arous", GouvernoratTunisie.BenArous, "Ben Arous"),
                Z(1, "Manouba", GouvernoratTunisie.Manouba, "La Manouba"),
                Z(2, "Sfax Ville", GouvernoratTunisie.Sfax, "Sfax Ville"), Z(2, "Sakiet Ezzit", GouvernoratTunisie.Sfax, "Sakiet Ezzit"),
                Z(2, "Sakiet Eddaier", GouvernoratTunisie.Sfax, "Sakiet Eddaïer"), Z(2, "El Ain", GouvernoratTunisie.Sfax, "Sfax Sud"),
                Z(2, "Thyna", GouvernoratTunisie.Sfax, "Thyna"),
                Z(3, "Sousse Ville", GouvernoratTunisie.Sousse, "Sousse Médina"), Z(3, "Hammam Sousse", GouvernoratTunisie.Sousse, "Hammam Sousse"),
                Z(3, "Akouda", GouvernoratTunisie.Sousse, "Akouda"), Z(3, "Msaken", GouvernoratTunisie.Sousse, "M'saken"),
                Z(4, "Nabeul Ville", GouvernoratTunisie.Nabeul, "Nabeul"), Z(4, "Hammamet", GouvernoratTunisie.Nabeul, "Hammamet"),
                Z(4, "Korba", GouvernoratTunisie.Nabeul, "Korba"), Z(4, "Menzel Temime", GouvernoratTunisie.Nabeul, "Menzel Temime"),
                Z(5, "Bizerte Ville", GouvernoratTunisie.Bizerte, "Bizerte Nord"), Z(5, "Menzel Jemil", GouvernoratTunisie.Bizerte, "Menzel Jemil"),
                Z(5, "Mateur", GouvernoratTunisie.Bizerte, "Mateur"), Z(5, "Ras Jebel", GouvernoratTunisie.Bizerte, "Ras Jebel"),
                Z(6, "Monastir Ville", GouvernoratTunisie.Monastir, "Monastir"), Z(6, "Ksar Hellal", GouvernoratTunisie.Monastir, "Ksar Hellal"),
                Z(6, "Moknine", GouvernoratTunisie.Monastir, "Moknine"), Z(6, "Jemmal", GouvernoratTunisie.Monastir, "Jemmal"),
                Z(7, "Gabès Ville", GouvernoratTunisie.Gabes, "Gabès Médina"), Z(7, "Métouia", GouvernoratTunisie.Gabes, "Métouia"),
                Z(7, "Mareth", GouvernoratTunisie.Gabes, "Mareth-Dkhila"), Z(7, "Ghannouch", GouvernoratTunisie.Gabes, "Ghannouch"),
                Z(8, "Kairouan Ville", GouvernoratTunisie.Kairouan, "Kairouan Nord"), Z(8, "Sbikha", GouvernoratTunisie.Kairouan, "Sbikha"),
                Z(8, "Hajeb El Ayoun", GouvernoratTunisie.Kairouan, "Hajeb El Ayoun"), Z(8, "Bou Hajla", GouvernoratTunisie.Kairouan, "Bou Hajla"),
                Z(9, "Médenine Ville", GouvernoratTunisie.Medenine, "Médenine Nord"), Z(9, "Djerba Houmt Souk", GouvernoratTunisie.Medenine, "Djerba - Houmt Souk"),
                Z(9, "Djerba Midoun", GouvernoratTunisie.Medenine, "Djerba - Midoun"), Z(9, "Zarzis", GouvernoratTunisie.Medenine, "Zarzis"),
            };

            foreach (var zone in zones)
            {
                _db.F_DEPOT_ZONES.Add(new F_DEPOT_ZONE
                {
                    DepotNo = zone.DepotNo,
                    Gouvernorat = zone.Gouvernorat.ToString(),
                    Delegation = zone.Delegation,
                    IsPrimary = depots.First(d => d.No == zone.DepotNo).Delegation == zone.Delegation,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Zones = zones.Count;
            return zones;

            static ZoneSeed Z(int depotNo, string label, GouvernoratTunisie gouvernorat, string delegation) =>
                new(depotNo, label, gouvernorat, delegation);
        }

        private async Task<UserSeedResult> SeedUsersAsync(
            List<DepotSeed> depots,
            List<ZoneSeed> zones,
            RealisticSeedReport report,
            CancellationToken ct)
        {
            var specs = BuildUserSpecs(depots);
            var result = new UserSeedResult();

            foreach (var spec in specs)
            {
                var user = new ApplicationUser
                {
                    UserName = spec.Email,
                    Email = spec.Email,
                    EmailConfirmed = true,
                    PhoneNumber = spec.Phone,
                    PhoneNumberConfirmed = true
                };

                var create = await _userManager.CreateAsync(user, CommonPassword);
                EnsureIdentitySuccess(create, $"Creation utilisateur {spec.Email}");

                var addRole = await _userManager.AddToRoleAsync(user, spec.Role);
                EnsureIdentitySuccess(addRole, $"Affectation role {spec.Role} a {spec.Email}");

                var profile = new ProfilUtilisateur
                {
                    UtilisateurId = user.Id,
                    TypeProfil = spec.IsClient ? TypeProfil.Client : TypeProfil.Employe,
                    TypeClient = spec.ClientType,
                    NomComplet = spec.FullName,
                    Telephone = spec.Phone,
                    CIN = spec.IsClient ? null : BuildCin(spec.Sequence),
                    DateNaissance = spec.IsClient ? DateTime.UtcNow.Date.AddYears(-30).AddDays(-spec.Sequence) : null,
                    NomSociete = spec.CompanyName,
                    MatriculeFiscal = spec.MatriculeFiscal,
                    RegistreCommerce = spec.ClientType == TypeClient.B2B ? $"B{spec.Sequence:000000}" : null,
                    NumeroTVA = spec.ClientType == TypeClient.B2B ? $"TVA{spec.Sequence:000000}" : null,
                    Remise = spec.ClientType == TypeClient.B2B ? spec.DiscountPercent : null,
                    DiscountPercent = spec.ClientType == TypeClient.B2B ? spec.DiscountPercent : null,
                    PlafondCredit = spec.ClientType == TypeClient.B2B ? spec.CreditLimit : null,
                    Gouvernorat = spec.Gouvernorat,
                    Delegation = spec.Delegation,
                    Adresse = spec.Address,
                    AdresseComplementaire = spec.AddressComplement,
                    CodePostal = spec.PostalCode,
                    Pays = "Tunisie",
                    Latitude = spec.Lat,
                    Longitude = spec.Lng,
                    CodeEmploye = spec.EmployeeCode,
                    Departement = spec.Department,
                    Poste = spec.Position,
                    CodeDepot = spec.Depot?.Code,
                    ZoneLivraison = spec.Delegation,
                    IsTransit = spec.IsTransit,
                    DepotRattacheNo = spec.Depot?.No,
                    CodeClientSage = spec.ClientCode,
                    EstSynchroniseAvecSage = true,
                    DateDerniereSynchronisation = DateTime.UtcNow.AddDays(-1),
                    DateCreation = DateTime.UtcNow,
                    DateModification = DateTime.UtcNow,
                    ContactPreference = spec.Sequence % 5 == 0 ? "SmsOnly" : "Both"
                };

                _db.ProfilsUtilisateurs.Add(profile);
                await _db.SaveChangesAsync(ct);

                result.AllUsers.Add(new SeededUser(spec, user, profile));
                result.Accounts.Add(new TestAccountRow(
                    spec.AccountRole,
                    spec.DisplayName,
                    spec.Email,
                    CommonPassword,
                    spec.City,
                    spec.Depot?.Name ?? "-",
                    spec.Remark));
            }

            var adminId = result.AllUsers.First(x => x.Spec.Role == AppRoles.ADMIN).User.Id;
            foreach (var livreur in result.AllUsers.Where(x => x.Spec.Role == AppRoles.LIVREUR && !x.Spec.IsTransit))
            {
                var livreurZones = zones.Where(z => z.DepotNo == livreur.Spec.Depot?.No).Take(4).ToList();
                foreach (var zone in livreurZones)
                {
                    _db.F_LIVREUR_ZONES.Add(new F_LIVREUR_ZONE
                    {
                        LivreurUserId = livreur.User.Id,
                        Gouvernorat = zone.Gouvernorat.ToString(),
                        Delegation = zone.Delegation,
                        AssignedByUserId = adminId,
                        AssignedAt = DateTime.UtcNow
                    });
                }
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Users = result.AllUsers.Count;
            report.Counts.LivreurZones = await _db.F_LIVREUR_ZONES.CountAsync(ct);
            report.Accounts = result.Accounts;
            return result;
        }

        private List<UserSpec> BuildUserSpecs(List<DepotSeed> depots)
        {
            var specs = new List<UserSpec>();
            var seq = 1;
            var tun = depots.First(x => x.Code == "DEP-TUN");
            var sfx = depots.First(x => x.Code == "DEP-SFX");

            specs.Add(Employee("ADMIN", "Nour Ben Salem", "NourBenSalem@admin.tn", AppRoles.ADMIN, tun, "Tunis", GouvernoratTunisie.Tunis, "Médina", "Administrateur principal", "Admin principal", seq++));
            specs.Add(Employee("ADMIN", "Leila Bouaziz", "LeilaBouaziz@admin.tn", AppRoles.ADMIN, tun, "Tunis", GouvernoratTunisie.Tunis, "El Menzah", "Administratrice backoffice", "Admin backoffice", seq++));

            specs.Add(Employee("SUPERVISEUR", "Sami Ben Youssef", "SamiBenYoussef@superviseur.tn", AppRoles.SUPERVISEUR, tun, "Tunis", GouvernoratTunisie.Tunis, "Médina", "Superviseur dépôt central", "Superviseur", seq++));
            specs.Add(Employee("SUPERVISEUR", "Rim Jaziri", "RimJaziri@superviseur.tn", AppRoles.SUPERVISEUR, depots[2], "Sousse", GouvernoratTunisie.Sousse, "Sousse Médina", "Superviseure Sahel", "Superviseur", seq++));
            specs.Add(Employee("SUPERVISEUR", "Walid Cherif", "WalidCherif@superviseur.tn", AppRoles.SUPERVISEUR, depots[6], "Gabès", GouvernoratTunisie.Gabes, "Gabès Médina", "Superviseur Sud", "Superviseur", seq++));

            specs.Add(Employee("VENDEUR", "Yassine Trabelsi", "YassineTrabelsi@vendeur.tn", AppRoles.VENDEUR, sfx, "Sfax", GouvernoratTunisie.Sfax, "Sfax Ville", "Vendeur Sfax", "Vendeur", seq++));
            specs.AddRange(new[]
            {
                Employee("VENDEUR", "Mehdi Ayari", "MehdiAyari@vendeur.tn", AppRoles.VENDEUR, tun, "Tunis", GouvernoratTunisie.Tunis, "La Marsa", "Vendeur grands comptes", "Vendeur", seq++),
                Employee("VENDEUR", "Houssem Krichen", "HoussemKrichen@vendeur.tn", AppRoles.VENDEUR, depots[2], "Sousse", GouvernoratTunisie.Sousse, "Hammam Sousse", "Vendeur retail", "Vendeur", seq++),
                Employee("VENDEUR", "Mouna Bahri", "MounaBahri@vendeur.tn", AppRoles.VENDEUR, depots[3], "Nabeul", GouvernoratTunisie.Nabeul, "Nabeul", "Vendeuse showroom", "Vendeur", seq++),
                Employee("VENDEUR", "Anis Mbarek", "AnisMbarek@vendeur.tn", AppRoles.VENDEUR, depots[4], "Bizerte", GouvernoratTunisie.Bizerte, "Bizerte Nord", "Vendeur régional", "Vendeur", seq++),
                Employee("VENDEUR", "Sarra Gharbi", "SarraGharbi@vendeur.tn", AppRoles.VENDEUR, depots[5], "Monastir", GouvernoratTunisie.Monastir, "Monastir", "Vendeuse B2B", "Vendeur", seq++)
            });

            specs.Add(Employee("CONFIRMATEUR", "Amira Kallel", "AmiraKallel@confirmatrice.tn", AppRoles.CONFIRMATEUR, null, "Sfax", GouvernoratTunisie.Sfax, "Sfax Ville", "Confirmatrice commandes", "Confirmatrice commandes", seq++));
            specs.AddRange(new[]
            {
                Employee("CONFIRMATEUR", "Ines Maaloul", "InesMaaloul@confirmatrice.tn", AppRoles.CONFIRMATEUR, null, "Tunis", GouvernoratTunisie.Tunis, "El Menzah", "Confirmatrice devis", "Confirmatrice", seq++),
                Employee("CONFIRMATEUR", "Farah Dridi", "FarahDridi@confirmatrice.tn", AppRoles.CONFIRMATEUR, null, "Sousse", GouvernoratTunisie.Sousse, "Sousse Médina", "Confirmatrice SAV", "Confirmatrice", seq++),
                Employee("CONFIRMATEUR", "Nadia Toumi", "NadiaToumi@confirmatrice.tn", AppRoles.CONFIRMATEUR, null, "Nabeul", GouvernoratTunisie.Nabeul, "Hammamet", "Confirmatrice appels", "Confirmatrice", seq++),
                Employee("CONFIRMATEUR", "Salma Feki", "SalmaFeki@confirmatrice.tn", AppRoles.CONFIRMATEUR, null, "Bizerte", GouvernoratTunisie.Bizerte, "Menzel Jemil", "Confirmatrice livraison", "Confirmatrice", seq++),
                Employee("CONFIRMATEUR", "Amina Saidi", "AminaSaidi@confirmatrice.tn", AppRoles.CONFIRMATEUR, null, "Gabès", GouvernoratTunisie.Gabes, "Gabès Médina", "Confirmatrice Sud", "Confirmatrice", seq++)
            });

            specs.Add(Employee("LIVREUR", "Ahmed Mansour", "AhmedMansour@livreur.tn", AppRoles.LIVREUR, sfx, "Sfax", GouvernoratTunisie.Sfax, "Sfax Ville", "Livreur normal", "Livreur normal", seq++));
            var livreurNames = new[]
            {
                ("Slim Rekik", "Tunis", GouvernoratTunisie.Tunis, "La Marsa", tun),
                ("Tarek Hammami", "Sousse", GouvernoratTunisie.Sousse, "Hammam Sousse", depots[2]),
                ("Fares Baccouche", "Nabeul", GouvernoratTunisie.Nabeul, "Hammamet", depots[3]),
                ("Omar Chebbi", "Bizerte", GouvernoratTunisie.Bizerte, "Menzel Jemil", depots[4]),
                ("Marwen Dhahri", "Monastir", GouvernoratTunisie.Monastir, "Ksar Hellal", depots[5]),
                ("Ghazi Bouslama", "Gabès", GouvernoratTunisie.Gabes, "Métouia", depots[6]),
                ("Foued Jlassi", "Kairouan", GouvernoratTunisie.Kairouan, "Kairouan Nord", depots[7]),
                ("Bilel Abid", "Médenine", GouvernoratTunisie.Medenine, "Djerba - Houmt Souk", depots[8]),
                ("Khaled Frikha", "Sfax", GouvernoratTunisie.Sfax, "Sakiet Ezzit", sfx),
                ("Sofiane Lahmar", "Sousse", GouvernoratTunisie.Sousse, "Akouda", depots[2]),
                ("Moez Mejri", "Tunis", GouvernoratTunisie.Tunis, "Le Bardo", tun),
            };
            foreach (var (name, city, gov, delegation, depot) in livreurNames)
                specs.Add(Employee("LIVREUR", name, $"{EmailLocal(name)}@livreur.tn", AppRoles.LIVREUR, depot, city, gov, delegation, "Livreur normal", "Livreur normal", seq++));

            specs.Add(Employee("LIVREUR_TRANSIT", "Karim Gharbi", "KarimGharbi@livreurTransit.tn", AppRoles.LIVREUR, tun, "Tunis", GouvernoratTunisie.Tunis, "Médina", "IsTransit = true", "Livreur transit", seq++, isTransit: true));
            specs.Add(Employee("LIVREUR_TRANSIT", "Oussama Khedhiri", "OussamaKhedhiri@livreurTransit.tn", AppRoles.LIVREUR, sfx, "Sfax", GouvernoratTunisie.Sfax, "Sfax Ville", "IsTransit = true", "Livreur transit", seq++, isTransit: true));
            specs.Add(Employee("LIVREUR_TRANSIT", "Nizar Mokni", "NizarMokni@livreurTransit.tn", AppRoles.LIVREUR, depots[2], "Sousse", GouvernoratTunisie.Sousse, "Sousse Médina", "IsTransit = true", "Livreur transit", seq++, isTransit: true));

            specs.Add(Client("CLIENT_B2C", "Moncef Yangui", "MoncefYangui@ClientB2C.tn", "Sfax", GouvernoratTunisie.Sfax, "Sfax Ville", "Route de Tunis km 4, Sfax 3021", TypeClient.B2C, "CLT-B2C-001", "Client particulier", seq++));
            specs.Add(Client("CLIENT_B2B", "Tech Distribution Sfax", "TechDistributionSfax@ClientB2B.tn", "Sfax", GouvernoratTunisie.Sfax, "Sfax Ville", "Zone industrielle Poudrière 1, Sfax 3002", TypeClient.B2B, "CLT-B2B-001", "Client professionnel B2B", seq++, "Hatem Frikha", 10, 85000m));

            var b2cNames = new[]
            {
                "Ali Ben Amor","Sonia Chatti","Mourad Sellami","Asma Khouaja","Rached Beldi","Nesrine Jebali","Lotfi Dhouib","Mariem Kanzari",
                "Haythem Mzoughi","Ikram Sassi","Fathi Oueslati","Chaima Ben Hassen","Zied Bouhlel","Olfa Triki","Taha Karray","Hela Masmoudi",
                "Nabil Kouki","Rania Jmal","Aymen Gdoura","Wafa Briki","Seifeddine Hachicha","Meriem Dhif","Maher Guesmi","Yosra Ben Fredj",
                "Saber Fourati","Emna Makni","Kais Zouari","Nourhene Miled","Hichem Mnif","Dorsaf Turki","Mohamed Amine Bahloul","Latifa Mami",
                "Anouar Gargouri","Marwa Ben Romdhane","Sofiene Boughanmi","Maha Derbel","Hamza Bouzid","Rihab Kacem","Wassim Frikha","Nada Hamdi",
                "Jalel Ayed","Amani Kallel","Bassem Guermazi","Eya Mechergui","Firas Heni","Lina Ben Salah","Tarek Zribi","Syrine Louati",
                "Adel Baccar","Molka Cherif","Khalil Ben Aissa","Yasmine Ferjani","Oussama Mami","Salma Ben Ali","Walid Chouchane","Khaoula Jelassi",
                "Rami Touati","Ines Abassi","Skander Lahouel"
            };
            var cityCycle = depots.Select(d => (d.City, d.Gouvernorat, d.Delegation)).ToArray();
            for (var i = 0; i < 59; i++)
            {
                var c = cityCycle[i % cityCycle.Length];
                var code = $"CLT-B2C-{i + 2:000}";
                specs.Add(Client("CLIENT_B2C", b2cNames[i], $"{EmailLocal(b2cNames[i])}@ClientB2C.tn", c.City, c.Gouvernorat, c.Delegation, $"Rue {i + 10} {c.City} {1000 + i}", TypeClient.B2C, code, "Client particulier", seq++));
            }

            var b2bCompanies = new[]
            {
                "Data Plus Tunis","Smart Office Sousse","Global Print Nabeul","Nord Informatique Bizerte","Sahel Connect Monastir","Sud Telecom Gabès",
                "Kairouan Business IT","Djerba Digital Services","Ariana Pro Market","Ben Arous Distribution","Sfax Electro Pro","Med Retail Group",
                "Hammamet Hospitality Tech","Menzel Jemil Services","Monastir Medical IT","Gabès Industrie Connect","Kairouan EduTech","Djerba Hotels Supply",
                "Tunis Network Solutions","Sousse Gaming Arena","Sfax Factory Systems","Nabeul Security Store","Bizerte Port Services","Médenine Commerce Tech"
            };
            for (var i = 0; i < 24; i++)
            {
                var c = cityCycle[(i + 1) % cityCycle.Length];
                var company = b2bCompanies[i];
                specs.Add(Client("CLIENT_B2B", company, $"{EmailLocal(company)}@ClientB2B.tn", c.City, c.Gouvernorat, c.Delegation, $"Zone industrielle {c.City} lot {i + 1}", TypeClient.B2B, $"CLT-B2B-{i + 2:000}", "Client professionnel B2B", seq++, $"Responsable {i + 2:00}", 5 + (i % 4) * 5, 35000m + (i * 2500m)));
            }

            return specs;
        }

        private UserSpec Employee(
            string accountRole,
            string fullName,
            string email,
            string role,
            DepotSeed? depot,
            string city,
            GouvernoratTunisie gouvernorat,
            string delegation,
            string remark,
            string position,
            int seq,
            bool isTransit = false)
        {
            return new UserSpec(
                accountRole, fullName, email, role, city, gouvernorat, delegation,
                depot == null ? $"Siège opérationnel {city}" : depot.Address,
                depot?.PostalCode ?? PostalCodeFor(gouvernorat),
                Phone(seq), seq, depot, false, null, null, null, null,
                isTransit, $"EMP-PFE-{seq:000}", "Operations", position, null, null, null,
                depot?.Lat ?? 36.8065m, depot?.Lng ?? 10.1815m, remark);
        }

        private UserSpec Client(
            string accountRole,
            string displayName,
            string email,
            string city,
            GouvernoratTunisie gouvernorat,
            string delegation,
            string address,
            TypeClient typeClient,
            string codeClient,
            string remark,
            int seq,
            string? responsibleName = null,
            int? discount = null,
            decimal? creditLimit = null)
        {
            return new UserSpec(
                accountRole, displayName, email, AppRoles.CLIENT, city, gouvernorat, delegation,
                address, PostalCodeFor(gouvernorat), Phone(seq), seq, null, true, typeClient,
                typeClient == TypeClient.B2B ? displayName : null,
                typeClient == TypeClient.B2B ? BuildMatricule(seq) : null,
                responsibleName,
                false, null, null, null, codeClient, discount, creditLimit,
                LatFor(gouvernorat) + ((seq % 7) * 0.003m), LngFor(gouvernorat) + ((seq % 5) * 0.003m), remark);
        }

        private async Task<CatalogSeedResult> SeedCataloguesAsync(RealisticSeedReport report, CancellationToken ct)
        {
            var departments = new[]
            {
                "Informatique", "Téléphonie", "Accessoires informatiques", "Impression", "Réseau", "Audio",
                "Gaming", "Composants", "Batteries et chargeurs", "Électroménager connecté", "Bureautique", "Sécurité"
            };
            var categoryNames = new[]
            {
                new[] {"Ordinateurs portables","Écrans","Stations de travail","Tablettes"},
                new[] {"Smartphones","Accessoires téléphone","Montres connectées","Téléphones professionnels"},
                new[] {"Souris et claviers","Webcams","Hubs et adaptateurs","Câbles informatiques"},
                new[] {"Imprimantes jet d'encre","Imprimantes laser","Scanners","Consommables"},
                new[] {"Routeurs","Switches","Points d'accès","Câblage réseau"},
                new[] {"Casques","Écouteurs","Enceintes","Microphones"},
                new[] {"PC Gaming","Périphériques gaming","Chaises gaming","Streaming"},
                new[] {"Stockage SSD","Disques externes","Mémoire RAM","Cartes graphiques"},
                new[] {"Chargeurs","Powerbanks","Batteries laptop","Multiprises"},
                new[] {"Objets connectés","Petit électroménager","TV connectées","Maison intelligente"},
                new[] {"Destructeurs","Calculatrices","Étiqueteuses","Fournitures bureau"},
                new[] {"Caméras IP","Alarmes","Contrôle accès","Onduleurs sécurité"}
            };
            var suffixes = new[] {"Standard", "Professionnel"};

            var nextNo = 1000;
            var nodes = new List<CatalogNode>();

            for (var d = 0; d < departments.Length; d++)
            {
                var depNo = nextNo++;
                nodes.Add(new CatalogNode(depNo, 0, departments[d], Code("DEP", d + 1), 0));
                for (var c = 0; c < categoryNames[d].Length; c++)
                {
                    var catNo = nextNo++;
                    var catName = categoryNames[d][c];
                    nodes.Add(new CatalogNode(catNo, depNo, catName, Code("CAT", d + 1, c + 1), 1));
                    for (var s = 0; s < suffixes.Length; s++)
                    {
                        nodes.Add(new CatalogNode(nextNo++, catNo, $"{catName} {suffixes[s]}", Code("SUB", d + 1, c + 1, s + 1), 2));
                    }
                }
            }

            foreach (var node in nodes)
            {
                _db.F_CATALOGUES.Add(new F_CATALOGUE
                {
                    CL_No = node.No,
                    CL_NoParent = node.ParentNo,
                    CL_Intitule = node.Name,
                    CL_Code = node.Code,
                    CL_Niveau = node.Level,
                    CL_Stock = 1
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Catalogues = nodes.Count;
            return new CatalogSeedResult(nodes);
        }

        private async Task<List<ArticleSeed>> SeedArticlesAsync(CatalogSeedResult catalogues, RealisticSeedReport report, CancellationToken ct)
        {
            var subcats = catalogues.Nodes.Where(x => x.Level == 2).ToList();
            var articles = new List<ArticleSeed>();
            var articleNames = BuildArticleNames();
            var usedDesignations = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            for (var i = 0; i < 250; i++)
            {
                var sub = subcats[i % subcats.Count];
                var cat = catalogues.Nodes.First(x => x.No == sub.ParentNo);
                var dep = catalogues.Nodes.First(x => x.No == cat.ParentNo);
                var refCode = $"PFE{i + 1:000000}";
                var name = BuildUniqueArticleName(articleNames[i % articleNames.Count], i, articleNames.Count, usedDesignations);
                var price = PriceFor(name, i);

                var seed = new ArticleSeed(refCode, name, sub.Code, dep.No, cat.No, sub.No, price);
                articles.Add(seed);
                _db.F_ARTICLES.Add(new F_ARTICLE
                {
                    AR_Ref = seed.Ref,
                    AR_Design = Truncate(seed.Name, 180),
                    AR_Description = BuildArticleDescription(seed.Name, dep.Name, cat.Name),
                    FA_CodeFamille = seed.FamilyCode,
                    AR_UniteVen = 1,
                    AR_PrixVen = seed.Price,
                    AR_PrixTTC = 1,
                    AR_SuiviStock = 1,
                    AR_Sommeil = i % 47 == 0 ? (short)1 : (short)0,
                    AR_CodeBarre = $"619{(1000000000 + i):0000000000}",
                    AR_Publie = 1,
                    CL_No1 = seed.DepartmentNo,
                    CL_No2 = seed.CategoryNo,
                    CL_No3 = seed.SubCategoryNo,
                    CL_No4 = 0,
                    AR_Type = 0
                });

                _db.F_ARTICLE_IMAGES.Add(new F_ARTICLE_IMAGE
                {
                    AR_Ref = seed.Ref,
                    Url = $"https://picsum.photos/seed/{seed.Ref}/900/700",
                    IsMain = true,
                    SortOrder = 1,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Articles = articles.Count;
            report.Counts.ArticleImages = articles.Count;
            return articles;
        }

        private static List<string> BuildArticleNames()
        {
            var names = new List<string>();
            void Add(string brand, params string[] models)
            {
                names.AddRange(models.Select(model => $"{brand} {model}"));
            }

            Add("Samsung", "Galaxy A15 128Go", "Galaxy A25 256Go", "Galaxy S24 256Go", "Galaxy Tab A9", "Écran ViewFinity 24 pouces", "Écran Odyssey G5 27 pouces", "Écouteurs Galaxy Buds FE", "SSD 990 EVO 1To");
            Add("Apple", "iPhone 13 128Go", "iPhone 15 128Go", "iPhone 15 Pro 256Go", "MacBook Air M2 13 pouces", "AirPods 3", "Chargeur USB-C 20W", "Câble USB-C tressé");
            Add("Xiaomi", "Redmi Note 13 256Go", "Redmi 13C 128Go", "Poco X6 Pro", "Powerbank 20000mAh", "Chargeur rapide 67W");
            Add("Oppo", "A58 128Go", "Reno 11F 256Go", "A78 256Go");
            Add("Infinix", "Hot 40 Pro", "Note 30 256Go", "Smart 8 Plus");
            Add("HP", "Laptop 15 i5 13e Gen", "ProBook 450 G10", "EliteBook 840 G10", "LaserJet Pro M404dn", "DeskJet 2710");
            Add("Lenovo", "ThinkPad E14", "IdeaPad Slim 3", "ThinkBook 15 G4", "Tab M10 Plus");
            Add("ASUS", "Vivobook 15 OLED", "TUF Gaming F15", "Zenbook 14", "ROG Strix G16");
            Add("Dell", "Latitude 5440", "Inspiron 15", "OptiPlex Micro", "Écran P2422H", "Écran UltraSharp 27");
            Add("Epson", "EcoTank L3250", "EcoTank L6270", "WorkForce WF-2930", "Scanner V39");
            Add("Canon", "PIXMA G3410", "i-SENSYS MF3010", "MAXIFY GX6040");
            Add("Brother", "DCP-L2530DW", "HL-L2350DW", "MFC-L2710DW");
            Add("Logitech", "Souris M185", "Souris MX Master 3S", "Clavier K380", "Clavier MX Keys", "Webcam C920 HD");
            Add("JBL", "Casque Tune 520BT", "Enceinte Flip 6", "Écouteurs Wave Beam");
            Add("Kingston", "SSD NV2 500Go", "SSD NV2 1To", "RAM DDR4 16Go", "Clé USB DataTraveler 128Go");
            Add("Seagate", "Expansion 1To", "Expansion 2To", "One Touch 4To");
            Add("WD", "Elements 1To", "Elements 2To", "My Passport 4To");
            Add("TP-Link", "Routeur Archer C6", "Routeur AX23", "Répéteur RE305", "Adaptateur USB WiFi AC1300");
            Add("D-Link", "Switch 8 ports Gigabit", "Switch 24 ports", "Routeur DIR-825");
            Add("Ubiquiti", "UniFi AP AC Lite", "UniFi U6+", "Switch Flex Mini");
            Add("AOC", "Écran 24B2XH", "Écran Gaming 27G2SP");
            Add("LG", "Écran 24MP400", "Écran UltraGear 27GN800");
            Add("Mercusys", "Routeur AC12G", "Switch MS108G");
            Add("Nedis", "Câble HDMI 2m", "Câble RJ45 Cat6 5m", "Câble USB-C 1m");
            Add("Trust", "Micro GXT 232", "Casque Gaming GXT 488", "Tapis souris XL");
            Add("Razer", "Souris DeathAdder Essential", "Clavier Cynosa Lite", "Casque BlackShark V2 X");
            Add("APC", "Onduleur Back-UPS 650VA", "Onduleur Easy UPS 1200VA");
            Add("Hikvision", "Caméra IP Dome 2MP", "NVR 8 canaux", "Kit alarme AX Pro");
            Add("Xerox", "Papier A4 80g carton", "Toner compatible bureau", "Destructeur coupe croisée");
            return names;
        }

        private static string BuildUniqueArticleName(
            string baseName,
            int index,
            int baseCount,
            HashSet<string> usedDesignations)
        {
            var variantRound = index / baseCount;
            var candidate = variantRound == 0
                ? baseName
                : $"{baseName} {ArticleVariantSuffix(index, variantRound)}";

            var serial = 1;
            while (!usedDesignations.Add(candidate))
            {
                candidate = $"{baseName} Pack Pro {serial:00}";
                serial++;
            }

            return candidate;
        }

        private static string ArticleVariantSuffix(int index, int variantRound)
        {
            var colors = new[] { "Noir", "Blanc", "Graphite", "Silver", "Bleu", "Rouge", "Vert", "Or" };
            var editions = new[] { "Pack bureau", "Pack pro", "Pack gaming", "Garantie 2 ans", "Edition showroom", "Bundle accessoires" };

            return variantRound % 2 == 1
                ? colors[index % colors.Length]
                : editions[index % editions.Length];
        }

        private async Task SeedStocksAsync(List<ArticleSeed> articles, List<DepotSeed> depots, RealisticSeedReport report, CancellationToken ct)
        {
            for (var i = 0; i < articles.Count; i++)
            {
                var article = articles[i];
                foreach (var depot in depots)
                {
                    var pattern = i % 10;
                    var qty = pattern switch
                    {
                        0 => depot.No == 1 ? 0 : 0,
                        1 => depot.No is 1 or 2 ? 3 + depot.No : 0,
                        2 => depot.No is 3 or 6 ? 25 + depot.No : 0,
                        3 => depot.No is 7 or 8 or 9 ? 18 + depot.No : 0,
                        4 => depot.No == 1 ? 120 : 8,
                        _ => 15 + ((i + depot.No) % 80)
                    };
                    var reserved = qty <= 0 ? 0 : Math.Min(qty - 1, (i + depot.No) % 7);

                    _db.F_ARTSTOCKS.Add(new F_ARTSTOCK
                    {
                        AR_Ref = article.Ref,
                        DE_No = depot.No,
                        AS_QteSto = qty,
                        AS_QteRes = reserved,
                        AS_QteMini = 5,
                        AS_QteMaxi = 180,
                        AS_Principal = depot.IsPrincipal ? (short)1 : (short)0
                    });
                }
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Stocks = articles.Count * depots.Count;
        }

        private async Task SeedHomepageAsync(ArticleSeed[] articles, CatalogSeedResult catalogues, UserSeedResult users, RealisticSeedReport report, CancellationToken ct)
            => await SeedHomepageAsync(articles.ToList(), catalogues, users, report, ct);

        private async Task SeedHomepageAsync(List<ArticleSeed> articles, CatalogSeedResult catalogues, UserSeedResult users, RealisticSeedReport report, CancellationToken ct)
        {
            var adminId = users.Admins.First().User.Id;
            var featured = articles.Take(12).Select(a => a.Ref).ToArray();
            var departments = catalogues.Nodes.Where(x => x.Level == 0).Take(8).Select(x => new { x.No, x.Name }).ToArray();
            var payload = JsonSerializer.Serialize(new
            {
                sections = new object[]
                {
                    new { type = "heroCarousel", title = "Catalogue professionnel PFE", items = featured.Take(4) },
                    new { type = "featuredCatalogues", title = "Rayons populaires", items = departments },
                    new { type = "featuredProducts", title = "Produits mis en avant", items = featured },
                    new { type = "contact", title = "Assistance commerciale", phone = "71 000 000" }
                },
                theme = new { primaryColor = "#2563EB", mode = "auto" }
            });

            _db.HOMEPAGES.Add(new CMS_HOMEPAGE
            {
                Scope = "DEFAULT",
                DraftJson = payload,
                PublishedJson = payload,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow,
                UpdatedByUserId = adminId,
                PublishedByUserId = adminId
            });

            _db.HomepageTemplates.Add(new HomepageTemplate
            {
                Name = "PFE Démo réaliste",
                IsActive = true,
                BlocksJson = payload,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedByAdminId = adminId
            });

            await _db.SaveChangesAsync(ct);
            await _db.Database.ExecuteSqlInterpolatedAsync($"""
                SET IDENTITY_INSERT [F_APP_CONFIG] ON;
                IF NOT EXISTS (SELECT 1 FROM [F_APP_CONFIG] WHERE [Id] = 1)
                    INSERT INTO [F_APP_CONFIG] ([Id], [PrimaryColor], [ThemeMode], [UpdatedAt], [UpdatedByUserId])
                    VALUES (1, N'#2563EB', N'auto', SYSUTCDATETIME(), {adminId});
                SET IDENTITY_INSERT [F_APP_CONFIG] OFF;
                """, ct);
            report.Counts.Homepages = 1;
            report.Counts.HomepageTemplates = 1;
        }

        private async Task<List<F_DEVIS_ENTETE>> SeedDevisAsync(UserSeedResult users, List<ArticleSeed> articles, RealisticSeedReport report, CancellationToken ct)
        {
            var b2bClients = users.ClientsB2B.ToList();
            var confirmateurs = users.Confirmateurs.ToList();
            var devisList = new List<F_DEVIS_ENTETE>();
            var statuses = new[]
            {
                F_DEVIS_ENTETE.STATUS_SOUMIS, F_DEVIS_ENTETE.STATUS_EN_ETUDE, F_DEVIS_ENTETE.STATUS_VALIDE,
                F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT, F_DEVIS_ENTETE.STATUS_ACCEPTE_CLIENT,
                F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT, F_DEVIS_ENTETE.STATUS_EXPIRE, F_DEVIS_ENTETE.STATUS_CONVERTI_BC
            };

            for (var i = 0; i < 80; i++)
            {
                var client = b2bClients[i % b2bClients.Count];
                var confirmateur = confirmateurs[i % confirmateurs.Count];
                var status = statuses[i % statuses.Length];
                var lines = PickArticles(articles, i, 2 + (i % 3));
                var totalHt = lines.Sum(x => x.Article.Price * x.Qty);
                var discountRate = client.Profile.DiscountPercent ?? client.Profile.Remise ?? 0;
                var discountAmount = Math.Round(totalHt * discountRate / 100m, 3);
                var net = totalHt - discountAmount;
                var totalTtc = Math.Round(net * (1 + TvaRate), 3);
                var devis = new F_DEVIS_ENTETE
                {
                    DevisPiece = $"DV-PFE-{i + 1:0000}",
                    ClientUserId = client.User.Id,
                    ClientCode = client.Profile.CodeClientSage,
                    ClientType = "B2B",
                    StatusKey = status,
                    TotalHT = totalHt,
                    DiscountPercentSnapshot = discountRate,
                    DiscountAmount = discountAmount,
                    TotalHTNet = net,
                    TotalTTC = totalTtc,
                    NetAPayer = totalTtc,
                    ValidUntil = DateTime.UtcNow.AddDays((i % 8 == 6) ? -2 : 20),
                    AssignedConfirmateurId = confirmateur.User.Id,
                    BcPiece = status == F_DEVIS_ENTETE.STATUS_CONVERTI_BC ? $"BCPFE{i + 1:000000}" : null,
                    CreatedAt = DateTime.UtcNow.AddDays(-40 + i % 35),
                    UpdatedAt = DateTime.UtcNow.AddDays(-10 + i % 10),
                    CreatedByUserId = i % 4 == 0 ? client.User.Id : users.Vendeurs[i % users.Vendeurs.Count].User.Id,
                    Version = 1
                };

                var sort = 1;
                foreach (var (article, qty) in lines)
                {
                    var amount = article.Price * qty;
                    devis.Lignes.Add(new F_DEVIS_LIGNE
                    {
                        ArticleRef = article.Ref,
                        Designation = article.Name,
                        Qty = qty,
                        UnitPriceHT = article.Price,
                        DiscountLinePercent = i % 5 == 0 ? 3 : null,
                        AmountHT = amount,
                        AmountTTC = Math.Round(amount * (1 + TvaRate), 3),
                        SortOrder = sort++
                    });
                }

                devis.Events.Add(new F_DEVIS_EVENT
                {
                    AuthorUserId = devis.CreatedByUserId,
                    AuthorRole = i % 4 == 0 ? AppRoles.CLIENT : AppRoles.VENDEUR,
                    EventType = F_DEVIS_EVENT.TYPE_STATUS_CHANGE,
                    NewStatus = status,
                    Message = $"Devis réaliste généré pour scénario {status}.",
                    IsPublic = true,
                    CreatedAt = devis.CreatedAt
                });

                devisList.Add(devis);
                _db.F_DEVIS_ENTETES.Add(devis);
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Devis = devisList.Count;
            report.Counts.DevisLignes = devisList.Sum(x => x.Lignes.Count);
            return devisList;
        }

        private async Task<List<OrderSeed>> SeedCommandesAsync(
            UserSeedResult users,
            List<ArticleSeed> articles,
            List<DepotSeed> depots,
            RealisticSeedReport report,
            CancellationToken ct)
        {
            var clients = users.Clients.ToList();
            var orders = new List<OrderSeed>();

            for (var i = 0; i < 220; i++)
            {
                var client = clients[i % clients.Count];
                var depot = depots[i % depots.Count];
                var vendeur = users.Vendeurs[i % users.Vendeurs.Count];
                var confirmateur = users.Confirmateurs[i % users.Confirmateurs.Count];
                var livreur = users.LivreursNormaux[i % users.LivreursNormaux.Count];
                var lineCount = 3 + (i % 5 == 0 ? 2 : i % 3 == 0 ? 1 : 0);
                var lines = PickArticles(articles, i * 2, lineCount);
                var totalHt = lines.Sum(x => x.Article.Price * x.Qty);
                var discountRate = client.Profile.TypeClient == TypeClient.B2B ? client.Profile.DiscountPercent ?? 0m : 0m;
                var discountAmount = Math.Round(totalHt * discountRate / 100m, 3);
                var totalHtNet = totalHt - discountAmount;
                var totalTtc = Math.Round(totalHtNet * (1 + TvaRate), 3);
                var deliveryFee = i % 6 == 0 ? 0 : AppSettingsService.DefaultDeliveryFeeHome + (i % 5);
                var stamp = 1m;
                var status = (short)(i % 11 switch
                {
                    0 => F_DOCENTETE.STATUS_EN_ATTENTE,
                    1 => F_DOCENTETE.STATUS_TENTATIVE,
                    2 => F_DOCENTETE.STATUS_REFUSE,
                    _ => F_DOCENTETE.STATUS_CONFIRME
                });
                var piece = $"BCPFE{i + 1:000000}";

                var entete = new F_DOCENTETE
                {
                    DO_Domaine = 0,
                    DO_Type = F_DOCENTETE.DOC_TYPE_BC,
                    DO_Date = DateTime.UtcNow.Date.AddDays(-75 + (i % 75)),
                    DO_Ref = $"WEB-{i + 1:000000}",
                    DO_Tiers = client.Profile.CodeClientSage,
                    DE_No = depot.No,
                    CT_NumPayeur = client.Profile.CodeClientSage,
                    DO_TotalHT = totalHt,
                    DO_TotalHTNet = totalHtNet,
                    DO_TotalTTC = totalTtc,
                    DO_NetAPayer = totalTtc + deliveryFee + stamp,
                    DO_Valide = status,
                    DO_Piece = piece,
                    DO_ModeLivraison = i % 4 == 0 ? "PICKUP" : "HOME",
                    DO_ModePaiement = i % 5 == 0 ? "CARD" : client.Profile.TypeClient == TypeClient.B2B && i % 3 == 0 ? "B2B_CREDIT" : "CASH",
                    DO_FraisLivraison = deliveryFee,
                    DO_TimbreFiscal = stamp,
                    TotalBeforeDiscount = totalHt,
                    B2BDiscountRate = discountRate,
                    B2BDiscountAmount = discountAmount,
                    DiscountSource = discountRate > 0 ? "B2B_PROFILE" : null,
                    DO_AdresseLivraison = Truncate(client.Profile.Adresse, 150),
                    DO_VilleLivraison = client.Spec.City,
                    DO_CodePostalLivraison = client.Profile.CodePostal,
                    DO_LatitudeLivraison = client.Profile.Latitude?.ToString(CultureInfo.InvariantCulture),
                    DO_LongitudeLivraison = client.Profile.Longitude?.ToString(CultureInfo.InvariantCulture),
                    DO_TelephoneLivraison = client.Profile.Telephone,
                    DO_RepereLivraison = $"Repère livraison {client.Spec.City}",
                    DO_InstructionsLivraison = i % 7 == 0 ? "Appeler le client 10 minutes avant arrivée." : null,
                    DO_VendeurUserId = vendeur.User.Id,
                    DO_ClientUserId = client.User.Id,
                    DO_ClientMode = "EXISTING",
                    DeliveryMode = i % 4 == 0 ? "PICKUP_DEPOT" : "HOME_DELIVERY",
                    PickupDepotNo = i % 4 == 0 ? depot.No : null,
                    GeoValidationStatus = "VALID",
                    GeoLat = client.Profile.Latitude,
                    GeoLng = client.Profile.Longitude,
                    AssignedLivreurId = i % 3 == 0 ? livreur.User.Id : null,
                    TypeCommande = i % 29 == 0 ? TypeCommande.ECHANGE : TypeCommande.NORMALE,
                    IsActiveDelivery = i % 37 == 0,
                    cbCreation = DateTime.UtcNow.AddDays(-80 + (i % 75)),
                    cbModification = DateTime.UtcNow.AddDays(-4 + (i % 4))
                };

                _db.F_DOCENTETES.Add(entete);
                foreach (var (article, qty) in lines)
                {
                    var amount = article.Price * qty;
                    _db.F_DOCLIGNES.Add(new F_DOCLIGNE
                    {
                        DO_Domaine = entete.DO_Domaine,
                        DO_Type = entete.DO_Type,
                        DO_Piece = piece,
                        DO_Date = entete.DO_Date,
                        CT_Num = client.Profile.CodeClientSage,
                        AR_Ref = article.Ref,
                        DL_Design = Truncate(article.Name, 69),
                        DL_Qte = qty,
                        DL_PrixUnitaire = article.Price,
                        DL_MontantHT = amount,
                        DL_MontantTTC = Math.Round(amount * (1 + TvaRate), 3),
                        LigneType = LigneTypes.STANDARD,
                        cbCreation = entete.cbCreation,
                        cbModification = entete.cbModification
                    });
                }

                orders.Add(new OrderSeed(piece, entete, client, depot, livreur, lines.Select(x => x.Article).ToList()));
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Commandes = orders.Count;
            report.Counts.LignesCommandes = await _db.F_DOCLIGNES.CountAsync(ct);
            return orders;
        }

        private async Task SeedLivraisonsAsync(List<OrderSeed> orders, UserSeedResult users, List<ZoneSeed> zones, RealisticSeedReport report, CancellationToken ct)
        {
            var statuses = new[]
            {
                DeliveryStatusCodes.Confirme, DeliveryStatusCodes.EnLivraison, DeliveryStatusCodes.Livre,
                DeliveryStatusCodes.Retour, DeliveryStatusCodes.Reporte, DeliveryStatusCodes.Depot,
                DeliveryStatusCodes.DepotEnCoursDePreparation, DeliveryStatusCodes.DepotPret
            };

            foreach (var (order, index) in orders.Take(160).Select((o, i) => (o, i)))
            {
                var livreur = order.Livreur;
                var zone = zones.FirstOrDefault(z => z.DepotNo == order.Depot.No) ?? zones[index % zones.Count];
                var status = statuses[index % statuses.Length];
                var delivered = status == DeliveryStatusCodes.Livre;
                var cash = order.Entete.DO_ModePaiement == "CASH";

                _db.F_LIVRAISONS.Add(new F_LIVRAISON
                {
                    DO_Piece = order.Piece,
                    LI_Adresse = Truncate(order.Entete.DO_AdresseLivraison ?? order.Client.Profile.Adresse ?? "Adresse livraison", 100),
                    LI_Ville = Truncate(zone.Label, 35),
                    LI_CodePostal = order.Entete.DO_CodePostalLivraison,
                    LI_Statut = status,
                    LivreurId = livreur.Profile.cbMarq,
                    LI_DateCreation = order.Entete.DO_Date ?? DateTime.UtcNow,
                    LI_DateLivree = delivered ? (order.Entete.DO_Date ?? DateTime.UtcNow).AddDays(2) : null,
                    LI_DateReplanification = status == DeliveryStatusCodes.Reporte ? DateTime.UtcNow.AddDays(1) : null,
                    LI_Commentaire = delivered ? "Livraison effectuée et confirmée." : $"Statut livraison démo {status}.",
                    LI_Latitude = order.Entete.DO_LatitudeLivraison,
                    LI_Longitude = order.Entete.DO_LongitudeLivraison,
                    LI_PieceSage = $"BL{index + 1:000000}",
                    Encaisse = cash && delivered,
                    EncaisseAt = cash && delivered ? DateTime.UtcNow.AddDays(-index % 20) : null,
                    MontantEncaisse = cash && delivered ? order.Entete.DO_NetAPayer : null,
                    RemisAuDepot = cash && delivered && index % 2 == 0,
                    RemisAuDepotAt = cash && delivered && index % 2 == 0 ? DateTime.UtcNow : null,
                    DepotPassageNumber = index % 4
                });

                _db.F_LIVRAISON_HISTORIQUES.Add(new F_LIVRAISON_HISTORIQUE
                {
                    DoPiece = order.Piece,
                    LivreurUserId = livreur.User.Id,
                    LivreurProfileId = livreur.Profile.cbMarq,
                    Type = delivered ? "LIVRE" : status == DeliveryStatusCodes.EnLivraison ? "START_DELIVERY" : "ASSIGN",
                    Note = "Historique généré par le seed réaliste.",
                    Latitude = order.Client.Profile.Latitude,
                    Longitude = order.Client.Profile.Longitude,
                    DepotPassageNumber = index % 4,
                    Montant = cash ? order.Entete.DO_NetAPayer : null,
                    CreatedAt = DateTime.UtcNow.AddDays(-index % 35)
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Livraisons = await _db.F_LIVRAISONS.CountAsync(ct);
            report.Counts.LivraisonHistoriques = await _db.F_LIVRAISON_HISTORIQUES.CountAsync(ct);
        }

        private async Task SeedTransfertsAsync(List<OrderSeed> orders, UserSeedResult users, List<ArticleSeed> articles, List<DepotSeed> depots, RealisticSeedReport report, CancellationToken ct)
        {
            var axes = new[]
            {
                (1, 2), (1, 3), (1, 4), (2, 7), (3, 6), (1, 9), (2, 8), (5, 1)
            };
            var statuses = new[]
            {
                TransitStatuses.EnAttenteTransit, TransitStatuses.EnTransit, TransitStatuses.EnCoursTransit,
                TransitStatuses.RecuDepotDestine, TransitStatuses.TransitTermine, TransitStatuses.Annule
            };
            var transitLivreurs = users.LivreursTransit.ToList();

            for (var group = 0; group < 45; group++)
            {
                var order = orders[(group * 3) % orders.Count];
                var axis = axes[group % axes.Length];
                for (var line = 0; line < 4; line++)
                {
                    var article = articles[(group * 7 + line) % articles.Count];
                    var status = statuses[(group + line) % statuses.Length];
                    var livreur = transitLivreurs[(group + line) % transitLivreurs.Count];
                    var pickedUp = status is TransitStatuses.EnTransit or TransitStatuses.EnCoursTransit or TransitStatuses.RecuDepotDestine or TransitStatuses.TransitTermine;
                    var delivered = status is TransitStatuses.RecuDepotDestine or TransitStatuses.TransitTermine;
                    var transfert = new F_TRANSFERT
                    {
                        DoPiece = order.Piece,
                        ArRef = article.Ref,
                        Quantite = 1 + (line % 4),
                        SourceDepotNo = axis.Item1,
                        DestinationDepotNo = axis.Item2,
                        TransitLivreurUserId = livreur.User.Id,
                        Status = status,
                        AffectedAt = DateTime.UtcNow.AddDays(-30 + group),
                        PickedUpAt = pickedUp ? DateTime.UtcNow.AddDays(-20 + group) : null,
                        DeliveredAt = delivered ? DateTime.UtcNow.AddDays(-15 + group) : null,
                        PickupGpsLatitude = depots.First(d => d.No == axis.Item1).Lat,
                        PickupGpsLongitude = depots.First(d => d.No == axis.Item1).Lng,
                        DeliveryGpsLatitude = delivered ? depots.First(d => d.No == axis.Item2).Lat : null,
                        DeliveryGpsLongitude = delivered ? depots.First(d => d.No == axis.Item2).Lng : null,
                        AlgoReasoning = $"Transfert démo axe {axis.Item1}->{axis.Item2} pour stock inter-dépôts.",
                        Version = delivered ? 3 : pickedUp ? 2 : 1
                    };
                    _db.F_TRANSFERTS.Add(transfert);
                    _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
                    {
                        TransfertId = transfert.Id,
                        ActionType = "SEED_CREATE",
                        ActorUserId = users.Admins.First().User.Id,
                        SnapshotAfter = JsonSerializer.Serialize(new { transfert.DoPiece, transfert.ArRef, transfert.Status }),
                        Motif = "Seed réaliste PFE.",
                        OccurredAt = transfert.AffectedAt
                    });
                }
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Transferts = await _db.F_TRANSFERTS.CountAsync(ct);
            report.Counts.TransfertAuditLogs = await _db.F_TRANSFERT_AUDIT_LOGS.CountAsync(ct);
        }

        private async Task SeedReclamationsAsync(List<OrderSeed> orders, UserSeedResult users, List<ArticleSeed> articles, RealisticSeedReport report, CancellationToken ct)
        {
            var clientMotifs = ClientMotifs.All;
            var livreurMotifs = LivreurMotifs.All;
            var statuses = ReclamationStatuses.All;
            var types = ReclamationTypes.All;

            for (var i = 0; i < 80; i++)
            {
                var order = orders[(i * 2) % orders.Count];
                var isLivreur = i % 3 == 0;
                var motif = isLivreur ? livreurMotifs[i % livreurMotifs.Length] : clientMotifs[i % clientMotifs.Length];
                var reclamation = new F_RECLAMATION
                {
                    CodeReclamation = $"REC-PFE-{i + 1:000000}",
                    DoPiece = order.Piece,
                    ArRef = order.Articles[i % order.Articles.Count].Ref,
                    IsGlobal = i % 4 == 0,
                    VisibleClient = isLivreur && LivreurMotifs.IsVisibleClient(motif),
                    ClientUserId = order.Client.User.Id,
                    ClientProfileId = order.Client.Profile.cbMarq,
                    AssignedToUserId = users.Confirmateurs[i % users.Confirmateurs.Count].User.Id,
                    CreatedByUserId = isLivreur ? order.Livreur.User.Id : order.Client.User.Id,
                    TypeReclamation = types[i % types.Length],
                    Motif = motif,
                    Description = $"Scénario réclamation réaliste: {motif} sur commande {order.Piece}.",
                    Statut = statuses[i % statuses.Length],
                    Priorite = i % 5 == 0 ? "HIGH" : i % 2 == 0 ? "MEDIUM" : "LOW",
                    Source = isLivreur ? ReclamationSources.LIVREUR : ReclamationSources.CLIENT,
                    TypeCas = isLivreur ? Auth.Constants.TypeCas.DEMANDE : Auth.Constants.TypeCas.RECLAMATION,
                    CorrectionProposee = i % 7 == 0 ? JsonSerializer.Serialize(new { phone = Phone(300 + i), address = $"Adresse corrigée {i}" }) : null,
                    CorrectionAppliquee = i % 11 == 0,
                    TentativesCount = isLivreur ? 1 + (i % 3) : 0,
                    FirstAttemptAt = isLivreur ? DateTime.UtcNow.AddDays(-3) : null,
                    LastAttemptAt = isLivreur ? DateTime.UtcNow.AddDays(-1) : null,
                    ReprogrammationDate = motif == ClientMotifs.REPROGRAMMATION ? DateTime.UtcNow.Date.AddDays(3) : null,
                    ReprogrammationCreneau = motif == ClientMotifs.REPROGRAMMATION ? "MATIN" : null,
                    CreatedAt = DateTime.UtcNow.AddDays(-50 + i),
                    UpdatedAt = DateTime.UtcNow.AddDays(-20 + i % 20),
                    ClosedAt = ReclamationStatuses.IsClosed(statuses[i % statuses.Length]) ? DateTime.UtcNow.AddDays(-1) : null,
                    ResolvedAt = statuses[i % statuses.Length] == ReclamationStatuses.CLOTUREE ? DateTime.UtcNow.AddDays(-1) : null
                };

                _db.F_RECLAMATIONS.Add(reclamation);
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Reclamations = await _db.F_RECLAMATIONS.CountAsync(ct);
        }

        private async Task SeedPaiementsAsync(List<OrderSeed> orders, RealisticSeedReport report, CancellationToken ct)
        {
            var statuses = new[]
            {
                B_PAIEMENT.STATUS_INITIE, B_PAIEMENT.STATUS_EN_ATTENTE, B_PAIEMENT.STATUS_SUCCES,
                B_PAIEMENT.STATUS_ECHEC, B_PAIEMENT.STATUS_ANNULE, B_PAIEMENT.STATUS_EXPIRE
            };
            for (var i = 0; i < 150; i++)
            {
                var order = orders[i % orders.Count];
                var online = order.Entete.DO_ModePaiement == "CARD";
                _db.B_PAIEMENTS.Add(new B_PAIEMENT
                {
                    DO_Piece = order.Piece,
                    PA_Mode = online ? B_PAIEMENT.MODE_ONLINE : (short)0,
                    PA_Type = online ? B_PAIEMENT.TYPE_ONLINE : "CASH",
                    PA_Statut = statuses[i % statuses.Length],
                    PA_Montant = order.Entete.DO_NetAPayer ?? 0m,
                    PA_Date = DateTime.UtcNow.AddDays(-30 + i % 30),
                    PA_Reference = $"PAY-PFE-{i + 1:000000}",
                    PA_Fournisseur = online ? B_PAIEMENT.FOURNISSEUR_VIRTUAL : "COD",
                    PA_ProviderPaymentId = online ? $"VIRT-PFE-{i + 1:000000}" : null,
                    PA_StatutExterne = statuses[i % statuses.Length] == B_PAIEMENT.STATUS_SUCCES ? "SUCCESS" : "PENDING",
                    PA_IsSandbox = true,
                    cbCreation = DateTime.UtcNow.AddDays(-31 + i % 30),
                    cbModification = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.Paiements = await _db.B_PAIEMENTS.CountAsync(ct);
        }

        private async Task SeedClientAddressesAndLivreurPositionsAsync(UserSeedResult users, List<ZoneSeed> zones, RealisticSeedReport report, CancellationToken ct)
        {
            foreach (var client in users.Clients)
            {
                _db.F_CLIENT_ADDRESSES.Add(new F_CLIENT_ADDRESS
                {
                    ClientUserId = client.User.Id,
                    Label = "Adresse principale",
                    Adresse = client.Profile.Adresse ?? "Adresse client",
                    Gouvernorat = client.Profile.Gouvernorat?.ToString() ?? client.Spec.City,
                    Delegation = client.Profile.Delegation,
                    Ville = client.Spec.City,
                    CodePostal = client.Profile.CodePostal,
                    Landmark = "Repère client seed PFE",
                    GeoValidationStatus = "VALID",
                    Latitude = client.Profile.Latitude,
                    Longitude = client.Profile.Longitude,
                    IsDefault = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            foreach (var livreur in users.LivreursNormaux.Concat(users.LivreursTransit))
            {
                _db.F_LIVREUR_POSITIONS.Add(new F_LIVREUR_POSITION
                {
                    LivreurUserId = livreur.User.Id,
                    Lat = livreur.Profile.Latitude ?? 36.8m,
                    Lng = livreur.Profile.Longitude ?? 10.1m,
                    Accuracy = 12,
                    UpdatedAt = DateTime.UtcNow,
                    IsBroadcasting = true
                });
            }

            await _db.SaveChangesAsync(ct);
            report.Counts.ClientAddresses = await _db.F_CLIENT_ADDRESSES.CountAsync(ct);
            report.Counts.LivreurPositions = await _db.F_LIVREUR_POSITIONS.CountAsync(ct);
        }

        private async Task<string> GenerateAccountsTxtFileAsync(List<TestAccountRow> accounts, string databaseName, CancellationToken ct)
        {
            var path = ResolveAccountsFilePath();
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);

            var counts = accounts
                .GroupBy(x => x.Role)
                .OrderBy(x => x.Key)
                .ToDictionary(x => x.Key, x => x.Count());

            var sb = new StringBuilder();
            sb.AppendLine("================================================================================");
            sb.AppendLine("COMPTES DE TEST - BASE PFE REALISTIC FULL DATABASE");
            sb.AppendLine("================================================================================");
            sb.AppendLine($"Mot de passe commun pour tous les comptes : {CommonPassword}");
            sb.AppendLine($"Date de génération : {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine($"Base de données : {databaseName}");
            sb.AppendLine("================================================================================");
            sb.AppendLine();
            sb.AppendLine("ROLE | NOM / SOCIETE | EMAIL | MOT DE PASSE | VILLE | DEPOT | REMARQUE");
            sb.AppendLine("--------------------------------------------------------------------------------");
            foreach (var account in accounts.OrderBy(x => RoleOrder(x.Role)).ThenBy(x => x.Name))
            {
                sb.AppendLine($"{account.Role} | {account.Name} | {account.Email} | {account.Password} | {account.City} | {account.Depot} | {account.Remark}");
            }

            sb.AppendLine();
            sb.AppendLine("Résumé :");
            sb.AppendLine($"- ADMIN : {Count(counts, "ADMIN")}");
            sb.AppendLine($"- SUPERVISEUR : {Count(counts, "SUPERVISEUR")}");
            sb.AppendLine($"- VENDEUR : {Count(counts, "VENDEUR")}");
            sb.AppendLine($"- CONFIRMATEUR : {Count(counts, "CONFIRMATEUR")}");
            sb.AppendLine($"- LIVREUR NORMAL : {Count(counts, "LIVREUR")}");
            sb.AppendLine($"- LIVREUR TRANSIT : {Count(counts, "LIVREUR_TRANSIT")}");
            sb.AppendLine($"- CLIENT B2C : {Count(counts, "CLIENT_B2C")}");
            sb.AppendLine($"- CLIENT B2B : {Count(counts, "CLIENT_B2B")}");

            await File.WriteAllTextAsync(path, sb.ToString(), Encoding.UTF8, ct);
            return path;
        }

        private async Task ValidateSeedAsync(RealisticSeedReport report, CancellationToken ct)
        {
            report.Validation["usersWithoutProfile"] = await _db.Users.CountAsync(u => !_db.ProfilsUtilisateurs.Any(p => p.UtilisateurId == u.Id), ct);
            report.Validation["articlesWithoutCatalogue"] = await _db.F_ARTICLES.CountAsync(a => a.CL_No3 == 0 || !_db.F_CATALOGUES.Any(c => c.CL_No == a.CL_No3), ct);
            report.Validation["stocksWithoutArticle"] = await _db.F_ARTSTOCKS.CountAsync(s => !_db.F_ARTICLES.Any(a => a.AR_Ref == s.AR_Ref), ct);
            report.Validation["stocksWithoutDepot"] = await _db.F_ARTSTOCKS.CountAsync(s => !_db.F_DEPOTS.Any(d => d.DE_No == s.DE_No), ct);
            report.Validation["ordersWithoutClient"] = await _db.F_DOCENTETES.CountAsync(o => o.DO_ClientUserId == null || !_db.Users.Any(u => u.Id == o.DO_ClientUserId), ct);
            report.Validation["linesWithoutOrder"] = await _db.F_DOCLIGNES.CountAsync(l => !_db.F_DOCENTETES.Any(o => o.DO_Piece == l.DO_Piece), ct);
            report.Validation["linesWithoutArticle"] = await _db.F_DOCLIGNES.CountAsync(l => !_db.F_ARTICLES.Any(a => a.AR_Ref == l.AR_Ref), ct);
            report.Validation["livraisonsWithoutOrder"] = await _db.F_LIVRAISONS.CountAsync(l => !_db.F_DOCENTETES.Any(o => o.DO_Piece == l.DO_Piece), ct);
            report.Validation["transfertsWithoutArticle"] = await _db.F_TRANSFERTS.CountAsync(t => !_db.F_ARTICLES.Any(a => a.AR_Ref == t.ArRef), ct);
            report.Validation["transfertsWithoutSourceDepot"] = await _db.F_TRANSFERTS.CountAsync(t => !_db.F_DEPOTS.Any(d => d.DE_No == t.SourceDepotNo), ct);
            report.Validation["transfertsWithoutDestinationDepot"] = await _db.F_TRANSFERTS.CountAsync(t => !_db.F_DEPOTS.Any(d => d.DE_No == t.DestinationDepotNo), ct);
            report.Validation["duplicateArticleDesignations"] = await _db.F_ARTICLES
                .GroupBy(a => a.AR_Design)
                .CountAsync(g => g.Count() > 1, ct);
        }

        private List<(ArticleSeed Article, decimal Qty)> PickArticles(List<ArticleSeed> articles, int offset, int count)
        {
            var result = new List<(ArticleSeed Article, decimal Qty)>();
            for (var i = 0; i < count; i++)
            {
                var article = articles[(offset + i * 11) % articles.Count];
                result.Add((article, 1 + ((offset + i) % 4)));
            }
            return result;
        }

        private string ResolveAccountsFilePath()
        {
            var root = ResolveRepoRoot(_env.ContentRootPath);
            return Path.Combine(root, "_seed-output", "PFE_TEST_ACCOUNTS.txt");
        }

        private static string ResolveRepoRoot(string start)
        {
            var dir = new DirectoryInfo(start);
            while (dir != null)
            {
                if (Directory.Exists(Path.Combine(dir.FullName, ".git")))
                    return dir.FullName;
                dir = dir.Parent;
            }
            return Path.GetFullPath(Path.Combine(start, "..", ".."));
        }

        private async Task<string> ResolveDatabaseNameAsync(CancellationToken ct)
        {
            var connection = _db.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync(ct);

            if (!string.IsNullOrWhiteSpace(connection.Database))
                return connection.Database;

            var builder = new DbConnectionStringBuilder { ConnectionString = _db.Database.GetConnectionString() ?? string.Empty };
            return builder.TryGetValue("Database", out var db) ? Convert.ToString(db) ?? "UNKNOWN" : "UNKNOWN";
        }

        private static void EnsureIdentitySuccess(IdentityResult result, string context)
        {
            if (!result.Succeeded)
                throw new InvalidOperationException($"{context} échoué : {string.Join(" ; ", result.Errors.Select(e => e.Description))}");
        }

        private static (string Adresse, string? Complement) SplitDepotAddress(string address)
        {
            var first = Truncate(address, 35);
            var rest = address.Length > 35 ? Truncate(address[35..].Trim(), 35) : null;
            return (first, rest);
        }

        private static string Truncate(string? value, int max)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var trimmed = value.Trim();
            return trimmed.Length <= max ? trimmed : trimmed[..max];
        }

        private static string Code(string prefix, params int[] parts) => $"{prefix}-{string.Join("-", parts.Select(p => p.ToString("00")))}";

        private static string BuildArticleDescription(string name, string department, string category) =>
            $"{name} est un article professionnel du rayon {department}, famille {category}. Fiche préparée pour démonstration PFE avec prix, stock multi-dépôts, catalogue et affichage React.";

        private static decimal PriceFor(string name, int i)
        {
            var lower = name.ToLowerInvariant();
            if (lower.Contains("iphone") || lower.Contains("macbook")) return 2400 + (i % 9) * 180;
            if (lower.Contains("laptop") || lower.Contains("think") || lower.Contains("vivobook") || lower.Contains("latitude")) return 1450 + (i % 8) * 140;
            if (lower.Contains("galaxy") || lower.Contains("redmi") || lower.Contains("oppo") || lower.Contains("infinix")) return 420 + (i % 10) * 95;
            if (lower.Contains("écran")) return 360 + (i % 8) * 70;
            if (lower.Contains("imprim") || lower.Contains("ecotank") || lower.Contains("laserjet")) return 390 + (i % 6) * 120;
            if (lower.Contains("ssd") || lower.Contains("disque")) return 95 + (i % 7) * 55;
            if (lower.Contains("routeur") || lower.Contains("switch") || lower.Contains("caméra")) return 120 + (i % 8) * 45;
            return 25 + (i % 20) * 18;
        }

        private static string EmailLocal(string value)
        {
            var normalized = value.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var ch in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(ch);
                if (category == UnicodeCategory.NonSpacingMark) continue;
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            }
            return sb.ToString();
        }

        private static string Phone(int seq) => $"2{seq % 8 + 1}{(100000 + seq * 137) % 900000:000000}";
        private static string BuildCin(int seq) => $"{(10000000 + seq * 371) % 99999999:00000000}";
        private static string BuildMatricule(int seq) => $"{1000000 + seq * 13}/A/M/{seq % 999:000}";
        private static string PostalCodeFor(GouvernoratTunisie gov) => gov switch
        {
            GouvernoratTunisie.Sfax => "3000",
            GouvernoratTunisie.Sousse => "4000",
            GouvernoratTunisie.Nabeul => "8000",
            GouvernoratTunisie.Bizerte => "7000",
            GouvernoratTunisie.Monastir => "5000",
            GouvernoratTunisie.Gabes => "6000",
            GouvernoratTunisie.Kairouan => "3100",
            GouvernoratTunisie.Medenine => "4100",
            _ => "1000"
        };

        private static decimal LatFor(GouvernoratTunisie gov) => gov switch
        {
            GouvernoratTunisie.Sfax => 34.7406m,
            GouvernoratTunisie.Sousse => 35.8256m,
            GouvernoratTunisie.Nabeul => 36.4513m,
            GouvernoratTunisie.Bizerte => 37.2744m,
            GouvernoratTunisie.Monastir => 35.7643m,
            GouvernoratTunisie.Gabes => 33.8815m,
            GouvernoratTunisie.Kairouan => 35.6781m,
            GouvernoratTunisie.Medenine => 33.3549m,
            _ => 36.8065m
        };

        private static decimal LngFor(GouvernoratTunisie gov) => gov switch
        {
            GouvernoratTunisie.Sfax => 10.7603m,
            GouvernoratTunisie.Sousse => 10.6084m,
            GouvernoratTunisie.Nabeul => 10.7350m,
            GouvernoratTunisie.Bizerte => 9.8739m,
            GouvernoratTunisie.Monastir => 10.8113m,
            GouvernoratTunisie.Gabes => 10.0982m,
            GouvernoratTunisie.Kairouan => 10.0963m,
            GouvernoratTunisie.Medenine => 10.5055m,
            _ => 10.1815m
        };

        private static int RoleOrder(string role) => role switch
        {
            "ADMIN" => 1,
            "SUPERVISEUR" => 2,
            "VENDEUR" => 3,
            "CONFIRMATEUR" => 4,
            "LIVREUR" => 5,
            "LIVREUR_TRANSIT" => 6,
            "CLIENT_B2C" => 7,
            "CLIENT_B2B" => 8,
            _ => 99
        };

        private static int Count(Dictionary<string, int> counts, string key) => counts.TryGetValue(key, out var value) ? value : 0;

        private sealed record DepotSeed(int No, string Code, string Name, string Address, string City, string PostalCode, GouvernoratTunisie Gouvernorat, string Delegation, decimal Lat, decimal Lng, bool IsPrincipal);
        private sealed record ZoneSeed(int DepotNo, string Label, GouvernoratTunisie Gouvernorat, string Delegation);
        private sealed record CatalogNode(int No, int ParentNo, string Name, string Code, short Level);
        private sealed record CatalogSeedResult(List<CatalogNode> Nodes);
        private sealed record ArticleSeed(string Ref, string Name, string FamilyCode, int DepartmentNo, int CategoryNo, int SubCategoryNo, decimal Price);
        private sealed record OrderSeed(string Piece, F_DOCENTETE Entete, SeededUser Client, DepotSeed Depot, SeededUser Livreur, List<ArticleSeed> Articles);

        private sealed record UserSpec(
            string AccountRole,
            string DisplayName,
            string Email,
            string Role,
            string City,
            GouvernoratTunisie Gouvernorat,
            string Delegation,
            string Address,
            string PostalCode,
            string Phone,
            int Sequence,
            DepotSeed? Depot,
            bool IsClient,
            TypeClient? ClientType,
            string? CompanyName,
            string? MatriculeFiscal,
            string? ResponsibleName,
            bool IsTransit,
            string? EmployeeCode,
            string? Department,
            string? Position,
            string? ClientCode,
            int? DiscountPercent,
            decimal? CreditLimit,
            decimal Lat,
            decimal Lng,
            string Remark)
        {
            public string FullName => ClientType == TypeClient.B2B ? ResponsibleName ?? DisplayName : DisplayName;
            public string? AddressComplement => ClientType == TypeClient.B2B ? $"Responsable: {ResponsibleName}" : null;
        }

        private sealed record SeededUser(UserSpec Spec, ApplicationUser User, ProfilUtilisateur Profile);

        private sealed class UserSeedResult
        {
            public List<SeededUser> AllUsers { get; } = new();
            public List<TestAccountRow> Accounts { get; } = new();
            public IReadOnlyList<SeededUser> Admins => AllUsers.Where(x => x.Spec.Role == AppRoles.ADMIN).ToList();
            public IReadOnlyList<SeededUser> Vendeurs => AllUsers.Where(x => x.Spec.Role == AppRoles.VENDEUR).ToList();
            public IReadOnlyList<SeededUser> Confirmateurs => AllUsers.Where(x => x.Spec.Role == AppRoles.CONFIRMATEUR).ToList();
            public IReadOnlyList<SeededUser> LivreursNormaux => AllUsers.Where(x => x.Spec.Role == AppRoles.LIVREUR && !x.Spec.IsTransit).ToList();
            public IReadOnlyList<SeededUser> LivreursTransit => AllUsers.Where(x => x.Spec.Role == AppRoles.LIVREUR && x.Spec.IsTransit).ToList();
            public IReadOnlyList<SeededUser> Clients => AllUsers.Where(x => x.Spec.Role == AppRoles.CLIENT).ToList();
            public IReadOnlyList<SeededUser> ClientsB2B => AllUsers.Where(x => x.Profile.TypeClient == TypeClient.B2B).ToList();
        }
    }

    public sealed class RealisticSeedRequest
    {
        public string? Confirm { get; set; }
    }

    public sealed class RealisticSeedReport
    {
        public string Message { get; set; } = "Seed réaliste complet terminé.";
        public string DatabaseName { get; set; } = string.Empty;
        public RealisticSeedCounts Counts { get; set; } = new();
        public Dictionary<string, int> Deleted { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, int> Validation { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public List<string> IgnoredModules { get; set; } = new();
        public string AccountsFilePath { get; set; } = string.Empty;
        public List<TestAccountRow> Accounts { get; set; } = new();
    }

    public sealed class RealisticSeedCounts
    {
        public int RolesCreated { get; set; }
        public int RolesExisting { get; set; }
        public int Users { get; set; }
        public int Depots { get; set; }
        public int Zones { get; set; }
        public int LivreurZones { get; set; }
        public int Catalogues { get; set; }
        public int Articles { get; set; }
        public int ArticleImages { get; set; }
        public int Stocks { get; set; }
        public int Devis { get; set; }
        public int DevisLignes { get; set; }
        public int Commandes { get; set; }
        public int LignesCommandes { get; set; }
        public int Livraisons { get; set; }
        public int LivraisonHistoriques { get; set; }
        public int Transferts { get; set; }
        public int TransfertAuditLogs { get; set; }
        public int Reclamations { get; set; }
        public int Paiements { get; set; }
        public int Homepages { get; set; }
        public int HomepageTemplates { get; set; }
        public int ClientAddresses { get; set; }
        public int LivreurPositions { get; set; }
    }

    public sealed class RealisticSeedSummary
    {
        public string DatabaseName { get; set; } = string.Empty;
        public Dictionary<string, int> RoleCounts { get; set; } = new();
        public int Users { get; set; }
        public int Depots { get; set; }
        public int Zones { get; set; }
        public int Catalogues { get; set; }
        public int Articles { get; set; }
        public int Stocks { get; set; }
        public int Devis { get; set; }
        public int Commandes { get; set; }
        public int LignesCommandes { get; set; }
        public int Livraisons { get; set; }
        public int Transferts { get; set; }
        public int Reclamations { get; set; }
        public int Paiements { get; set; }
        public string AccountsFilePath { get; set; } = string.Empty;
    }

    public sealed record TestAccountRow(
        string Role,
        string Name,
        string Email,
        string Password,
        string City,
        string Depot,
        string Remark);
}
