using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.BL;
using Web_Api.Model;
using Web_Api.Services.Print;

namespace Web_Api.Controllers.Vendeur
{
    [ApiController]
    [Route("api/vendeur/manifeste")]
    [Authorize(Roles = AppRoles.VENDEUR + "," + AppRoles.ADMIN)]
    public class VendeurManifestController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly BlPdfService _pdf;
        private const short BL_TYPE = 1;

        public VendeurManifestController(AppDbContext db, BlPdfService pdf)
        {
            _db = db;
            _pdf = pdf;
        }

        // GET /api/vendeur/manifeste/en-attente
        // TOUTES les commandes encore au dépôt (imprimées ou non). Une commande
        // disparaît d'ici uniquement quand le LIVREUR change son statut (prise en
        // charge) → elle n'est alors plus « au dépôt ». L'impression ne la retire PAS.
        [HttpGet("en-attente")]
        public async Task<IActionResult> GetEnAttente(CancellationToken ct)
        {
            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var data = await LoadDepotPendingAsync(depotNo.Value, ct);
            return Ok(new
            {
                data.DepotGouvernorat,
                data.DepotIntitule,
                items = data.Items   // tous les BL au dépôt
            });
        }

        // GET /api/vendeur/manifeste/imprime
        // File d'impression : BLs au dépôt PAS encore imprimés. Dès qu'on imprime
        // (tout ou un seul → création d'un bloc manifeste), le BL devient imprimé,
        // quitte cet onglet et part dans l'Historique.
        [HttpGet("imprime")]
        public async Task<IActionResult> GetImprime(CancellationToken ct)
        {
            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var data = await LoadDepotPendingAsync(depotNo.Value, ct);
            return Ok(new
            {
                data.DepotGouvernorat,
                data.DepotIntitule,
                items = data.Items.Where(i => !i.Printed).ToList()
            });
        }

        // Charge tous les BLs « encore au dépôt » (imprimés ou non) du dépôt, classés
        // DOMICILE / TRANSIT, chaque item portant le flag Printed.
        private async Task<DepotPendingResult> LoadDepotPendingAsync(int depotNo, CancellationToken ct)
        {
            // Infos du dépôt + gouvernorat principal
            var depot = await _db.F_DEPOTS.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DE_No == depotNo, ct);

            var depotZone = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(z => z.DepotNo == depotNo && z.IsPrimary)
                .FirstOrDefaultAsync(ct)
                ?? await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(z => z.DepotNo == depotNo)
                    .FirstOrDefaultAsync(ct);

            var depotGouvernorat = depotZone?.Gouvernorat;

            // Tous les BLs du dépôt
            var allEntetes = await _db.F_DOCENTETES.AsNoTracking()
                .Where(e => e.DO_Domaine == 0 && e.DO_Type == BL_TYPE && e.DE_No == depotNo && e.DO_Piece != null)
                .ToListAsync(ct);

            var depotIntitule = depot?.DE_Intitule?.Trim() ?? depot?.DE_Code;

            if (!allEntetes.Any())
                return new DepotPendingResult { DepotGouvernorat = depotGouvernorat, DepotIntitule = depotIntitule, Items = new() };

            var allPieces = allEntetes.Select(e => e.DO_Piece!).ToList();

            // Livraisons
            var livraisons = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(l => l.DO_Piece != null && allPieces.Contains(l.DO_Piece!))
                .ToDictionaryAsync(l => l.DO_Piece!, ct);

            // Transferts inter-dépôt dont ce dépôt est la SOURCE
            var transfertsRaw = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(t => t.SourceDepotNo == depotNo && allPieces.Contains(t.DoPiece))
                .ToListAsync(ct);
            var transferts = transfertsRaw.GroupBy(t => t.DoPiece)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Pièces déjà imprimées dans un ManifestePrintBloc pour ce dépôt
            var printedPieces = (await _db.ManifestePrintBlocLines
                .AsNoTracking()
                .Where(l => _db.ManifestePrintBlocs
                    .Where(b => b.DepotNo == depotNo)
                    .Select(b => b.Id)
                    .Contains(l.BlocId))
                .Select(l => l.BLPiece)
                .ToListAsync(ct))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            // Profils clients (pour gouvernorat des clients existants)
            var clientUserIds = allEntetes
                .Where(e => e.DO_ClientUserId.HasValue)
                .Select(e => e.DO_ClientUserId!.Value)
                .Distinct().ToList();
            var clientProfiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId.HasValue && clientUserIds.Contains(p.UtilisateurId.Value))
                .ToDictionaryAsync(p => p.UtilisateurId!.Value, ct);

            // Tous les dépôts + zones (pour nommer le dépôt destination des transits)
            var allDepots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
            var allDepotZones = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(z => z.IsPrimary).ToListAsync(ct);

            // Statuts livraison considérés "encore au dépôt, pas parti"
            var awaitingLivStatuts = new HashSet<short>
            {
                DeliveryStatusCodes.Confirme,                // 0
                DeliveryStatusCodes.Depot,                   // 4
                DeliveryStatusCodes.DepotEnCoursDePreparation, // 6
                DeliveryStatusCodes.DepotPret,               // 7
                DeliveryStatusCodes.Reporte                  // 5
            };

            // Tous les BLs encore « au dépôt » (pas encore partis), imprimés ou non.
            // Le tri imprimé / à-imprimer se fait ensuite via le flag Printed.
            var stillAtDepot = allEntetes.Where(e =>
            {
                var piece = e.DO_Piece!;
                transferts.TryGetValue(piece, out var trs);

                // BL de type TRANSIT : encore au dépôt tant que le transfert n'a pas démarré
                if (trs != null && trs.Count > 0)
                    return trs.All(t => TransitStatuses.IsWaiting(t.Status));

                // Sinon : vérifier la livraison classique
                if (!livraisons.TryGetValue(piece, out var li)) return true; // pas de suivi = au dépôt
                return awaitingLivStatuts.Contains(li.LI_Statut) && !li.HasEverBeenPickedUp;
            })
            .OrderByDescending(e => e.DO_Date)
            .ToList();

            // Lignes articles uniquement pour les BLs filtrés
            var filteredPieces = stillAtDepot.Select(e => e.DO_Piece!).ToList();
            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BL_TYPE && l.DO_Piece != null && filteredPieces.Contains(l.DO_Piece!))
                .ToListAsync(ct);
            var byPiece = lignes.GroupBy(l => l.DO_Piece ?? "").ToDictionary(g => g.Key, g => g.ToList());

            // Construction des DTOs avec classification
            var items = stillAtDepot.Select(e =>
            {
                byPiece.TryGetValue(e.DO_Piece ?? "", out var ls);
                ls ??= new();
                var dto = MapToDto(e, ls);
                dto.Printed = printedPieces.Contains(e.DO_Piece!);

                // Nom du client
                dto.ClientName = ResolveClientName(e, clientProfiles);

                // Gouvernorat du client
                var clientGouv = ResolveClientGouvernorat(e, clientProfiles);

                // Classification TRANSIT vs DOMICILE
                transferts.TryGetValue(e.DO_Piece!, out var trs);
                bool isTransit = trs != null && trs.Count > 0
                    || (!string.IsNullOrWhiteSpace(clientGouv)
                        && !string.IsNullOrWhiteSpace(depotGouvernorat)
                        && !string.Equals(clientGouv, depotGouvernorat, StringComparison.OrdinalIgnoreCase));

                dto.RouteType = isTransit ? "TRANSIT" : "DOMICILE";

                if (isTransit)
                {
                    dto.DestinationGouvernorat = clientGouv;

                    // Dépôt destination depuis F_TRANSFERT s'il existe, sinon via zone
                    var destDepotNo = trs?.FirstOrDefault()?.DestinationDepotNo;
                    if (!destDepotNo.HasValue && !string.IsNullOrWhiteSpace(clientGouv))
                    {
                        var zone = allDepotZones.FirstOrDefault(z =>
                            string.Equals(z.Gouvernorat, clientGouv, StringComparison.OrdinalIgnoreCase));
                        destDepotNo = zone?.DepotNo;
                    }
                    if (destDepotNo.HasValue)
                    {
                        var destDepot = allDepots.FirstOrDefault(d => d.DE_No == destDepotNo.Value);
                        dto.DestinationDepotName = destDepot?.DE_Intitule?.Trim() ?? destDepot?.DE_Code?.Trim();
                    }
                }

                return dto;
            }).ToList();

            return new DepotPendingResult
            {
                DepotGouvernorat = depotGouvernorat,
                DepotIntitule = depotIntitule,
                Items = items
            };
        }

        // POST /api/vendeur/manifeste/print
        // Sélectionne des BLs → génère un bloc + PDF (domicile ou transit selon req.Type)
        [HttpPost("print")]
        public async Task<IActionResult> Print([FromBody] ManifestePrintRequestDto req, CancellationToken ct)
        {
            if (req.BLPieces == null || !req.BLPieces.Any())
                return BadRequest(new { message = "Sélectionnez au moins un BL." });

            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var entetes = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(e =>
                    e.DO_Domaine == 0 &&
                    e.DO_Type == BL_TYPE &&
                    e.DE_No == depotNo &&
                    e.DO_Piece != null &&
                    req.BLPieces.Contains(e.DO_Piece!))
                .ToListAsync(ct);

            if (!entetes.Any())
                return NotFound(new { message = "Aucun BL trouvé pour ce dépôt." });

            // Charger lignes articles
            var pieces = entetes.Select(e => e.DO_Piece!).ToList();
            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BL_TYPE && l.DO_Piece != null && pieces.Contains(l.DO_Piece!))
                .ToListAsync(ct);
            var lignesByPiece = lignes.GroupBy(l => l.DO_Piece ?? "").ToDictionary(g => g.Key, g => g.ToList());

            var userId = GetUserId();

            // Enregistrer le bloc (même logique pour DOMICILE et TRANSIT)
            var bloc = new ManifestePrintBloc
            {
                PrintedAt = DateTime.UtcNow,
                PrintedByUserId = userId,
                DepotNo = depotNo.Value,
                TotalAmount = entetes.Sum(e => e.DO_NetAPayer ?? 0m),
                BLCount = entetes.Count,
                Lines = entetes.Select(e => new ManifestePrintBlocLine
                {
                    BLPiece = e.DO_Piece ?? "",
                    ClientCode = e.DO_Tiers,
                    Amount = e.DO_NetAPayer ?? 0m,
                    ClientAddress = e.DO_AdresseLivraison,
                    ClientCity = e.DO_VilleLivraison,
                    ClientPhone = e.DO_TelephoneLivraison
                }).ToList()
            };

            _db.ManifestePrintBlocs.Add(bloc);
            await _db.SaveChangesAsync(ct);

            var settings = await _pdf.GetSettingsAsync(ct);
            var logoBytes = await _pdf.FetchLogoBytesAsync(settings, ct);

            // ── TRANSIT ──────────────────────────────────────────────────────
            if (string.Equals(req.Type, "TRANSIT", StringComparison.OrdinalIgnoreCase))
            {
                // Infos dépôt source
                var sourceDepot = await _db.F_DEPOTS.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.DE_No == depotNo, ct);
                var sourceZone = await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(z => z.DepotNo == depotNo && z.IsPrimary).FirstOrDefaultAsync(ct)
                    ?? await _db.F_DEPOT_ZONES.AsNoTracking()
                        .Where(z => z.DepotNo == depotNo).FirstOrDefaultAsync(ct);

                // Profils clients
                var clientUserIds = entetes.Where(e => e.DO_ClientUserId.HasValue)
                    .Select(e => e.DO_ClientUserId!.Value).Distinct().ToList();
                var clientProfiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .Where(p => p.UtilisateurId.HasValue && clientUserIds.Contains(p.UtilisateurId.Value))
                    .ToDictionaryAsync(p => p.UtilisateurId!.Value, ct);

                // Transferts
                var transfertsRaw = await _db.F_TRANSFERTS.AsNoTracking()
                    .Where(t => t.SourceDepotNo == depotNo && pieces.Contains(t.DoPiece))
                    .ToListAsync(ct);
                var transferts = transfertsRaw.GroupBy(t => t.DoPiece)
                    .ToDictionary(g => g.Key, g => g.ToList());

                // Tous les dépôts + zones pour nommer destination
                var allDepots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
                var allDepotZones = await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(z => z.IsPrimary).ToListAsync(ct);

                // Construire DTOs
                var dtos = entetes.Select(e =>
                {
                    lignesByPiece.TryGetValue(e.DO_Piece ?? "", out var ls);
                    var dto = MapToDto(e, ls ?? new());
                    dto.ClientName = ResolveClientName(e, clientProfiles);
                    var clientGouv = ResolveClientGouvernorat(e, clientProfiles);
                    dto.DestinationGouvernorat = clientGouv;
                    dto.RouteType = "TRANSIT";

                    transferts.TryGetValue(e.DO_Piece!, out var trs);
                    var destDepotNo = trs?.FirstOrDefault()?.DestinationDepotNo;
                    if (!destDepotNo.HasValue && !string.IsNullOrWhiteSpace(clientGouv))
                    {
                        var zone = allDepotZones.FirstOrDefault(z =>
                            string.Equals(z.Gouvernorat, clientGouv, StringComparison.OrdinalIgnoreCase));
                        destDepotNo = zone?.DepotNo;
                    }
                    if (destDepotNo.HasValue)
                    {
                        var destDepot = allDepots.FirstOrDefault(d => d.DE_No == destDepotNo.Value);
                        dto.DestinationDepotName = destDepot?.DE_Intitule?.Trim() ?? destDepot?.DE_Code?.Trim();
                    }
                    return dto;
                }).ToList();

                // Regrouper par gouvernorat destination
                var groups = dtos
                    .GroupBy(d => d.DestinationGouvernorat ?? "Inconnu")
                    .Select(g => new TransitGroupDto
                    {
                        DestinationGouvernorat = g.Key,
                        DestinationDepotName = g.First().DestinationDepotName,
                        GroupTotal = g.Sum(x => x.NetAPayer),
                        Items = g.OrderByDescending(x => x.Date).ToList()
                    })
                    .OrderBy(g => g.DestinationGouvernorat)
                    .ToList();

                var transitData = new TransitManifestDto
                {
                    BlocId = bloc.Id,
                    PrintedAt = bloc.PrintedAt,
                    SourceDepotIntitule = sourceDepot?.DE_Intitule?.Trim() ?? sourceDepot?.DE_Code,
                    SourceGouvernorat = sourceZone?.Gouvernorat,
                    Groups = groups
                };

                var pdfTransit = _pdf.GenerateTransitManifestePdf(transitData, settings, logoBytes);
                return File(pdfTransit, "application/pdf", $"manifeste-transit-{bloc.Id}.pdf");
            }

            // ── DOMICILE (par défaut) ─────────────────────────────────────────
            var pdfBytes = _pdf.GenerateManifestePdf(bloc, bloc.Lines.ToList(), settings, logoBytes);
            return File(pdfBytes, "application/pdf", $"manifeste-{bloc.Id}.pdf");
        }

        // GET /api/vendeur/manifeste/historique?type=DOMICILE|TRANSIT
        // Le type est dérivé à la volée : un bloc est TRANSIT s'il contient au moins
        // un BL faisant l'objet d'un transfert dont ce dépôt est la source.
        [HttpGet("historique")]
        public async Task<IActionResult> GetHistorique([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? type = null, CancellationToken ct = default)
        {
            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var allBlocs = await _db.ManifestePrintBlocs
                .AsNoTracking()
                .Where(b => b.DepotNo == depotNo)
                .OrderByDescending(b => b.PrintedAt)
                .Select(b => new
                {
                    b.Id,
                    b.PrintedAt,
                    b.BLCount,
                    b.TotalAmount,
                    b.DepotNo,
                    Pieces = b.Lines.Select(l => l.BLPiece).ToList()
                })
                .ToListAsync(ct);

            if (!string.IsNullOrWhiteSpace(type))
            {
                var transitPieces = (await _db.F_TRANSFERTS.AsNoTracking()
                    .Where(t => t.SourceDepotNo == depotNo)
                    .Select(t => t.DoPiece)
                    .ToListAsync(ct))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                bool wantTransit = string.Equals(type, "TRANSIT", StringComparison.OrdinalIgnoreCase);
                allBlocs = allBlocs
                    .Where(b => b.Pieces.Any(p => transitPieces.Contains(p)) == wantTransit)
                    .ToList();
            }

            var total = allBlocs.Count;
            var items = allBlocs
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new { b.Id, b.PrintedAt, b.BLCount, b.TotalAmount, b.DepotNo })
                .ToList();

            return Ok(new { total, page, pageSize, items });
        }

        // GET /api/vendeur/manifeste/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetBloc(int id, CancellationToken ct)
        {
            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var bloc = await _db.ManifestePrintBlocs
                .AsNoTracking()
                .Include(b => b.Lines)
                .FirstOrDefaultAsync(b => b.Id == id && b.DepotNo == depotNo, ct);

            if (bloc == null) return NotFound(new { message = "Manifeste introuvable." });

            // Mêmes données complètes que l'onglet « En attente » (nom client,
            // destination, date, articles, classification), pour un affichage identique.
            var pieces = bloc.Lines
                .Select(l => l.BLPiece)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Distinct()
                .ToList();
            var items = await BuildItemsForPiecesAsync(bloc.DepotNo, pieces, ct);

            return Ok(new
            {
                bloc.Id,
                bloc.PrintedAt,
                bloc.BLCount,
                bloc.TotalAmount,
                bloc.DepotNo,
                items
            });
        }

        // Reconstruit les BL complets (mêmes DTO que « En attente ») pour une liste
        // de pièces — utilisé par le détail d'un bloc d'historique afin d'afficher
        // nom client / destination / date / articles, et pas seulement le N° BL.
        private async Task<List<BonLivraisonResponseDto>> BuildItemsForPiecesAsync(
            int depotNo, List<string> pieces, CancellationToken ct)
        {
            if (pieces.Count == 0) return new();

            var entetes = await _db.F_DOCENTETES.AsNoTracking()
                .Where(e => e.DO_Domaine == 0 && e.DO_Type == BL_TYPE && e.DO_Piece != null && pieces.Contains(e.DO_Piece!))
                .ToListAsync(ct);

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BL_TYPE && l.DO_Piece != null && pieces.Contains(l.DO_Piece!))
                .ToListAsync(ct);
            var byPiece = lignes.GroupBy(l => l.DO_Piece ?? "").ToDictionary(g => g.Key, g => g.ToList());

            var clientUserIds = entetes.Where(e => e.DO_ClientUserId.HasValue)
                .Select(e => e.DO_ClientUserId!.Value).Distinct().ToList();
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId.HasValue && clientUserIds.Contains(p.UtilisateurId.Value))
                .ToDictionaryAsync(p => p.UtilisateurId!.Value, ct);

            var items = new List<BonLivraisonResponseDto>();
            foreach (var piece in pieces) // conserve l'ordre du bloc
            {
                var e = entetes.FirstOrDefault(x => x.DO_Piece == piece);
                if (e == null) continue;
                byPiece.TryGetValue(piece, out var ls);
                var dto = MapToDto(e, ls ?? new());
                dto.ClientName = ResolveClientName(e, profiles);
                await EnrichBlRoutingAsync(dto, e, depotNo, ct);
                items.Add(dto);
            }
            return items;
        }

        // GET /api/vendeur/manifeste/{id}/pdf  — réimpression du bloc entier
        [HttpGet("{id:int}/pdf")]
        public async Task<IActionResult> GetBlocPdf(int id, CancellationToken ct)
        {
            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var bloc = await _db.ManifestePrintBlocs
                .Include(b => b.Lines)
                .FirstOrDefaultAsync(b => b.Id == id && b.DepotNo == depotNo, ct);

            if (bloc == null) return NotFound(new { message = "Manifeste introuvable." });

            var settings = await _pdf.GetSettingsAsync(ct);
            var logoBytes = await _pdf.FetchLogoBytesAsync(settings, ct);
            var pdfBytes = _pdf.GenerateManifestePdf(bloc, bloc.Lines.ToList(), settings, logoBytes);
            return File(pdfBytes, "application/pdf", $"manifeste-{bloc.Id}.pdf");
        }

        // GET /api/vendeur/manifeste/bl/{piece}/pdf  — impression d'un BL seul
        [HttpGet("bl/{piece}/pdf")]
        public async Task<IActionResult> GetBlPdf(string piece, CancellationToken ct)
        {
            var depotNo = await GetVendeurDepotAsync(ct);
            if (depotNo == null) return BadRequest(new { message = "Votre compte n'est pas rattaché à un dépôt." });

            var e = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Domaine == 0 && x.DO_Type == BL_TYPE && x.DO_Piece == piece && x.DE_No == depotNo, ct);

            if (e == null) return NotFound(new { message = "BL introuvable." });

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BL_TYPE && l.DO_Piece == piece)
                .ToListAsync(ct);

            var dto = MapToDto(e, lignes);
            await EnrichBlRoutingAsync(dto, e, depotNo.Value, ct);

            var settings = await _pdf.GetSettingsAsync(ct);
            var cfg = await _pdf.GetFieldsConfigAsync(ct);
            var logoBytes = await _pdf.FetchLogoBytesAsync(settings, ct);
            var pdfBytes = _pdf.GenerateBLPdf(dto, settings, cfg, logoBytes: logoBytes);
            return File(pdfBytes, "application/pdf", $"bl-{piece}.pdf");
        }

        // Classe un BL unitaire DOMICILE / TRANSIT et renseigne le gouvernorat +
        // dépôt de destination, afin que le PDF d'un BL imprimé seul conserve
        // l'information de routage (même logique que GetEnAttente).
        private async Task EnrichBlRoutingAsync(
            BonLivraisonResponseDto dto, Web_Api.Model.F_DOCENTETE e, int depotNo, CancellationToken ct)
        {
            // Gouvernorat principal du dépôt source
            var depotZone = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(z => z.DepotNo == depotNo && z.IsPrimary).FirstOrDefaultAsync(ct)
                ?? await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(z => z.DepotNo == depotNo).FirstOrDefaultAsync(ct);
            var depotGouvernorat = depotZone?.Gouvernorat;

            // Profil client (pour son gouvernorat)
            var profiles = new Dictionary<Guid, Web_Api.Auth.Entities.ProfilUtilisateur>();
            if (e.DO_ClientUserId.HasValue)
            {
                var p = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.UtilisateurId == e.DO_ClientUserId.Value, ct);
                if (p != null) profiles[e.DO_ClientUserId.Value] = p;
            }
            var clientGouv = ResolveClientGouvernorat(e, profiles);

            // Transferts dont ce dépôt est la source
            var trs = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(t => t.SourceDepotNo == depotNo && t.DoPiece == dto.Piece)
                .ToListAsync(ct);

            bool isTransit = trs.Count > 0
                || (!string.IsNullOrWhiteSpace(clientGouv)
                    && !string.IsNullOrWhiteSpace(depotGouvernorat)
                    && !string.Equals(clientGouv, depotGouvernorat, StringComparison.OrdinalIgnoreCase));

            dto.RouteType = isTransit ? "TRANSIT" : "DOMICILE";
            dto.DestinationGouvernorat = clientGouv;

            if (isTransit)
            {
                var destDepotNo = trs.FirstOrDefault()?.DestinationDepotNo;
                if (!destDepotNo.HasValue && !string.IsNullOrWhiteSpace(clientGouv))
                {
                    var zone = await _db.F_DEPOT_ZONES.AsNoTracking()
                        .Where(z => z.IsPrimary && z.Gouvernorat == clientGouv)
                        .FirstOrDefaultAsync(ct);
                    destDepotNo = zone?.DepotNo;
                }
                if (destDepotNo.HasValue)
                {
                    var destDepot = await _db.F_DEPOTS.AsNoTracking()
                        .FirstOrDefaultAsync(d => d.DE_No == destDepotNo.Value, ct);
                    dto.DestinationDepotName = destDepot?.DE_Intitule?.Trim() ?? destDepot?.DE_Code?.Trim();
                }
            }
        }

        // ── helpers ──────────────────────────────────────────────────────────

        // ── Gouvernorat du client du BL ──────────────────────────────────────────
        private static string? ResolveClientGouvernorat(
            Web_Api.Model.F_DOCENTETE e,
            Dictionary<Guid, Web_Api.Auth.Entities.ProfilUtilisateur> profiles)
        {
            if (!string.IsNullOrWhiteSpace(e.DO_PassagerGouvernorat))
                return e.DO_PassagerGouvernorat.Trim();

            if (e.DO_ClientUserId.HasValue
                && profiles.TryGetValue(e.DO_ClientUserId.Value, out var p)
                && p.Gouvernorat.HasValue)
                return p.Gouvernorat.Value.ToString();

            return null;
        }

        // ── Nom affiché du client ─────────────────────────────────────────────
        private static string? ResolveClientName(
            Web_Api.Model.F_DOCENTETE e,
            Dictionary<Guid, Web_Api.Auth.Entities.ProfilUtilisateur> profiles)
        {
            // Passager B2B
            if (!string.IsNullOrWhiteSpace(e.DO_PassagerNomSociete))
                return e.DO_PassagerNomSociete.Trim();
            if (!string.IsNullOrWhiteSpace(e.DO_PassagerNomComplet))
                return e.DO_PassagerNomComplet.Trim();

            // Client existant
            if (e.DO_ClientUserId.HasValue && profiles.TryGetValue(e.DO_ClientUserId.Value, out var p))
            {
                if (!string.IsNullOrWhiteSpace(p.NomSociete)) return p.NomSociete.Trim();
                if (!string.IsNullOrWhiteSpace(p.NomComplet)) return p.NomComplet.Trim();
            }

            return e.DO_Tiers; // fallback : code client Sage
        }

        private async Task<int?> GetVendeurDepotAsync(CancellationToken ct)
        {
            var userId = GetUserId();
            var profil = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);

            if (profil == null) return null;

            // Priorité 1 : DepotRattacheNo (FK directe — livreurs et vendeurs assignés via admin)
            if (profil.DepotRattacheNo.HasValue && profil.DepotRattacheNo.Value > 0)
                return profil.DepotRattacheNo.Value;

            // Priorité 2 : CodeDepot (string) — même logique que BonCommandeService
            var rawCode = profil.CodeDepot?.Trim();
            if (string.IsNullOrWhiteSpace(rawCode)) return null;

            if (int.TryParse(rawCode, out var depotNo) && depotNo > 0)
            {
                var byNo = await _db.F_DEPOTS.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.DE_No == depotNo, ct);
                if (byNo != null) return byNo.DE_No;
            }

            var normalized = rawCode.ToUpperInvariant();
            var byCode = await _db.F_DEPOTS.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DE_Code != null && x.DE_Code.ToUpper() == normalized, ct);
            return byCode?.DE_No;
        }

        private Guid GetUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
        }

        private static BonLivraisonResponseDto MapToDto(
            Web_Api.Model.F_DOCENTETE e,
            List<Web_Api.Model.F_DOCLIGNE> lignes)
        {
            return new BonLivraisonResponseDto
            {
                Piece = e.DO_Piece ?? "",
                Date = e.DO_Date,
                SourceBcPiece = e.DO_Piece?.StartsWith("BL", StringComparison.OrdinalIgnoreCase) == true
                    ? "BC" + e.DO_Piece.Substring(2) : e.DO_Piece,
                ClientCode = e.DO_Tiers ?? "",
                DepotNo = e.DE_No ?? 0,
                Status = e.DocumentStatus,
                TotalHT = e.DO_TotalHT ?? 0m,
                TotalTTC = e.DO_TotalTTC ?? 0m,
                FraisLivraison = e.DO_FraisLivraison ?? 0m,
                TimbreFiscal = e.DO_TimbreFiscal ?? 0m,
                NetAPayer = e.DO_NetAPayer ?? 0m,
                Address = e.DO_AdresseLivraison,
                City = e.DO_VilleLivraison,
                PostalCode = e.DO_CodePostalLivraison,
                ClientPhone = e.DO_TelephoneLivraison,
                Lines = lignes.Select(l => new BonLivraisonLineResponseDto
                {
                    ArticleRef = l.AR_Ref ?? "",
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountHT = l.DL_MontantHT ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList()
            };
        }
    }

    public class ManifestePrintRequestDto
    {
        public List<string> BLPieces { get; set; } = new();
        /// <summary>"DOMICILE" | "TRANSIT"</summary>
        public string? Type { get; set; }
    }

    // Résultat interne du chargement des BLs « au dépôt » (à imprimer + imprimés).
    public class DepotPendingResult
    {
        public string? DepotGouvernorat { get; set; }
        public string? DepotIntitule { get; set; }
        public List<BonLivraisonResponseDto> Items { get; set; } = new();
    }
}
