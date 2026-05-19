using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Model;

namespace Web_Api.Controllers.Admin
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminBackofficeController : ControllerBase
    {
        private static readonly string[] PersonnelRoles =
        {
            AppRoles.ADMIN,
            AppRoles.VENDEUR,
            AppRoles.CONFIRMATEUR
        };

        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminBackofficeController(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        [HttpGet("personnel")]
        public async Task<ActionResult<List<AdminPersonnelItemDto>>> GetPersonnel(CancellationToken ct)
        {
            var rows = await LoadUsersWithProfilesAsync(ct);

            var items = rows
                .Where(x => x.Roles.Any(r => PersonnelRoles.Contains(r, StringComparer.OrdinalIgnoreCase)))
                .Select(x => new AdminPersonnelItemDto
                {
                    UserId = x.User.Id,
                    Email = x.User.Email ?? string.Empty,
                    Roles = x.Roles,
                    PrimaryRole = PickPrimaryRole(x.Roles),
                    NomComplet = x.Profile?.NomComplet,
                    Telephone = x.Profile?.Telephone,
                    Departement = x.Profile?.Departement,
                    Poste = x.Profile?.Poste,
                    CodeEmploye = x.Profile?.CodeEmploye,
                    CodeDepot = x.Profile?.CodeDepot,
                    ZoneLivraison = x.Profile?.ZoneLivraison,
                    IsActive = IsUserActive(x.User),
                    DateCreation = x.Profile?.DateCreation,
                    DateModification = x.Profile?.DateModification
                })
                .OrderBy(x => RoleOrder(x.PrimaryRole))
                .ThenBy(x => x.NomComplet ?? x.Email)
                .ThenBy(x => x.Email)
                .ToList();

            return Ok(items);
        }

        [HttpGet("clients")]
        public async Task<ActionResult<List<AdminClientListItemDto>>> GetClients(
            [FromQuery] string? kind,
            CancellationToken ct)
        {
            var rows = await LoadUsersWithProfilesAsync(ct);
            var orderHeaders = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x => x.DO_Domaine == 0)
                .Select(x => new { x.DO_Tiers, x.DO_Type })
                .ToListAsync(ct);

            var normalizedKind = NormalizeClientKind(kind);

            var items = rows
                .Where(x => IsClientUser(x.Roles, x.Profile))
                .Select(x =>
                {
                    var aliases = BuildClientAliases(x.User.Id, x.Profile);
                    var orderCount = orderHeaders.Count(h => MatchTiers(aliases, h.DO_Tiers));
                    var clientType = MapClientType(x.Profile?.TypeClient);
                    return new AdminClientListItemDto
                    {
                        UserId = x.User.Id,
                        Email = x.User.Email ?? string.Empty,
                        TypeClient = clientType,
                        DisplayName = ComputeClientDisplay(x.Profile, x.User.Email),
                        NomComplet = x.Profile?.NomComplet,
                        NomSociete = x.Profile?.NomSociete,
                        Telephone = x.Profile?.Telephone,
                        Adresse = x.Profile?.Adresse,
                        Ville = x.Profile?.Delegation,
                        Gouvernorat = x.Profile?.Gouvernorat?.ToString(),
                        CodePostal = x.Profile?.CodePostal,
                        OrderCount = orderCount,
                        IsActive = IsUserActive(x.User),
                        DateCreation = x.Profile?.DateCreation
                    };
                })
                .Where(x => normalizedKind == "ALL" || string.Equals(x.TypeClient, normalizedKind, StringComparison.OrdinalIgnoreCase))
                .OrderBy(x => x.TypeClient)
                .ThenBy(x => x.DisplayName ?? x.Email)
                .ToList();

            return Ok(items);
        }

        [HttpGet("clients/{userId:guid}")]
        public async Task<ActionResult<AdminClientDetailDto>> GetClientById(Guid userId, CancellationToken ct)
        {
            var row = await LoadUserWithProfileAsync(userId, ct);
            if (row == null || !IsClientUser(row.Roles, row.Profile))
                return NotFound(new { message = "Client introuvable." });

            return Ok(MapClientDetail(row));
        }

        [HttpGet("clients/{userId:guid}/orders")]
        public async Task<ActionResult<List<AdminOrderSummaryDto>>> GetOrdersByClient(Guid userId, CancellationToken ct)
        {
            var row = await LoadUserWithProfileAsync(userId, ct);
            if (row == null || !IsClientUser(row.Roles, row.Profile))
                return NotFound(new { message = "Client introuvable." });

            var aliases = BuildClientAliases(row.User.Id, row.Profile);
            var headers = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x => x.DO_Domaine == 0)
                .OrderByDescending(x => x.cbCreation)
                .ThenByDescending(x => x.cbMarq)
                .ToListAsync(ct);

            var filtered = headers.Where(x => MatchTiers(aliases, x.DO_Tiers)).ToList();
            var pieces = filtered.Select(x => x.DO_Piece).Where(x => !string.IsNullOrWhiteSpace(x)).Cast<string>().ToList();
            var lines = await LoadLinesByPieceAsync(pieces, ct);

            var items = filtered
                .Select(x => MapOrderSummary(x, lines, row.Profile))
                .ToList();

            return Ok(items);
        }

        // Route renommée en "legacy/orders" pour éviter la collision avec
        // AdminOrdersController qui expose la version paginée + filtrée
        // utilisée par l'onglet Commandes du cockpit admin Flutter.
        [HttpGet("legacy/orders")]
        public async Task<ActionResult<List<AdminOrderSummaryDto>>> GetOrders(
            [FromQuery] string? bucket,
            CancellationToken ct)
        {
            var normalizedBucket = NormalizeOrderBucket(bucket);

            var profiles = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .ToListAsync(ct);

            var query = _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x => x.DO_Domaine == 0)
                .AsQueryable();

            query = normalizedBucket switch
            {
                "EN_ATTENTE" => query.Where(x => x.DO_Type == 0 && x.DO_Valide == 0),
                "TENTATIVE" => query.Where(x => x.DO_Type == 0 && x.DO_Valide == 2),
                "REFUSEE" => query.Where(x => x.DO_Type == 0 && x.DO_Valide == 3),
                "CONFIRMED_BL" => query.Where(x => x.DO_Type == 1),
                _ => query
            };

            var headers = await query
                .OrderByDescending(x => x.cbCreation)
                .ThenByDescending(x => x.cbMarq)
                .ToListAsync(ct);

            var pieces = headers.Select(x => x.DO_Piece).Where(x => !string.IsNullOrWhiteSpace(x)).Cast<string>().ToList();
            var lines = await LoadLinesByPieceAsync(pieces, ct);

            var items = headers
                .Select(x =>
                {
                    var profile = FindProfileForTiers(x.DO_Tiers, profiles);
                    return MapOrderSummary(x, lines, profile);
                })
                .ToList();

            return Ok(items);
        }

        // Idem : route renommée pour ne plus heurter AdminOrdersController.GetDetailAsync.
        [HttpGet("legacy/orders/{piece}")]
        public async Task<ActionResult<AdminOrderDetailDto>> GetOrderByPiece(string piece, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Pièce invalide." });

            var header = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0, ct);

            if (header == null)
                return NotFound(new { message = "Commande introuvable." });

            var lines = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(x => x.DO_Piece == piece)
                .OrderBy(x => x.cbMarq)
                .ToListAsync(ct);

            var profile = await ResolveClientProfileAsync(header.DO_Tiers, ct);
            var roles = await ResolveClientRolesAsync(profile?.UtilisateurId, ct);

            var dto = new AdminOrderDetailDto
            {
                Piece = header.DO_Piece ?? string.Empty,
                DocumentKind = header.DO_Type == 1 ? "BL" : "BC",
                Bucket = ComputeOrderBucket(header),
                Date = header.DO_Date,
                ClientCode = header.DO_Tiers,
                ClientUserId = profile?.UtilisateurId,
                ClientDisplay = ComputeClientDisplay(profile, header.DO_Tiers),
                ClientType = MapClientType(profile?.TypeClient),
                Status = BuildOrderStatusLabel(header),
                StatusCode = header.DO_Valide,
                TotalHT = header.DO_TotalHT ?? 0m,
                TotalTTC = header.DO_TotalTTC ?? 0m,
                FraisLivraison = header.DO_FraisLivraison ?? 0m,
                TimbreFiscal = header.DO_TimbreFiscal ?? 0m,
                NetAPayer = header.DO_NetAPayer ?? 0m,
                DepotNo = header.DE_No,
                DeliveryType = header.DO_ModeLivraison,
                PaymentMethod = header.DO_ModePaiement,
                Address = header.DO_AdresseLivraison,
                City = header.DO_VilleLivraison,
                PostalCode = header.DO_CodePostalLivraison,
                Latitude = header.DO_LatitudeLivraison,
                Longitude = header.DO_LongitudeLivraison,
                CbCreation = header.cbCreation,
                CbModification = header.cbModification,
                Client = profile == null ? null : MapClientDetail(profile.UtilisateurId, string.Empty, roles, profile, false),
                Lines = lines.Select(x => new AdminOrderLineDto
                {
                    ArticleRef = x.AR_Ref ?? string.Empty,
                    Designation = x.DL_Design,
                    Qty = x.DL_Qte ?? 0m,
                    UnitPrice = x.DL_PrixUnitaire ?? 0m,
                    AmountHT = x.DL_MontantHT ?? 0m,
                    AmountTTC = x.DL_MontantTTC ?? 0m
                }).ToList()
            };

            if (dto.Client != null && profile?.UtilisateurId.HasValue == true)
            {
                var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == profile.UtilisateurId.Value, ct);
                if (user != null)
                {
                    dto.Client.Email = user.Email ?? string.Empty;
                    dto.Client.IsActive = IsUserActive(user);
                }
            }

            return Ok(dto);
        }

        private async Task<Dictionary<string, int>> LoadLinesByPieceAsync(List<string> pieces, CancellationToken ct)
        {
            if (pieces.Count == 0)
                return new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            var grouped = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(x => x.DO_Piece != null && pieces.Contains(x.DO_Piece))
                .GroupBy(x => x.DO_Piece!)
                .Select(g => new { Piece = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            return grouped.ToDictionary(x => x.Piece, x => x.Count, StringComparer.OrdinalIgnoreCase);
        }

        private async Task<List<UserWithProfile>> LoadUsersWithProfilesAsync(CancellationToken ct)
        {
            var users = await _db.Users.AsNoTracking().OrderBy(x => x.Email).ToListAsync(ct);
            var userIds = users.Select(x => x.Id).ToList();
            var profiles = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .Where(x => x.UtilisateurId.HasValue && userIds.Contains(x.UtilisateurId.Value))
                .ToListAsync(ct);

            var result = new List<UserWithProfile>(users.Count);
            foreach (var user in users)
            {
                ct.ThrowIfCancellationRequested();
                var roles = (await _userManager.GetRolesAsync(user)).ToList();
                var profile = profiles.FirstOrDefault(x => x.UtilisateurId == user.Id);
                result.Add(new UserWithProfile(user, roles, profile));
            }

            return result;
        }

        private async Task<UserWithProfile?> LoadUserWithProfileAsync(Guid userId, CancellationToken ct)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
            if (user == null) return null;

            var roles = (await _userManager.GetRolesAsync(user)).ToList();
            var profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);
            return new UserWithProfile(user, roles, profile);
        }

        private async Task<ProfilUtilisateur?> ResolveClientProfileAsync(string? tiers, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(tiers))
                return null;

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            return FindProfileForTiers(tiers, profiles);
        }

        private async Task<List<string>> ResolveClientRolesAsync(Guid? userId, CancellationToken ct)
        {
            if (!userId.HasValue)
                return new List<string>();

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId.Value, ct);
            if (user == null)
                return new List<string>();

            return (await _userManager.GetRolesAsync(user)).ToList();
        }

        private static AdminClientDetailDto MapClientDetail(UserWithProfile row)
        {
            return MapClientDetail(row.User.Id, row.User.Email ?? string.Empty, row.Roles, row.Profile, IsUserActive(row.User));
        }

        private static AdminClientDetailDto MapClientDetail(Guid? userId, string email, List<string> roles, ProfilUtilisateur? profile, bool isActive)
        {
            return new AdminClientDetailDto
            {
                UserId = userId ?? Guid.Empty,
                Email = email,
                Roles = roles,
                IsActive = isActive,
                TypeProfil = profile?.TypeProfil,
                TypeClient = MapClientType(profile?.TypeClient),
                NomComplet = profile?.NomComplet,
                Telephone = profile?.Telephone,
                Cin = profile?.CIN,
                DateNaissance = profile?.DateNaissance,
                NomSociete = profile?.NomSociete,
                MatriculeFiscal = profile?.MatriculeFiscal,
                RegistreCommerce = profile?.RegistreCommerce,
                NumeroTVA = profile?.NumeroTVA,
                Remise = profile?.Remise,
                PlafondCredit = profile?.PlafondCredit,
                Adresse = profile?.Adresse,
                AdresseComplementaire = profile?.AdresseComplementaire,
                Delegation = profile?.Delegation,
                Gouvernorat = profile?.Gouvernorat?.ToString(),
                CodePostal = profile?.CodePostal,
                Pays = profile?.Pays,
                Latitude = profile?.Latitude,
                Longitude = profile?.Longitude,
                CodeClientSage = profile?.CodeClientSage,
                EstSynchroniseAvecSage = profile?.EstSynchroniseAvecSage,
                DateDerniereSynchronisation = profile?.DateDerniereSynchronisation,
                DateCreation = profile?.DateCreation,
                DateModification = profile?.DateModification
            };
        }

        private static AdminOrderSummaryDto MapOrderSummary(F_DOCENTETE header, IReadOnlyDictionary<string, int> linesByPiece, ProfilUtilisateur? profile)
        {
            var piece = header.DO_Piece ?? string.Empty;
            linesByPiece.TryGetValue(piece, out var lineCount);

            return new AdminOrderSummaryDto
            {
                Piece = piece,
                DocumentKind = header.DO_Type == 1 ? "BL" : "BC",
                Bucket = ComputeOrderBucket(header),
                Date = header.DO_Date,
                ClientCode = header.DO_Tiers,
                ClientUserId = profile?.UtilisateurId,
                ClientDisplay = ComputeClientDisplay(profile, header.DO_Tiers),
                ClientType = MapClientType(profile?.TypeClient),
                Status = BuildOrderStatusLabel(header),
                StatusCode = header.DO_Valide,
                TotalTTC = header.DO_TotalTTC ?? 0m,
                NetAPayer = header.DO_NetAPayer ?? 0m,
                DeliveryType = header.DO_ModeLivraison,
                PaymentMethod = header.DO_ModePaiement,
                CbCreation = header.cbCreation,
                CbModification = header.cbModification,
                LineCount = lineCount
            };
        }

        private static ProfilUtilisateur? FindProfileForTiers(string? tiers, IReadOnlyList<ProfilUtilisateur> profiles)
        {
            var normalized = Normalize(tiers);
            if (normalized == null)
                return null;

            var direct = profiles.FirstOrDefault(p => string.Equals(Normalize(p.CodeClientSage), normalized, StringComparison.OrdinalIgnoreCase));
            if (direct != null)
                return direct;

            if (Guid.TryParse(normalized, out var guid))
            {
                var byGuid = profiles.FirstOrDefault(p => p.UtilisateurId == guid);
                if (byGuid != null)
                    return byGuid;
            }

            if (normalized.StartsWith("CL", StringComparison.OrdinalIgnoreCase))
            {
                var token = normalized[2..];
                return profiles.FirstOrDefault(p =>
                    p.UtilisateurId.HasValue &&
                    p.UtilisateurId.Value.ToString("N").StartsWith(token, StringComparison.OrdinalIgnoreCase));
            }

            return profiles.FirstOrDefault(p =>
                p.UtilisateurId.HasValue &&
                (string.Equals(p.UtilisateurId.Value.ToString("N"), normalized, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(p.UtilisateurId.Value.ToString(), normalized, StringComparison.OrdinalIgnoreCase)));
        }

        private static HashSet<string> BuildClientAliases(Guid userId, ProfilUtilisateur? profile)
        {
            var aliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddAlias(aliases, profile?.CodeClientSage);
            AddAlias(aliases, userId.ToString());
            AddAlias(aliases, userId.ToString("N"));
            AddAlias(aliases, "CL" + userId.ToString("N")[..15]);
            return aliases;
        }

        private static void AddAlias(HashSet<string> aliases, string? value)
        {
            var normalized = Normalize(value);
            if (normalized != null)
                aliases.Add(normalized);
        }

        private static bool MatchTiers(HashSet<string> aliases, string? tiers)
        {
            var normalized = Normalize(tiers);
            return normalized != null && aliases.Contains(normalized);
        }

        private static bool IsClientUser(List<string> roles, ProfilUtilisateur? profile)
        {
            var hasClientRole = roles.Any(r => string.Equals(r, AppRoles.CLIENT, StringComparison.OrdinalIgnoreCase));
            var isClientProfile = profile?.TypeProfil == TypeProfil.Client;
            return hasClientRole || isClientProfile;
        }

        private static bool IsUserActive(ApplicationUser user)
        {
            return !(user.LockoutEnabled && user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow);
        }

        private static string? Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            return value.Trim();
        }

        private static string? MapClientType(TypeClient? typeClient)
        {
            return typeClient switch
            {
                TypeClient.B2B => "B2B",
                TypeClient.B2C => "B2C",
                _ => null
            };
        }

        private static string ComputeClientDisplay(ProfilUtilisateur? profile, string? fallback)
        {
            if (profile == null)
                return string.IsNullOrWhiteSpace(fallback) ? "-" : fallback.Trim();

            var clientType = MapClientType(profile.TypeClient);
            if (string.Equals(clientType, "B2B", StringComparison.OrdinalIgnoreCase))
                return string.IsNullOrWhiteSpace(profile.NomSociete) ? (profile.NomComplet ?? fallback ?? "-") : profile.NomSociete;

            if (!string.IsNullOrWhiteSpace(profile.NomComplet))
                return profile.NomComplet;

            return !string.IsNullOrWhiteSpace(profile.NomSociete) ? profile.NomSociete : (fallback?.Trim() ?? "-");
        }

        private static string? PickPrimaryRole(List<string> roles)
        {
            foreach (var role in PersonnelRoles)
            {
                if (roles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase)))
                    return role;
            }

            if (roles.Any(r => string.Equals(r, AppRoles.LIVREUR, StringComparison.OrdinalIgnoreCase)))
                return AppRoles.LIVREUR;

            return roles.FirstOrDefault();
        }

        private static int RoleOrder(string? role)
        {
            return role?.ToUpperInvariant() switch
            {
                AppRoles.ADMIN => 0,
                AppRoles.CONFIRMATEUR => 1,
                AppRoles.VENDEUR => 2,
                AppRoles.LIVREUR => 3,
                _ => 9
            };
        }

        private static string NormalizeClientKind(string? kind)
        {
            var normalized = (kind ?? "ALL").Trim().ToUpperInvariant();
            return normalized switch
            {
                "B2B" => "B2B",
                "B2C" => "B2C",
                _ => "ALL"
            };
        }

        private static string NormalizeOrderBucket(string? bucket)
        {
            var normalized = (bucket ?? "ALL").Trim().ToUpperInvariant();
            return normalized switch
            {
                "EN_ATTENTE" => "EN_ATTENTE",
                "TENTATIVE" => "TENTATIVE",
                "REFUSEE" => "REFUSEE",
                "CONFIRMED_BL" => "CONFIRMED_BL",
                _ => "ALL"
            };
        }

        private static string ComputeOrderBucket(F_DOCENTETE header)
        {
            if (header.DO_Type == 1)
                return "CONFIRMED_BL";

            return header.DO_Valide switch
            {
                0 => "EN_ATTENTE",
                2 => "TENTATIVE",
                3 => "REFUSEE",
                _ => "AUTRE"
            };
        }

        private static string BuildOrderStatusLabel(F_DOCENTETE header)
        {
            if (header.DO_Type == 1)
            {
                return header.DO_Valide switch
                {
                    0 => "CONFIRMEE (BL - EN_ATTENTE)",
                    1 => "CONFIRMEE (BL - CONFIRMEE)",
                    2 => "CONFIRMEE (BL - TENTATIVE)",
                    3 => "CONFIRMEE (BL - REFUSEE)",
                    _ => "CONFIRMEE (BL)"
                };
            }

            return header.DocumentStatus;
        }

        private sealed record UserWithProfile(ApplicationUser User, List<string> Roles, ProfilUtilisateur? Profile);
    }
}