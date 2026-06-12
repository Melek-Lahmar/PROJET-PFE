using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.BL;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Vendeur;
using Web_Api.Model;
using Web_Api.Services;
using Web_Api.Services.Print;

namespace Web_Api.Controllers.Vendeur
{
    [ApiController]
    [Route("api/vendeur")]
    [Authorize(Roles = AppRoles.VENDEUR)]
    public class VendeurOrdersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly BonCommandeService _bonCommandeService;
        private readonly BlPdfService _pdf;
        private const short BL_TYPE = 1;

        public VendeurOrdersController(AppDbContext db, BonCommandeService bonCommandeService, BlPdfService pdf)
        {
            _db = db;
            _bonCommandeService = bonCommandeService;
            _pdf = pdf;
        }

        [HttpGet("context")]
        public async Task<ActionResult<VendeurContextResponseDto>> GetContext(CancellationToken ct)
        {
            try
            {
                var vendeurUserId = GetCurrentUserId();
                if (vendeurUserId == null)
                    return Unauthorized();

                var context = await _bonCommandeService.ResolveVendeurContextAsync(vendeurUserId.Value, ct);

                return Ok(new VendeurContextResponseDto
                {
                    VendeurUserId = context.VendeurUserId,
                    VendeurDisplayName = context.VendeurDisplayName,
                    VendeurEmail = context.VendeurEmail,
                    ModeRemise = BonCommandeService.VendorFulfillmentSurPlace,
                    DeliveryTypeStored = BonCommandeService.DeliveryTypePickup,
                    FraisLivraison = 0m,
                    TimbreFiscal = 1m,
                    Depot = new VendeurDepotContextDto
                    {
                        DepotNo = context.Depot.DepotNo,
                        DepotCode = context.Depot.DepotCode,
                        DepotIntitule = context.Depot.DepotIntitule,
                        Address = context.Depot.Address,
                        City = context.Depot.City,
                        PostalCode = context.Depot.PostalCode,
                        Country = context.Depot.Country
                    },
                    PaymentMethods = BonCommandeService.GetVendeurSurPlacePaymentOptions()
                        .Select(x => new VendeurPaymentOptionDto
                        {
                            Code = x.Code,
                            Label = x.Label
                        })
                        .ToList()
                });
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur serveur.", detail = ex.Message });
            }
        }

        [HttpGet("clients")]
        public async Task<ActionResult<List<VendeurClientLookupItemDto>>> SearchClients([FromQuery] string? q, CancellationToken ct)
        {
            var query = (q ?? string.Empty).Trim();

            var profiles = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .Where(x => x.UtilisateurId != null)
                .ToListAsync(ct);

            if (profiles.Count == 0)
                return Ok(new List<VendeurClientLookupItemDto>());

            var userIds = profiles
                .Where(x => x.UtilisateurId.HasValue)
                .Select(x => x.UtilisateurId!.Value)
                .Distinct()
                .ToList();

            var users = await _db.Users
                .AsNoTracking()
                .Where(x => userIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, ct);

            var roles = await _db.UserRoles
                .Where(x => userIds.Contains(x.UserId))
                .Join(_db.Roles, x => x.RoleId, r => r.Id, (x, r) => new { x.UserId, RoleName = r.Name })
                .ToListAsync(ct);

            var rolesByUser = roles
                .GroupBy(x => x.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.RoleName ?? string.Empty).Where(x => !string.IsNullOrWhiteSpace(x)).ToList());

            var items = profiles
                .Where(profile => profile.UtilisateurId.HasValue && users.ContainsKey(profile.UtilisateurId.Value))
                .Where(profile => IsClientProfile(profile, rolesByUser.TryGetValue(profile.UtilisateurId!.Value, out var roleNames) ? roleNames : null))
                .Select(profile =>
                {
                    var user = users[profile.UtilisateurId!.Value];
                    return new VendeurClientLookupItemDto
                    {
                        UserId = user.Id,
                        Email = user.Email ?? string.Empty,
                        DisplayName = ComputeClientDisplay(profile, user.Email),
                        TypeClient = profile.TypeClient switch
                        {
                            TypeClient.B2B => "B2B",
                            TypeClient.B2C => "B2C",
                            _ => null
                        },
                        NomComplet = profile.NomComplet,
                        NomSociete = profile.NomSociete,
                        Telephone = profile.Telephone,
                        Cin = profile.CIN,
                        MatriculeFiscal = profile.MatriculeFiscal,
                        CodeClientSage = profile.CodeClientSage,
                        Adresse = profile.Adresse,
                        AdresseComplementaire = profile.AdresseComplementaire,
                        Gouvernorat = profile.Gouvernorat?.ToString(),
                        Delegation = profile.Delegation,
                        CodePostal = profile.CodePostal
                    };
                })
                .Where(item => string.IsNullOrWhiteSpace(query) || MatchesClientQuery(item, query))
                .OrderBy(item => item.DisplayName ?? item.Email)
                .ThenBy(item => item.Email)
                .Take(30)
                .ToList();

            return Ok(items);
        }

        [HttpPost("orders")]
        public async Task<ActionResult<VendeurOrderResponseDto>> CreateOrder([FromBody] VendeurCreateBonCommandeRequestDto req, CancellationToken ct)
        {
            try
            {
                var vendeurUserId = GetCurrentUserId();
                if (vendeurUserId == null)
                    return Unauthorized();

                var result = await _bonCommandeService.CreateForVendeurAsync(vendeurUserId.Value, req, ct);
                var dto = await BuildOrderResponseAsync(result.Entete, result.Lignes, ct);
                return Ok(dto);
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur serveur.", detail = ex.Message });
            }
        }

        [HttpGet("orders")]
        public async Task<ActionResult<List<VendeurOrderResponseDto>>> GetMyOrders(CancellationToken ct)
        {
            var vendeurUserId = GetCurrentUserId();
            if (vendeurUserId == null)
                return Unauthorized();

            var entetes = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x => x.DO_Domaine == 0 && x.DO_Type == BL_TYPE && x.DO_VendeurUserId == vendeurUserId.Value)
                .OrderByDescending(x => x.DO_Date)
                .ThenByDescending(x => x.cbMarq)
                .ToListAsync(ct);

            if (entetes.Count == 0)
                return Ok(new List<VendeurOrderResponseDto>());

            var pieces = entetes
                .Select(x => x.DO_Piece)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .Cast<string>()
                .ToList();

            var lignes = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(x => pieces.Contains(x.DO_Piece!))
                .OrderBy(x => x.cbMarq)
                .ToListAsync(ct);

            var linesByPiece = lignes
                .GroupBy(x => x.DO_Piece ?? string.Empty)
                .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

            var result = new List<VendeurOrderResponseDto>();

            foreach (var entete in entetes)
            {
                var piece = entete.DO_Piece ?? string.Empty;
                var dto = await BuildOrderResponseAsync(
                    entete,
                    linesByPiece.TryGetValue(piece, out var pieceLines) ? pieceLines : new List<F_DOCLIGNE>(),
                    ct);
                result.Add(dto);
            }

            return Ok(result);
        }

        [HttpGet("orders/{piece}")]
        public async Task<ActionResult<VendeurOrderResponseDto>> GetMyOrderByPiece(string piece, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Piece invalide." });

            var vendeurUserId = GetCurrentUserId();
            if (vendeurUserId == null)
                return Unauthorized();

            var entete = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BL_TYPE &&
                    x.DO_Piece == piece &&
                    x.DO_VendeurUserId == vendeurUserId.Value, ct);

            if (entete == null)
                return NotFound(new { message = "Commande vendeur introuvable." });

            var lignes = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(x => x.DO_Piece == piece)
                .OrderBy(x => x.cbMarq)
                .ToListAsync(ct);

            return Ok(await BuildOrderResponseAsync(entete, lignes, ct));
        }

        [HttpGet("orders/{piece}/facture-pdf")]
        public async Task<IActionResult> GetFacturePdf(string piece, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Piece invalide." });

            var vendeurUserId = GetCurrentUserId();
            if (vendeurUserId == null)
                return Unauthorized();

            var entete = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BL_TYPE &&
                    x.DO_Piece == piece &&
                    x.DO_VendeurUserId == vendeurUserId.Value, ct);

            if (entete == null)
                return NotFound(new { message = "Commande introuvable." });

            var lignes = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(x => x.DO_Piece == piece)
                .OrderBy(x => x.cbMarq)
                .ToListAsync(ct);

            // Résolution client
            var customer = await ResolveCustomerAsync(entete, ct);
            var depot = await ResolveDepotAsync(entete.DE_No, ct);
            var vendeurName = await ResolveVendeurDisplayNameAsync(entete.DO_VendeurUserId, ct);

            var dto = new FacturePdfDto
            {
                Piece = entete.DO_Piece ?? "",
                Date = entete.DO_Date,
                ClientCode = entete.DO_Tiers ?? "",
                ClientName = customer?.DisplayName,
                ClientPhone = customer?.Telephone ?? entete.DO_TelephoneLivraison,
                ClientAddress = customer?.Adresse ?? entete.DO_AdresseLivraison,
                ClientCity = customer?.Gouvernorat ?? entete.DO_VilleLivraison,
                ClientPostalCode = customer?.CodePostal ?? entete.DO_CodePostalLivraison,
                ClientMatriculeFiscal = customer?.MatriculeFiscal,
                ClientRegistreCommerce = customer?.RegistreCommerce,
                VendeurName = vendeurName,
                DepotNo = entete.DE_No ?? 0,
                DepotIntitule = depot?.DepotIntitule,
                PaymentMethod = entete.DO_ModePaiement,
                TotalHT = entete.DO_TotalHT ?? 0m,
                TotalTTC = entete.DO_TotalTTC ?? 0m,
                FraisLivraison = entete.DO_FraisLivraison ?? 0m,
                TimbreFiscal = entete.DO_TimbreFiscal ?? 0m,
                NetAPayer = entete.DO_NetAPayer ?? 0m,
                Lines = lignes.Select(l => new FactureLineDto
                {
                    ArticleRef = l.AR_Ref ?? "",
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountHT = l.DL_MontantHT ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList()
            };

            var settings = await _pdf.GetSettingsAsync(ct);
            var logoBytes = await _pdf.FetchLogoBytesAsync(settings, ct);
            var pdfBytes = _pdf.GenerateFacturePdf(dto, settings, logoBytes);

            return File(pdfBytes, "application/pdf", $"facture-{piece}.pdf");
        }

        private Guid? GetCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var userId) ? userId : null;
        }

        private async Task<VendeurOrderResponseDto> BuildOrderResponseAsync(F_DOCENTETE entete, IEnumerable<F_DOCLIGNE> lignes, CancellationToken ct)
        {
            var lines = lignes?.ToList() ?? new List<F_DOCLIGNE>();
            var customer = await ResolveCustomerAsync(entete, ct);
            var depot = await ResolveDepotAsync(entete.DE_No, ct);
            var vendeurDisplayName = await ResolveVendeurDisplayNameAsync(entete.DO_VendeurUserId, ct);

            return new VendeurOrderResponseDto
            {
                Piece = entete.DO_Piece ?? string.Empty,
                Date = entete.DO_Date,
                ClientCode = entete.DO_Tiers ?? string.Empty,
                VendeurUserId = entete.DO_VendeurUserId,
                VendeurDisplayName = vendeurDisplayName,
                DepotNo = entete.DE_No ?? 0,
                DepotCode = depot?.DepotCode,
                DepotIntitule = depot?.DepotIntitule,
                DepotAddress = depot?.Address,
                DepotCity = depot?.City,
                DepotPostalCode = depot?.PostalCode,
                ModeRemise = BonCommandeService.GetVendeurModeRemise(entete.DO_ModeLivraison),
                Status = entete.DocumentStatus,
                StatusCode = entete.DO_Valide,
                TimelineStage = entete.DO_Valide switch
                {
                    1 => "CONFIRMED",
                    2 => "ATTEMPTED",
                    3 => "REFUSED",
                    _ => "PENDING"
                },
                TotalHT = entete.DO_TotalHT ?? 0m,
                TotalTTC = entete.DO_TotalTTC ?? 0m,
                FraisLivraison = entete.DO_FraisLivraison ?? 0m,
                TimbreFiscal = entete.DO_TimbreFiscal ?? 0m,
                TotalBeforeDiscount = entete.TotalBeforeDiscount ?? entete.DO_TotalTTC ?? 0m,
                B2BDiscountRate = entete.B2BDiscountRate,
                B2BDiscountAmount = entete.B2BDiscountAmount ?? 0m,
                DiscountSource = entete.DiscountSource,
                NetAPayer = entete.DO_NetAPayer ?? 0m,
                DeliveryType = entete.DO_ModeLivraison,
                PaymentMethod = entete.DO_ModePaiement,
                Address = entete.DO_AdresseLivraison ?? depot?.Address,
                City = entete.DO_VilleLivraison ?? depot?.City,
                PostalCode = entete.DO_CodePostalLivraison ?? depot?.PostalCode,
                Latitude = entete.DO_LatitudeLivraison,
                Longitude = entete.DO_LongitudeLivraison,
                Customer = customer,
                Lines = lines.Select(l => new BonCommandeLineResponseDto
                {
                    ArticleRef = l.AR_Ref ?? string.Empty,
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountHT = l.DL_MontantHT ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList()
            };
        }

        private async Task<VendeurOrderCustomerDto> ResolveCustomerAsync(F_DOCENTETE entete, CancellationToken ct)
        {
            var customerMode = (entete.DO_ClientMode ?? BonCommandeService.CustomerModeExisting).Trim().ToUpperInvariant();

            if (customerMode == BonCommandeService.CustomerModePassager)
            {
                return new VendeurOrderCustomerDto
                {
                    CustomerMode = BonCommandeService.CustomerModePassager,
                    ClientUserId = null,
                    ClientCode = entete.DO_Tiers,
                    TypeClient = entete.DO_PassagerTypeClient,
                    DisplayName = ComputeSnapshotDisplay(entete.DO_PassagerTypeClient, entete.DO_PassagerNomSociete, entete.DO_PassagerNomComplet, entete.DO_Tiers),
                    Email = null,
                    NomComplet = entete.DO_PassagerNomComplet,
                    Telephone = entete.DO_PassagerTelephone,
                    Cin = entete.DO_PassagerCIN,
                    NomSociete = entete.DO_PassagerNomSociete,
                    MatriculeFiscal = entete.DO_PassagerMatriculeFiscal,
                    RegistreCommerce = entete.DO_PassagerRegistreCommerce,
                    NumeroTVA = entete.DO_PassagerNumeroTVA,
                    Gouvernorat = entete.DO_PassagerGouvernorat,
                    Delegation = entete.DO_PassagerDelegation,
                    Adresse = entete.DO_PassagerAdresse,
                    AdresseComplementaire = entete.DO_PassagerAdresseComplementaire,
                    CodePostal = entete.DO_PassagerCodePostal
                };
            }

            ProfilUtilisateur? profile = null;
            ApplicationUser? user = null;

            if (entete.DO_ClientUserId.HasValue)
            {
                var userId = entete.DO_ClientUserId.Value;
                profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);
                user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
            }

            if (profile == null && !string.IsNullOrWhiteSpace(entete.DO_Tiers))
            {
                profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.CodeClientSage == entete.DO_Tiers, ct);
                if (profile?.UtilisateurId != null)
                {
                    user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == profile.UtilisateurId.Value, ct);
                }
            }

            if (profile == null)
            {
                return new VendeurOrderCustomerDto
                {
                    CustomerMode = BonCommandeService.CustomerModeExisting,
                    ClientUserId = entete.DO_ClientUserId,
                    ClientCode = entete.DO_Tiers,
                    DisplayName = entete.DO_Tiers,
                    Email = user?.Email
                };
            }

            return new VendeurOrderCustomerDto
            {
                CustomerMode = BonCommandeService.CustomerModeExisting,
                ClientUserId = profile.UtilisateurId,
                ClientCode = entete.DO_Tiers,
                TypeClient = profile.TypeClient switch
                {
                    TypeClient.B2B => "B2B",
                    TypeClient.B2C => "B2C",
                    _ => null
                },
                DisplayName = ComputeClientDisplay(profile, user?.Email ?? entete.DO_Tiers),
                Email = user?.Email,
                NomComplet = profile.NomComplet,
                Telephone = profile.Telephone,
                Cin = profile.CIN,
                NomSociete = profile.NomSociete,
                MatriculeFiscal = profile.MatriculeFiscal,
                RegistreCommerce = profile.RegistreCommerce,
                NumeroTVA = profile.NumeroTVA,
                Gouvernorat = profile.Gouvernorat?.ToString(),
                Delegation = profile.Delegation,
                Adresse = profile.Adresse,
                AdresseComplementaire = profile.AdresseComplementaire,
                CodePostal = profile.CodePostal
            };
        }

        private async Task<BonCommandeService.ResolvedDepot?> ResolveDepotAsync(int? depotNo, CancellationToken ct)
        {
            if (depotNo == null || depotNo <= 0)
                return null;

            var depot = await _db.F_DEPOTS
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DE_No == depotNo.Value, ct);

            if (depot == null)
                return null;

            return new BonCommandeService.ResolvedDepot
            {
                DepotNo = depot.DE_No,
                DepotCode = TrimOrNull(depot.DE_Code),
                DepotIntitule = TrimOrNull(depot.DE_Intitule),
                Address = BuildDepotAddressLine(depot),
                City = LimitLength(TrimOrNull(depot.DE_Ville), 35),
                PostalCode = LimitLength(TrimOrNull(depot.DE_CodePostal), 9),
                Country = TrimOrNull(depot.DE_Pays)
            };
        }

        private async Task<string?> ResolveVendeurDisplayNameAsync(Guid? vendeurUserId, CancellationToken ct)
        {
            if (!vendeurUserId.HasValue || vendeurUserId == Guid.Empty)
                return null;

            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UtilisateurId == vendeurUserId.Value, ct);

            if (!string.IsNullOrWhiteSpace(profile?.NomComplet))
                return profile.NomComplet!.Trim();

            if (!string.IsNullOrWhiteSpace(profile?.CodeEmploye))
                return profile.CodeEmploye!.Trim();

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == vendeurUserId.Value, ct);

            return TrimOrNull(user?.Email);
        }

        private static bool IsClientProfile(ProfilUtilisateur profile, List<string>? roles)
        {
            var roleNames = roles ?? new List<string>();
            if (roleNames.Any(r => string.Equals(r, AppRoles.ADMIN, StringComparison.OrdinalIgnoreCase)
                                || string.Equals(r, AppRoles.VENDEUR, StringComparison.OrdinalIgnoreCase)
                                || string.Equals(r, AppRoles.CONFIRMATEUR, StringComparison.OrdinalIgnoreCase)
                                || string.Equals(r, AppRoles.LIVREUR, StringComparison.OrdinalIgnoreCase)))
            {
                return false;
            }

            return profile.TypeProfil == TypeProfil.Client
                   || roleNames.Any(r => string.Equals(r, AppRoles.CLIENT, StringComparison.OrdinalIgnoreCase));
        }

        private static string? ComputeClientDisplay(ProfilUtilisateur? profile, string? fallback)
        {
            if (profile == null)
                return fallback?.Trim();

            if (profile.TypeClient == TypeClient.B2B && !string.IsNullOrWhiteSpace(profile.NomSociete))
                return profile.NomSociete;

            if (!string.IsNullOrWhiteSpace(profile.NomComplet))
                return profile.NomComplet;

            if (!string.IsNullOrWhiteSpace(profile.NomSociete))
                return profile.NomSociete;

            if (!string.IsNullOrWhiteSpace(profile.CodeClientSage))
                return profile.CodeClientSage;

            return fallback?.Trim();
        }

        private static bool MatchesClientQuery(VendeurClientLookupItemDto item, string query)
        {
            var normalized = query.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
                return true;

            return ContainsInsensitive(item.Email, normalized)
                   || ContainsInsensitive(item.DisplayName, normalized)
                   || ContainsInsensitive(item.NomComplet, normalized)
                   || ContainsInsensitive(item.NomSociete, normalized)
                   || ContainsInsensitive(item.Telephone, normalized)
                   || ContainsInsensitive(item.Cin, normalized)
                   || ContainsInsensitive(item.MatriculeFiscal, normalized)
                   || ContainsInsensitive(item.CodeClientSage, normalized)
                   || ContainsInsensitive(item.Adresse, normalized)
                   || ContainsInsensitive(item.Delegation, normalized)
                   || ContainsInsensitive(item.Gouvernorat, normalized);
        }

        private static bool ContainsInsensitive(string? source, string value)
        {
            return !string.IsNullOrWhiteSpace(source)
                && source.Contains(value, StringComparison.OrdinalIgnoreCase);
        }

        private static string? ComputeSnapshotDisplay(string? typeClient, string? nomSociete, string? nomComplet, string? fallback)
        {
            var normalized = (typeClient ?? string.Empty).Trim().ToUpperInvariant();
            if (normalized == "B2B" && !string.IsNullOrWhiteSpace(nomSociete))
                return nomSociete;

            if (normalized == "B2C" && !string.IsNullOrWhiteSpace(nomComplet))
                return nomComplet;

            return !string.IsNullOrWhiteSpace(nomSociete)
                ? nomSociete
                : (!string.IsNullOrWhiteSpace(nomComplet) ? nomComplet : fallback);
        }

        private static string? BuildDepotAddressLine(F_DEPOT depot)
        {
            var parts = new[]
            {
                TrimOrNull(depot.DE_Adresse),
                TrimOrNull(depot.DE_Complement)
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToArray();

            if (parts.Length == 0)
                return null;

            return LimitLength(string.Join(", ", parts), 150);
        }

        private static string? TrimOrNull(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        private static string? LimitLength(string? value, int maxLength)
        {
            var trimmed = TrimOrNull(value);
            if (trimmed == null)
                return null;

            return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
        }
    }
}
