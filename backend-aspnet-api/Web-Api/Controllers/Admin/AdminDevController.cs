using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.Geo;
using Web_Api.Model;
using Web_Api.Services;
using Web_Api.Services.DevTest;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// 1.G / Seed démo — Endpoints admin de réinitialisation.
    /// UNIQUEMENT en environnement Development (Production refuse 403).
    /// </summary>
    [ApiController]
    [Route("api/admin/dev")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminDevController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole<Guid>> _roleManager;
        private readonly RealisticFullDatabaseSeeder _realisticSeeder;
        private readonly AppSettingsService _appSettings;

        public AdminDevController(
            AppDbContext db,
            IWebHostEnvironment env,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole<Guid>> roleManager,
            RealisticFullDatabaseSeeder realisticSeeder,
            AppSettingsService appSettings)
        {
            _db = db;
            _env = env;
            _userManager = userManager;
            _roleManager = roleManager;
            _realisticSeeder = realisticSeeder;
            _appSettings = appSettings;
        }

        [AllowAnonymous]
        [HttpPost("reset-and-seed-full-database")]
        public async Task<IActionResult> ResetAndSeedFullDatabase(
            [FromBody] RealisticSeedRequest request,
            CancellationToken ct)
        {
            if (!_env.IsDevelopment())
                return NotFound();

            if (request?.Confirm != RealisticFullDatabaseSeeder.RequiredConfirmValue)
            {
                return BadRequest(new
                {
                    message = $"Champ 'confirm' obligatoire avec la valeur '{RealisticFullDatabaseSeeder.RequiredConfirmValue}'."
                });
            }

            var adminUsers = await _userManager.GetUsersInRoleAsync(AppRoles.ADMIN);
            if (adminUsers.Count > 0 && !(User?.Identity?.IsAuthenticated == true && User.IsInRole(AppRoles.ADMIN)))
            {
                return Forbid();
            }

            try
            {
                var report = await _realisticSeeder.RunAsync(ct);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Erreur pendant le seed réaliste complet.",
                    detail = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        [AllowAnonymous]
        [HttpGet("seed-full-database-summary")]
        public async Task<IActionResult> SeedFullDatabaseSummary(CancellationToken ct)
        {
            if (!_env.IsDevelopment())
                return NotFound();

            var adminUsers = await _userManager.GetUsersInRoleAsync(AppRoles.ADMIN);
            if (adminUsers.Count > 0 && !(User?.Identity?.IsAuthenticated == true && User.IsInRole(AppRoles.ADMIN)))
                return Forbid();

            return Ok(await _realisticSeeder.GetSummaryAsync(ct));
        }

        public class ResetReport
        {
            public int Commandes { get; set; }
            public int LignesCommande { get; set; }
            public int Reclamations { get; set; }
            public int Tentatives { get; set; }
            public int PhotosReclamation { get; set; }
            public int Livraisons { get; set; }
            public int LivraisonHistoriques { get; set; }
            public int PositionsLivreur { get; set; }
            public int SmsLogs { get; set; }
            public int ChatbotSessions { get; set; }
            public int ChatbotMessages { get; set; }
        }

        [HttpPost("reset-demo-data")]
        public async Task<IActionResult> ResetDemoData(CancellationToken ct)
        {
            if (!_env.IsDevelopment())
            {
                return StatusCode(403, new
                {
                    message = "Réinitialisation autorisée uniquement en Development."
                });
            }

            var report = new ResetReport();

            // L'ordre respecte les contraintes de clé étrangère :
            // enfants en premier, parents ensuite.
            report.PhotosReclamation = await _db.F_RECLAMATION_PHOTOS.ExecuteDeleteAsync(ct);
            report.Tentatives        = await _db.F_RECLAMATION_TENTATIVES.ExecuteDeleteAsync(ct);
            report.Reclamations      = await _db.F_RECLAMATIONS.ExecuteDeleteAsync(ct);

            report.LivraisonHistoriques = await _db.F_LIVRAISON_HISTORIQUES.ExecuteDeleteAsync(ct);
            report.Livraisons           = await _db.F_LIVRAISONS.ExecuteDeleteAsync(ct);
            report.PositionsLivreur     = await _db.F_LIVREUR_POSITION_HISTORIES.ExecuteDeleteAsync(ct);

            report.LignesCommande = await _db.F_DOCLIGNES.ExecuteDeleteAsync(ct);
            report.Commandes      = await _db.F_DOCENTETES.ExecuteDeleteAsync(ct);

            report.SmsLogs         = await _db.F_SMS_LOGS.ExecuteDeleteAsync(ct);
            report.ChatbotMessages = await _db.F_CHATBOT_MESSAGES.ExecuteDeleteAsync(ct);
            report.ChatbotSessions = await _db.F_CHATBOT_SESSIONS.ExecuteDeleteAsync(ct);

            return Ok(new
            {
                message = "Données de démo réinitialisées.",
                deleted = report
            });
        }

        // ====================================================================
        // SEED CLEAN DEMO — reset complet + recréation 5 users + 4 commandes
        // ====================================================================

        public class SeedCleanDemoRequest
        {
            public string? Confirm { get; set; }
        }

        public class SeedCleanReport
        {
            public Dictionary<string, int> Deleted { get; set; } = new();
            public List<object> CreatedUsers { get; set; } = new();
            public List<object> CreatedCommandes { get; set; } = new();
        }

        /// <summary>
        /// Vide TOUS les utilisateurs et données transactionnelles, puis
        /// recrée 5 utilisateurs (1 admin + 1 client + 2 confirmatrices +
        /// 1 livreur) et 4 commandes EN_ATTENTE pour le client de démo.
        /// Conserve les rôles, le catalogue produits, les migrations EF.
        /// </summary>
        [HttpPost("seed-clean-demo")]
        public async Task<IActionResult> SeedCleanDemo(
            [FromBody] SeedCleanDemoRequest req,
            CancellationToken ct)
        {
            if (!_env.IsDevelopment())
            {
                return StatusCode(403, new
                {
                    message = "Seed démo autorisé uniquement en Development."
                });
            }
            if (req?.Confirm != "RESET_AND_SEED")
            {
                return BadRequest(new
                {
                    message = "Champ 'confirm' doit valoir exactement 'RESET_AND_SEED'."
                });
            }

            var report = new SeedCleanReport();

            // ───────────── PHASE 1 — DELETE ─────────────
            // Ordre : enfants → parents pour respecter les contraintes FK.
            report.Deleted["chatbotActionLogs"]   = await _db.F_CHATBOT_ACTION_LOGS.ExecuteDeleteAsync(ct);
            report.Deleted["chatbotPendingActs"]  = await _db.F_CHATBOT_PENDING_ACTIONS.ExecuteDeleteAsync(ct);
            report.Deleted["chatbotMessages"]     = await _db.F_CHATBOT_MESSAGES.ExecuteDeleteAsync(ct);
            report.Deleted["chatbotInsights"]     = await _db.F_CHATBOT_INSIGHTS.ExecuteDeleteAsync(ct);
            report.Deleted["chatbotSessions"]     = await _db.F_CHATBOT_SESSIONS.ExecuteDeleteAsync(ct);

            report.Deleted["smsLogs"]             = await _db.F_SMS_LOGS.ExecuteDeleteAsync(ct);

            report.Deleted["positionHistory"]     = await _db.F_LIVREUR_POSITION_HISTORIES.ExecuteDeleteAsync(ct);
            report.Deleted["positions"]           = await _db.F_LIVREUR_POSITIONS.ExecuteDeleteAsync(ct);
            report.Deleted["livreurActionLogs"]   = await _db.F_LIVREUR_ACTION_LOGS.ExecuteDeleteAsync(ct);
            report.Deleted["livreurAbandons"]     = await _db.F_LIVREUR_ABANDON_LOGS.ExecuteDeleteAsync(ct);
            report.Deleted["avisCommandes"]       = await _db.F_AVIS_COMMANDES.ExecuteDeleteAsync(ct);
            report.Deleted["avisPromptStates"]    = await _db.F_AVIS_PROMPT_STATES.ExecuteDeleteAsync(ct);

            report.Deleted["reclamationPhotos"]   = await _db.F_RECLAMATION_PHOTOS.ExecuteDeleteAsync(ct);
            report.Deleted["reclamationTents"]    = await _db.F_RECLAMATION_TENTATIVES.ExecuteDeleteAsync(ct);
            report.Deleted["reclamations"]        = await _db.F_RECLAMATIONS.ExecuteDeleteAsync(ct);

            report.Deleted["livraisonHistos"]     = await _db.F_LIVRAISON_HISTORIQUES.ExecuteDeleteAsync(ct);
            report.Deleted["livraisons"]          = await _db.F_LIVRAISONS.ExecuteDeleteAsync(ct);

            report.Deleted["paiements"]           = await _db.B_PAIEMENTS.ExecuteDeleteAsync(ct);

            report.Deleted["lignesCommande"]      = await _db.F_DOCLIGNES.ExecuteDeleteAsync(ct);
            report.Deleted["commandes"]           = await _db.F_DOCENTETES.ExecuteDeleteAsync(ct);

            report.Deleted["commandeLocks"]       = await _db.CommandeConfirmationLocks.ExecuteDeleteAsync(ct);
            report.Deleted["confirmatriceSess"]   = await _db.F_CONFIRMATRICE_SESSIONS.ExecuteDeleteAsync(ct);

            report.Deleted["clientAddresses"]     = await _db.F_CLIENT_ADDRESSES.ExecuteDeleteAsync(ct);
            report.Deleted["deviceTokens"]        = await _db.F_CLIENT_DEVICE_TOKENS.ExecuteDeleteAsync(ct);

            // ProfilsUtilisateurs est référencé par AspNetUsers.CustomerProfilecbMarq
            // (FK nullable créée par la migration AddIdentityTables). On la
            // remet à NULL avant DELETE pour éviter la violation de contrainte.
            await _db.Database.ExecuteSqlRawAsync(
                "UPDATE AspNetUsers SET CustomerProfilecbMarq = NULL WHERE CustomerProfilecbMarq IS NOT NULL", ct);

            report.Deleted["profils"]             = await _db.ProfilsUtilisateurs.ExecuteDeleteAsync(ct);

            // AspNetUserRoles : pas de DbSet exposé → SQL brut.
            report.Deleted["userRoles"] = await _db.Database
                .ExecuteSqlRawAsync("DELETE FROM AspNetUserRoles", ct);
            // Idem pour les autres tables Identity dépendantes des users.
            await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserClaims", ct);
            await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserLogins", ct);
            await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserTokens", ct);
            report.Deleted["users"] = await _db.Database
                .ExecuteSqlRawAsync("DELETE FROM AspNetUsers", ct);

            // Réinitialise F_APP_CONFIG à sa ligne unique par défaut.
            report.Deleted["appConfig"] = await _db.F_APP_CONFIGS.ExecuteDeleteAsync(ct);
            await _db.Database.ExecuteSqlRawAsync(@"
SET IDENTITY_INSERT [F_APP_CONFIG] ON;
INSERT INTO [F_APP_CONFIG] ([Id], [PrimaryColor], [ThemeMode], [UpdatedAt])
VALUES (1, '#3F51B5', 'auto', SYSUTCDATETIME());
SET IDENTITY_INSERT [F_APP_CONFIG] OFF;", ct);

            // ───────────── PHASE 1.5 — Garantir les rôles ─────────────
            foreach (var roleName in AppRoles.All)
            {
                if (!await _roleManager.RoleExistsAsync(roleName))
                {
                    await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
                }
            }

            // ───────────── PHASE 2 — Créer les 5 utilisateurs ─────────────
            var seeds = new[]
            {
                new SeedUserSpec(
                    Email: "admin@gmail.com",
                    Password: "admin123",
                    UserName: "admin",
                    NomComplet: "Administrator",
                    Telephone: null,
                    Role: AppRoles.ADMIN,
                    Profil: TypeProfil.Employe,
                    Gouvernorat: GouvernoratTunisie.Tunis,
                    Delegation: "Bab El Bhar",
                    Adresse: "Avenue Habib Bourguiba, Tunis",
                    CodePostal: "1000",
                    Lat: 36.8065m,
                    Lng: 10.1815m
                ),
                new SeedUserSpec(
                    Email: "client1@gmail.com",
                    Password: "123456",
                    UserName: "client1",
                    NomComplet: "Mohamed Client Demo",
                    Telephone: "99000001",
                    Role: AppRoles.CLIENT,
                    Profil: TypeProfil.Client,
                    Gouvernorat: GouvernoratTunisie.Sfax,
                    Delegation: "Sfax Ville",
                    Adresse: "Rue Habib Bourguiba, Sfax Centre",
                    CodePostal: "3000",
                    Lat: 34.7406m,
                    Lng: 10.7603m,
                    TypeClient: TypeClient.B2C,
                    CodeClientSage: "CLDEMO1"
                ),
                new SeedUserSpec(
                    Email: "confirmatrice1@gmail.com",
                    Password: "123456",
                    UserName: "confirmatrice1",
                    NomComplet: "Amira Confirmatrice Sfax",
                    Telephone: "99000002",
                    Role: AppRoles.CONFIRMATEUR,
                    Profil: TypeProfil.Employe,
                    Gouvernorat: GouvernoratTunisie.Sfax,
                    Delegation: "Sfax Ville",
                    Adresse: "Bureau confirmatrice Sfax",
                    CodePostal: "3000",
                    Lat: 34.7406m,
                    Lng: 10.7603m
                ),
                new SeedUserSpec(
                    Email: "confirmatrice2@gmail.com",
                    Password: "123456",
                    UserName: "confirmatrice2",
                    NomComplet: "Sonia Confirmatrice Tunis",
                    Telephone: "99000003",
                    Role: AppRoles.CONFIRMATEUR,
                    Profil: TypeProfil.Employe,
                    Gouvernorat: GouvernoratTunisie.Tunis,
                    Delegation: "Bab El Bhar",
                    Adresse: "Bureau confirmatrice Tunis",
                    CodePostal: "1000",
                    Lat: 36.8065m,
                    Lng: 10.1815m
                ),
                new SeedUserSpec(
                    Email: "livreur1@gmail.com",
                    Password: "123456",
                    UserName: "livreur1",
                    NomComplet: "Ahmed Livreur Sfax",
                    Telephone: "99000004",
                    Role: AppRoles.LIVREUR,
                    Profil: TypeProfil.Employe,
                    Gouvernorat: GouvernoratTunisie.Sfax,
                    Delegation: "Sfax Ville",
                    Adresse: "Zone livreur Sfax",
                    CodePostal: "3000",
                    Lat: 34.7406m,
                    Lng: 10.7603m
                ),
            };

            ApplicationUser? clientUser = null;
            ProfilUtilisateur? clientProfile = null;

            foreach (var s in seeds)
            {
                var user = new ApplicationUser
                {
                    UserName = s.UserName,
                    Email = s.Email,
                    EmailConfirmed = true,
                    PhoneNumber = s.Telephone,
                    PhoneNumberConfirmed = s.Telephone != null,
                };
                var create = await _userManager.CreateAsync(user, s.Password);
                if (!create.Succeeded)
                {
                    return StatusCode(500, new
                    {
                        message = $"Création {s.Email} échouée",
                        errors = create.Errors.Select(e => new { e.Code, e.Description })
                    });
                }
                await _userManager.AddToRoleAsync(user, s.Role);

                var profile = new ProfilUtilisateur
                {
                    UtilisateurId = user.Id,
                    TypeProfil = s.Profil,
                    TypeClient = s.Profil == TypeProfil.Client ? s.TypeClient : null,
                    NomComplet = s.NomComplet,
                    Telephone = s.Telephone,
                    Gouvernorat = s.Gouvernorat,
                    Delegation = s.Delegation,
                    Adresse = s.Adresse,
                    CodePostal = s.CodePostal,
                    Pays = "Tunisie",
                    Latitude = s.Lat,
                    Longitude = s.Lng,
                    CodeClientSage = s.CodeClientSage,
                    DateCreation = DateTime.UtcNow,
                    DateModification = DateTime.UtcNow,
                };
                _db.ProfilsUtilisateurs.Add(profile);

                report.CreatedUsers.Add(new
                {
                    id = user.Id,
                    email = s.Email,
                    userName = s.UserName,
                    role = s.Role,
                    nomComplet = s.NomComplet,
                });

                if (s.Role == AppRoles.CLIENT)
                {
                    clientUser = user;
                    clientProfile = profile;
                }
            }

            await _db.SaveChangesAsync(ct);

            // ───────────── PHASE 3 — 4 commandes EN_ATTENTE pour client1 ─────────────
            if (clientUser == null || clientProfile == null)
            {
                return StatusCode(500, new { message = "Client de démo non créé." });
            }

            var articles = await _db.F_ARTICLES.AsNoTracking()
                .Where(a => a.AR_Sommeil == 0)
                .OrderBy(a => a.cbMarq)
                .Take(20)
                .ToListAsync(ct);
            if (articles.Count == 0)
            {
                // Pas d'article publié → fallback sur tous les articles disponibles.
                articles = await _db.F_ARTICLES.AsNoTracking()
                    .OrderBy(a => a.cbMarq)
                    .Take(20)
                    .ToListAsync(ct);
            }

            // Plans des commandes : (DoPiece, age en heures, liste d'(article-index, qté))
            // Si moins d'articles que demandé, on réutilise le premier.
            var rng = new Random(20260512);
            var commandePlans = new[]
            {
                new CommandePlan("BL00001", 4, BuildLines(articles, rng, lineCount: 1, maxQty: 1)),
                new CommandePlan("BL00002", 3, BuildLines(articles, rng, lineCount: 2, maxQty: 3)),
                new CommandePlan("BL00003", 2, BuildLines(articles, rng, lineCount: 1, maxQty: 2)),
                new CommandePlan("BL00004", 1, BuildLines(articles, rng, lineCount: 3, maxQty: 1)),
            };

            var fraisLivraison = await _appSettings.GetDecimalAsync(
                AppSettingsService.DeliveryFeeHomeKey,
                AppSettingsService.DefaultDeliveryFeeHome,
                ct);
            const decimal timbreFiscal = 1m;

            foreach (var plan in commandePlans)
            {
                var createdAt = DateTime.UtcNow.AddHours(-plan.AgeHours);

                decimal totalTTC = 0;
                foreach (var (article, qty) in plan.Lines)
                {
                    totalTTC += article.AR_PrixVen * qty;
                }
                var netAPayer = totalTTC + fraisLivraison + timbreFiscal;

                var entete = new F_DOCENTETE
                {
                    DO_Domaine = 0,
                    DO_Type = 0, // BC
                    DO_Date = createdAt,
                    DO_Piece = plan.DoPiece,
                    DO_Tiers = clientProfile.CodeClientSage,
                    DO_Valide = F_DOCENTETE.STATUS_EN_ATTENTE,
                    DO_TotalHT = totalTTC,
                    DO_TotalTTC = totalTTC,
                    DO_NetAPayer = netAPayer,
                    DO_FraisLivraison = fraisLivraison,
                    DO_TimbreFiscal = timbreFiscal,
                    DO_ModeLivraison = "HOME",
                    DO_ModePaiement = "COD",
                    DO_AdresseLivraison = clientProfile.Adresse,
                    DO_VilleLivraison = clientProfile.Gouvernorat?.ToString(),
                    DO_CodePostalLivraison = clientProfile.CodePostal,
                    DO_LatitudeLivraison = clientProfile.Latitude?.ToString("F6"),
                    DO_LongitudeLivraison = clientProfile.Longitude?.ToString("F6"),
                    DO_TelephoneLivraison = clientProfile.Telephone,
                    DO_ClientUserId = clientUser.Id,
                    DO_ClientMode = "EXISTING",
                    cbCreation = createdAt,
                    cbModification = createdAt,
                };
                _db.F_DOCENTETES.Add(entete);

                foreach (var (article, qty) in plan.Lines)
                {
                    var ligneTotal = article.AR_PrixVen * qty;
                    _db.F_DOCLIGNES.Add(new F_DOCLIGNE
                    {
                        DO_Domaine = 0,
                        DO_Type = 0,
                        DO_Piece = plan.DoPiece,
                        DO_Date = createdAt,
                        CT_Num = clientProfile.CodeClientSage,
                        AR_Ref = article.AR_Ref,
                        DL_Design = article.AR_Design,
                        DL_Qte = qty,
                        DL_PrixUnitaire = article.AR_PrixVen,
                        DL_MontantHT = ligneTotal,
                        DL_MontantTTC = ligneTotal,
                        cbCreation = createdAt,
                        cbModification = createdAt,
                    });
                }

                report.CreatedCommandes.Add(new
                {
                    piece = plan.DoPiece,
                    statut = "EN_ATTENTE",
                    montant = netAPayer,
                    articles = plan.Lines.Select(l => new
                    {
                        arRef = l.Item1.AR_Ref,
                        design = l.Item1.AR_Design,
                        qty = l.Item2,
                        prix = l.Item1.AR_PrixVen,
                    }).ToList(),
                });
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                success = true,
                deleted = report.Deleted,
                created = new
                {
                    users = report.CreatedUsers,
                    commandes = report.CreatedCommandes,
                },
            });
        }

        // ====================================================================
        // SEED LIVREURS ORDERS — N commandes CONFIRME prêtes au dépôt par livreur
        // ====================================================================

        public class SeedLivreursOrdersRequest
        {
            public int OrdersPerLivreur { get; set; } = 3;
            public bool Reset { get; set; } = false;
        }

        /// <summary>
        /// Génère N BL au statut CONFIRME (prêtes au dépôt) pour CHAQUE livreur
        /// existant. La commande apparaît dans `GET /api/livreur/orders/available`
        /// du livreur dont le gouvernorat matche `DO_VilleLivraison`.
        /// Idempotent : les pièces (préfixe BLLV) déjà présentes sont skipped.
        /// Avec `reset=true`, purge d'abord les BLLV* avant régénération.
        /// </summary>
        [HttpPost("seed-livreurs-orders")]
        public async Task<IActionResult> SeedLivreursOrders(
            [FromBody] SeedLivreursOrdersRequest? req,
            CancellationToken ct)
        {
            if (!_env.IsDevelopment())
            {
                return StatusCode(403, new
                {
                    message = "Seed démo autorisé uniquement en Development."
                });
            }

            req ??= new SeedLivreursOrdersRequest();
            if (req.OrdersPerLivreur < 1 || req.OrdersPerLivreur > 20)
            {
                return BadRequest(new
                {
                    message = "OrdersPerLivreur doit être entre 1 et 20."
                });
            }

            // Purge optionnelle des anciennes générations (préfixe BLLV).
            int deletedLignes = 0, deletedBl = 0;
            if (req.Reset)
            {
                deletedLignes = await _db.F_DOCLIGNES
                    .Where(l => l.DO_Piece != null && l.DO_Piece.StartsWith("BLLV"))
                    .ExecuteDeleteAsync(ct);
                deletedBl = await _db.F_DOCENTETES
                    .Where(e => e.DO_Piece != null && e.DO_Piece.StartsWith("BLLV"))
                    .ExecuteDeleteAsync(ct);
            }

            var livreursUsers = await _userManager.GetUsersInRoleAsync(AppRoles.LIVREUR);
            if (livreursUsers.Count == 0)
            {
                return BadRequest(new
                {
                    message = "Aucun utilisateur en rôle LIVREUR — lance d'abord seed-clean-demo."
                });
            }

            var livreurIds = livreursUsers.Select(u => (Guid?)u.Id).ToList();
            var profilByUser = await _db.ProfilsUtilisateurs
                .Where(p => p.UtilisateurId != null && livreurIds.Contains(p.UtilisateurId))
                .ToDictionaryAsync(p => p.UtilisateurId!.Value, p => p, ct);

            // Un client de référence (DO_Tiers + DO_ClientUserId).
            var clients = await _userManager.GetUsersInRoleAsync(AppRoles.CLIENT);
            var clientUser = clients.FirstOrDefault();
            if (clientUser == null)
            {
                return BadRequest(new
                {
                    message = "Aucun utilisateur en rôle CLIENT — lance d'abord seed-clean-demo."
                });
            }
            var clientProfile = await _db.ProfilsUtilisateurs
                .FirstOrDefaultAsync(p => p.UtilisateurId == clientUser.Id, ct);
            if (clientProfile == null || string.IsNullOrWhiteSpace(clientProfile.CodeClientSage))
            {
                return BadRequest(new
                {
                    message = "Profil client incomplet (CodeClientSage manquant)."
                });
            }

            var articles = await _db.F_ARTICLES.AsNoTracking()
                .Where(a => a.AR_Sommeil == 0)
                .OrderBy(a => a.cbMarq)
                .Take(20)
                .ToListAsync(ct);
            if (articles.Count == 0)
            {
                articles = await _db.F_ARTICLES.AsNoTracking()
                    .OrderBy(a => a.cbMarq)
                    .Take(20)
                    .ToListAsync(ct);
            }
            if (articles.Count == 0)
            {
                return BadRequest(new { message = "Catalogue F_ARTICLE vide." });
            }

            var fraisLivraison = await _appSettings.GetDecimalAsync(
                AppSettingsService.DeliveryFeeHomeKey,
                AppSettingsService.DefaultDeliveryFeeHome,
                ct);
            const decimal timbreFiscal = 1m;
            var rng = new Random(20260515);

            var report = new List<object>();
            int skippedExisting = 0;
            int totalCreated = 0;

            var sortedLivreurs = livreursUsers
                .OrderBy(u => u.UserName, StringComparer.OrdinalIgnoreCase)
                .ToList();

            for (int li = 0; li < sortedLivreurs.Count; li++)
            {
                var livreur = sortedLivreurs[li];

                if (!profilByUser.TryGetValue(livreur.Id, out var prof))
                {
                    report.Add(new
                    {
                        livreurEmail = livreur.Email,
                        error = "Profil utilisateur introuvable."
                    });
                    continue;
                }

                var gouvernorat = prof.Gouvernorat?.ToString();
                if (string.IsNullOrWhiteSpace(gouvernorat))
                {
                    report.Add(new
                    {
                        livreurEmail = livreur.Email,
                        error = "Gouvernorat manquant — le filtre pool ne matchera jamais."
                    });
                    continue;
                }

                var livreurOrders = new List<object>();

                for (int j = 0; j < req.OrdersPerLivreur; j++)
                {
                    var doPiece = $"BLLV{(li + 1):00}{(j + 1):00}";

                    var exists = await _db.F_DOCENTETES
                        .AsNoTracking()
                        .AnyAsync(e => e.DO_Piece == doPiece, ct);
                    if (exists)
                    {
                        skippedExisting++;
                        continue;
                    }

                    var createdAt = DateTime.UtcNow.AddHours(-(j + 1));
                    var lines = BuildLines(articles, rng, lineCount: 1 + (j % 2), maxQty: 2);

                    decimal totalTTC = 0;
                    foreach (var (article, qty) in lines)
                        totalTTC += article.AR_PrixVen * qty;
                    var netAPayer = totalTTC + fraisLivraison + timbreFiscal;

                    var entete = new F_DOCENTETE
                    {
                        DO_Domaine = 0,
                        DO_Type = 1, // BL (visible côté livreur)
                        DO_Date = createdAt,
                        DO_Piece = doPiece,
                        DO_Tiers = clientProfile.CodeClientSage,
                        DO_Valide = F_DOCENTETE.STATUS_CONFIRME,
                        DO_TotalHT = totalTTC,
                        DO_TotalTTC = totalTTC,
                        DO_NetAPayer = netAPayer,
                        DO_FraisLivraison = fraisLivraison,
                        DO_TimbreFiscal = timbreFiscal,
                        DO_ModeLivraison = "HOME",
                        DO_ModePaiement = "COD",
                        DO_AdresseLivraison = $"Adresse démo — {prof.Delegation ?? gouvernorat}",
                        DO_VilleLivraison = gouvernorat, // critère filtrage pool
                        DO_CodePostalLivraison = prof.CodePostal,
                        DO_LatitudeLivraison = prof.Latitude?.ToString("F6"),
                        DO_LongitudeLivraison = prof.Longitude?.ToString("F6"),
                        DO_TelephoneLivraison = clientProfile.Telephone,
                        DO_ClientUserId = clientUser.Id,
                        DO_ClientMode = "EXISTING",
                        cbCreation = createdAt,
                        cbModification = createdAt,
                    };
                    _db.F_DOCENTETES.Add(entete);

                    foreach (var (article, qty) in lines)
                    {
                        var ligneTotal = article.AR_PrixVen * qty;
                        _db.F_DOCLIGNES.Add(new F_DOCLIGNE
                        {
                            DO_Domaine = 0,
                            DO_Type = 1,
                            DO_Piece = doPiece,
                            DO_Date = createdAt,
                            CT_Num = clientProfile.CodeClientSage,
                            AR_Ref = article.AR_Ref,
                            DL_Design = article.AR_Design,
                            DL_Qte = qty,
                            DL_PrixUnitaire = article.AR_PrixVen,
                            DL_MontantHT = ligneTotal,
                            DL_MontantTTC = ligneTotal,
                            cbCreation = createdAt,
                            cbModification = createdAt,
                        });
                    }

                    livreurOrders.Add(new
                    {
                        piece = doPiece,
                        netAPayer,
                        lineCount = lines.Count,
                    });
                    totalCreated++;
                }

                report.Add(new
                {
                    livreurEmail = livreur.Email,
                    livreurUserName = livreur.UserName,
                    gouvernorat,
                    ordersCreated = livreurOrders,
                });
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                success = true,
                deleted = new { lignes = deletedLignes, blEntetes = deletedBl },
                totalCreated,
                skippedExisting,
                clientUsedForOrders = new
                {
                    codeClientSage = clientProfile.CodeClientSage,
                    userName = clientUser.UserName,
                },
                livreurs = report,
            });
        }

        private static List<(F_ARTICLE, decimal)> BuildLines(
            List<F_ARTICLE> articles, Random rng, int lineCount, int maxQty)
        {
            var result = new List<(F_ARTICLE, decimal)>();
            if (articles.Count == 0) return result;

            // Mélange les articles puis prend les `lineCount` premiers distincts.
            var shuffled = articles.OrderBy(_ => rng.Next()).ToList();
            for (int i = 0; i < lineCount; i++)
            {
                var article = shuffled[i % shuffled.Count];
                var qty = 1 + rng.Next(maxQty);
                result.Add((article, qty));
            }
            return result;
        }

        private record SeedUserSpec(
            string Email,
            string Password,
            string UserName,
            string NomComplet,
            string? Telephone,
            string Role,
            TypeProfil Profil,
            GouvernoratTunisie Gouvernorat,
            string Delegation,
            string Adresse,
            string CodePostal,
            decimal Lat,
            decimal Lng,
            TypeClient TypeClient = TypeClient.B2C,
            string? CodeClientSage = null);

        private record CommandePlan(
            string DoPiece,
            int AgeHours,
            List<(F_ARTICLE, decimal)> Lines);
    }
}
