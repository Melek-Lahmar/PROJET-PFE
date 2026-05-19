using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Livreur;
using Web_Api.Model;
using Web_Api.Services.Sms;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/livreur/orders")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN)]
    public class LivreurController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly SmsNotificationService _sms;
        private const short BL_TYPE = 1;

        public LivreurController(AppDbContext db, SmsNotificationService sms)
        {
            _db = db;
            _sms = sms;
        }

        [HttpGet("available")]
        public async Task<IActionResult> GetAvailable(CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var gov = profile.Gouvernorat?.ToString()?.Trim().ToUpperInvariant() ?? "";
            var delegation = profile.Delegation?.Trim().ToUpperInvariant() ?? "";

            var alreadyAssigned = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Select(x => x.DO_Piece)
                .ToListAsync(ct);

            var items = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BL_TYPE &&
                    x.DO_Piece != null &&
                    x.DO_Piece.StartsWith("BL") &&
                    !alreadyAssigned.Contains(x.DO_Piece) &&
                    (
                        ((x.DO_VilleLivraison ?? "").Trim().ToUpper() == gov) ||
                        (!string.IsNullOrWhiteSpace(delegation) &&
                         ((x.DO_VilleLivraison ?? "").Trim().ToUpper() == delegation))
                    ))
                .OrderByDescending(x => x.cbMarq)
                .ToListAsync(ct);

            var filtered = items
                .Where(x =>
                {
                    var s = ResolveDocumentStatus(x);
                    return s == DeliveryStatuses.Confirme;
                })
                .ToList();

            var clientMap = await BuildClientProfileMapAsync(filtered, ct);

            var result = filtered
                .Select(x => MapOrderDto(x, null, clientMap))
                .ToList();

            return Ok(result);
        }

        [HttpGet("mine")]
        public async Task<IActionResult> GetMine(CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var mine = await _db.F_LIVRAISONS
                .Where(x => x.LivreurId == profile.cbMarq)
                .OrderByDescending(x => x.LI_DateCreation)
                .ToListAsync(ct);

            if (mine.Count == 0)
                return Ok(new List<LivreurOrderDto>());

            var pieces = mine.Select(x => x.DO_Piece).Distinct().ToList();

            var entetes = await _db.F_DOCENTETES
                .Where(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BL_TYPE &&
                    x.DO_Piece != null &&
                    pieces.Contains(x.DO_Piece))
                .ToDictionaryAsync(x => x.DO_Piece!, x => x, ct);

            // Fix bug "reload → en livraison" : on ne convertit PLUS automatiquement
            // les REPORTE en EN_LIVRAISON à chaque GET /mine. Cette transition est
            // de la responsabilité exclusive du job Hangfire `DepotIncrementJob`
            // (REPORTE → DEPOT à 00:00 quand LI_DateReplanification est passée).

            var entetesList = mine
                .Where(li => entetes.ContainsKey(li.DO_Piece))
                .Select(li => entetes[li.DO_Piece])
                .ToList();

            var clientMap = await BuildClientProfileMapAsync(entetesList, ct);

            var result = mine
                .Where(li => entetes.ContainsKey(li.DO_Piece))
                .Select(li => MapOrderDto(entetes[li.DO_Piece], li, clientMap))
                .ToList();

            return Ok(result);
        }

        [HttpPost("{piece}/assign")]
        public async Task<IActionResult> Assign(string piece, CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var entete = await _db.F_DOCENTETES.FirstOrDefaultAsync(x =>
                x.DO_Domaine == 0 &&
                x.DO_Type == BL_TYPE &&
                x.DO_Piece == piece, ct);

            if (entete == null)
                return NotFound(new { message = "BL introuvable." });

            var currentStatus = ResolveDocumentStatus(entete);
            if (currentStatus != DeliveryStatuses.Confirme)
                return BadRequest(new { message = $"BL non assignable. Statut actuel: {currentStatus}" });

            var exists = await _db.F_LIVRAISONS.AnyAsync(x => x.DO_Piece == piece, ct);
            if (exists)
                return Conflict(new { message = "Cette commande est déjà affectée." });

            var li = new F_LIVRAISON
            {
                DO_Piece = piece,
                LI_PieceSage = piece,
                LI_Adresse = entete.DO_AdresseLivraison ?? "",
                LI_Ville = entete.DO_VilleLivraison ?? "",
                LI_CodePostal = entete.DO_CodePostalLivraison,
                LI_Latitude = entete.DO_LatitudeLivraison,
                LI_Longitude = entete.DO_LongitudeLivraison,
                // Acceptation pool : le colis est pris en charge, le livreur va
                // le préparer au dépôt avant de partir en livraison.
                LI_Statut = DeliveryStatusCodes.DepotEnCoursDePreparation,
                LivreurId = profile.cbMarq,
                LI_DateCreation = DateTime.UtcNow
            };

            entete.cbModification = DateTime.UtcNow;

            _db.F_LIVRAISONS.Add(li);
            await _db.SaveChangesAsync(ct);

            return Ok(new { message = "Commande affectée au livreur." });
        }

        [HttpPut("batch-status")]
        public async Task<IActionResult> BatchUpdateStatus(
            [FromBody] BatchUpdateLivraisonStatusRequestDto req,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            string normalizedStatus;
            try
            {
                normalizedStatus = NormalizeRequestedStatus(req.Status);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var normalizedMotif = NormalizeMotif(req.Motif);
            if (RequiresMotif(normalizedStatus) && string.IsNullOrWhiteSpace(normalizedMotif))
                return BadRequest(new { message = "Le motif est obligatoire pour ce statut." });

            var pieces = req.Pieces
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (pieces.Count == 0)
                return BadRequest(new { message = "Aucune pièce valide." });

            var livraisons = await _db.F_LIVRAISONS
                .Where(x => x.LivreurId == profile.cbMarq && pieces.Contains(x.DO_Piece))
                .ToListAsync(ct);

            var entetes = await _db.F_DOCENTETES
                .Where(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BL_TYPE &&
                    x.DO_Piece != null &&
                    pieces.Contains(x.DO_Piece))
                .ToDictionaryAsync(x => x.DO_Piece!, x => x, ct);

            var foundPieces = livraisons.Select(li => li.DO_Piece).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var notFound = pieces.Where(p => !foundPieces.Contains(p)).ToList();

            var statusCode = MapStringToCode(normalizedStatus);
            var commentForStorage = BuildCommentForStorage(normalizedMotif, req.Note);
            var now = DateTime.UtcNow;

            var updated = new List<string>();
            var skipped = new List<string>();

            foreach (var li in livraisons)
            {
                if (li.LI_Statut == DeliveryStatusCodes.Livre)
                {
                    skipped.Add(li.DO_Piece);
                    continue;
                }

                li.LI_Statut = statusCode;

                if (!string.IsNullOrWhiteSpace(commentForStorage))
                    li.LI_Commentaire = commentForStorage;

                if (normalizedStatus == DeliveryStatuses.Livre)
                {
                    li.LI_DateLivree = now;

                    // Auto-encaissement COD : si la livraison n'est pas déjà
                    // encaissée, on enregistre le netAPayer comme cash collecté.
                    // C'est le mode standard PFE (Cash on Delivery) : marquer
                    // "Livré" = encaisser.
                    if (!li.Encaisse && entetes.TryGetValue(li.DO_Piece, out var ent))
                    {
                        var montant = ent.DO_NetAPayer ?? 0m;
                        if (montant > 0)
                        {
                            li.Encaisse = true;
                            li.EncaisseAt = now;
                            li.MontantEncaisse = montant;
                        }
                    }
                }

                if (normalizedStatus != DeliveryStatuses.Reporte)
                    li.LI_DateReplanification = null;

                if (entetes.TryGetValue(li.DO_Piece, out var entete))
                    entete.cbModification = now;

                updated.Add(li.DO_Piece);
            }

            if (updated.Count > 0)
                await _db.SaveChangesAsync(ct);

            // Section 1.3 — hook SMS sur transition vers Livre (batch)
            if (normalizedStatus == DeliveryStatuses.Livre)
            {
                foreach (var p in updated)
                {
                    await _sms.NotifyAsync(SmsTrigger.Livre, p, ct);
                }
            }

            return Ok(new BatchUpdateLivraisonStatusResultDto
            {
                Updated = updated.Count,
                UpdatedPieces = updated,
                SkippedPieces = skipped,
                NotFoundPieces = notFound,
                Status = normalizedStatus
            });
        }

        [HttpPut("{piece}/status")]
        public async Task<IActionResult> UpdateStatus(
            string piece,
            [FromBody] UpdateLivraisonStatusRequestDto req,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var li = await _db.F_LIVRAISONS.FirstOrDefaultAsync(
                x => x.DO_Piece == piece && x.LivreurId == profile.cbMarq,
                ct);

            if (li == null)
                return NotFound(new { message = "Livraison introuvable pour ce livreur." });

            var entete = await _db.F_DOCENTETES.FirstOrDefaultAsync(
                x => x.DO_Domaine == 0 &&
                     x.DO_Type == BL_TYPE &&
                     x.DO_Piece == piece,
                ct);

            if (entete == null)
                return NotFound(new { message = "BL introuvable." });

            var normalizedStatus = NormalizeRequestedStatus(req.Status);
            var normalizedMotif = NormalizeMotif(req.Motif);

            if (RequiresMotif(normalizedStatus) && string.IsNullOrWhiteSpace(normalizedMotif))
                return BadRequest(new { message = "Le motif est obligatoire pour ce statut." });

            li.LI_Statut = MapStringToCode(normalizedStatus);
            li.LI_Commentaire = BuildCommentForStorage(normalizedMotif, req.Note);
            li.LI_DateReplanification =
                normalizedStatus == DeliveryStatuses.Reporte ? req.ReplannedAt : null;
            li.LI_DateLivree =
                normalizedStatus == DeliveryStatuses.Livre ? DateTime.UtcNow : li.LI_DateLivree;

            // Auto-encaissement COD à la transition Livré (PFE = Cash on Delivery).
            if (normalizedStatus == DeliveryStatuses.Livre && !li.Encaisse)
            {
                var montant = entete.DO_NetAPayer ?? 0m;
                if (montant > 0)
                {
                    li.Encaisse = true;
                    li.EncaisseAt = li.LI_DateLivree ?? DateTime.UtcNow;
                    li.MontantEncaisse = montant;
                }
            }

            entete.cbModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            // Section 1.3 — hook SMS sur transition vers Livre
            if (normalizedStatus == DeliveryStatuses.Livre)
            {
                await _sms.NotifyAsync(SmsTrigger.Livre, piece, ct);
            }

            return Ok(new
            {
                message = "Statut mis à jour avec succès.",
                piece,
                status = normalizedStatus,
                motif = normalizedMotif,
                note = req.Note
            });
        }

        private async Task<ProfilUtilisateur?> GetCurrentProfileAsync(CancellationToken ct)
        {
            var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdRaw, out var userId))
                return null;

            return await _db.ProfilsUtilisateurs
                .FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);
        }

        private async Task<Dictionary<string, ProfilUtilisateur>> BuildClientProfileMapAsync(
            IEnumerable<F_DOCENTETE> entetes,
            CancellationToken ct)
        {
            var clientCodes = entetes
                .Select(x => (x.DO_Tiers ?? string.Empty).Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (clientCodes.Count == 0)
                return new Dictionary<string, ProfilUtilisateur>(StringComparer.OrdinalIgnoreCase);

            var profiles = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .Where(x => x.CodeClientSage != null && clientCodes.Contains(x.CodeClientSage))
                .ToListAsync(ct);

            return profiles
                .Where(x => !string.IsNullOrWhiteSpace(x.CodeClientSage))
                .GroupBy(x => x.CodeClientSage!.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        }

        private static LivreurOrderDto MapOrderDto(
            F_DOCENTETE e,
            F_LIVRAISON? li,
            IReadOnlyDictionary<string, ProfilUtilisateur> clientMap)
        {
            var clientCode = (e.DO_Tiers ?? string.Empty).Trim();
            clientMap.TryGetValue(clientCode, out var clientProfile);

            return new LivreurOrderDto
            {
                Piece = e.DO_Piece ?? "",
                Status = li != null ? MapLivraisonCodeToStatus(li.LI_Statut) : ResolveDocumentStatus(e),

                Address = e.DO_AdresseLivraison,
                City = e.DO_VilleLivraison,
                PostalCode = e.DO_CodePostalLivraison,
                Latitude = e.DO_LatitudeLivraison,
                Longitude = e.DO_LongitudeLivraison,

                ClientCode = string.IsNullOrWhiteSpace(clientCode) ? null : clientCode,
                ClientDisplay = BuildClientDisplay(clientProfile, clientCode),
                ClientPhone = NormalizeNullable(clientProfile?.Telephone),

                PaymentMethod = NormalizeNullable(e.DO_ModePaiement),
                DeliveryType = NormalizeNullable(e.DO_ModeLivraison),

                NetAPayer = e.DO_NetAPayer ?? 0m,

                AssignedAt = li?.LI_DateCreation,
                DeliveredAt = li?.LI_DateLivree,
                ReplannedAt = li?.LI_DateReplanification,
                Note = li?.LI_Commentaire,
                DepotPassageNumber = li?.DepotPassageNumber,
                IsActiveDelivery = e.IsActiveDelivery,
            };
        }

        private static string? BuildClientDisplay(ProfilUtilisateur? profile, string? clientCode)
        {
            var company = NormalizeNullable(profile?.NomSociete);
            if (!string.IsNullOrWhiteSpace(company))
                return company;

            var fullName = NormalizeNullable(profile?.NomComplet);
            if (!string.IsNullOrWhiteSpace(fullName))
                return fullName;

            return NormalizeNullable(clientCode);
        }

        private static string? NormalizeNullable(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            return value.Trim();
        }

        private static string ResolveDocumentStatus(F_DOCENTETE e)
        {
            if (!string.IsNullOrWhiteSpace(e.DocumentStatus))
                return e.DocumentStatus!.Trim().ToUpperInvariant();

            return e.DO_Valide switch
            {
                0 => DeliveryStatuses.EnAttente,
                1 => DeliveryStatuses.Confirme,
                2 => DeliveryStatuses.Tentative,
                3 => DeliveryStatuses.Refuse,
                _ => DeliveryStatuses.EnAttente
            };
        }

        private static string NormalizeRequestedStatus(string status)
        {
            var s = (status ?? "").Trim().ToUpperInvariant();

            return s switch
            {
                "LIVRE" => DeliveryStatuses.Livre,
                "RETOUR" => DeliveryStatuses.Retour,
                "RETOURNE" => DeliveryStatuses.Retour,
                "DEPOT" => DeliveryStatuses.Depot,
                "DEPOT_EN_COURS_DE_PREPARATION" => DeliveryStatuses.DepotEnCoursDePreparation,
                "DEPOT_PRET" => DeliveryStatuses.DepotPret,
                "REPORTE" => DeliveryStatuses.Reporte,
                "EN_LIVRAISON" => DeliveryStatuses.EnLivraison,
                "CONFIRME" => DeliveryStatuses.Confirme,
                _ => throw new ArgumentException("Statut livreur invalide.")
            };
        }

        private static short MapStringToCode(string status)
        {
            return status switch
            {
                var s when s == DeliveryStatuses.Confirme => DeliveryStatusCodes.Confirme,
                var s when s == DeliveryStatuses.EnLivraison => DeliveryStatusCodes.EnLivraison,
                var s when s == DeliveryStatuses.Livre => DeliveryStatusCodes.Livre,
                var s when s == DeliveryStatuses.Retour => DeliveryStatusCodes.Retour,
                var s when s == DeliveryStatuses.Depot => DeliveryStatusCodes.Depot,
                var s when s == DeliveryStatuses.DepotEnCoursDePreparation => DeliveryStatusCodes.DepotEnCoursDePreparation,
                var s when s == DeliveryStatuses.DepotPret => DeliveryStatusCodes.DepotPret,
                var s when s == DeliveryStatuses.Reporte => DeliveryStatusCodes.Reporte,
                _ => DeliveryStatusCodes.EnLivraison
            };
        }

        private static string MapLivraisonCodeToStatus(short? code)
        {
            return code switch
            {
                var s when s == DeliveryStatusCodes.Confirme => DeliveryStatuses.Confirme,
                var s when s == DeliveryStatusCodes.EnLivraison => DeliveryStatuses.EnLivraison,
                var s when s == DeliveryStatusCodes.Livre => DeliveryStatuses.Livre,
                var s when s == DeliveryStatusCodes.Retour => DeliveryStatuses.Retour,
                var s when s == DeliveryStatusCodes.Depot => DeliveryStatuses.Depot,
                var s when s == DeliveryStatusCodes.DepotEnCoursDePreparation => DeliveryStatuses.DepotEnCoursDePreparation,
                var s when s == DeliveryStatusCodes.DepotPret => DeliveryStatuses.DepotPret,
                var s when s == DeliveryStatusCodes.Reporte => DeliveryStatuses.Reporte,
                _ => DeliveryStatuses.EnAttente
            };
        }

        private static bool RequiresMotif(string normalizedStatus)
        {
            return normalizedStatus == DeliveryStatuses.Reporte ||
                   normalizedStatus == DeliveryStatuses.Retour ||
                   normalizedStatus == DeliveryStatuses.Depot;
        }

        private static string? NormalizeMotif(string? motif)
        {
            if (string.IsNullOrWhiteSpace(motif))
                return null;

            var raw = motif.Trim().ToUpperInvariant();

            return raw switch
            {
                "CLIENT_ABSENT" or "CLIENT ABSENT" or "ABSENT" => "client absent",
                "NUMERO_INJOIGNABLE" or "NUMÉRO_INJOIGNABLE" or "NUMERO INJOIGNABLE" or "NUMÉRO INJOIGNABLE" or "INJOIGNABLE" => "numéro injoignable",
                "REFUS_CLIENT" or "REFUS CLIENT" => "refus client",
                "ADRESSE_INCORRECTE" or "ADRESSE INCORRECTE" => "adresse incorrecte",
                "FERME" or "FERMÉ" => "fermé",
                "RETOUR_DEPOT" or "RETOUR DÉPÔT" or "RETOUR DEPOT" => "retour dépôt",
                "AUTRE" => "autre",
                _ => motif.Trim().ToLowerInvariant()
            };
        }

        private static string? BuildCommentForStorage(string? motif, string? note)
        {
            var safeMotif = string.IsNullOrWhiteSpace(motif) ? null : motif.Trim();
            var safeNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();

            if (safeMotif == null && safeNote == null)
                return null;

            if (safeMotif != null && safeNote != null)
                return $"Motif: {safeMotif} | Note: {safeNote}";

            if (safeMotif != null)
                return $"Motif: {safeMotif}";

            return safeNote;
        }

        // ====================================================================
        // 2.A — Détail enrichi d'une commande livreur (cart + client + historique)
        // ====================================================================

        [HttpGet("{piece}/full-details")]
        public async Task<ActionResult<LivreurOrderDetailsDto>> GetFullDetails(
            string piece,
            CancellationToken ct)
        {
            // 1) Entête (BL prioritaire, sinon BC).
            var entete = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0, ct);

            if (entete == null)
                return NotFound(new { message = "Commande introuvable." });

            // 2) Lignes.
            var lignesRaw = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(l => l.DO_Piece == piece && l.DO_Domaine == 0 && l.DO_Type == entete.DO_Type)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            // Photos principales par AR_Ref (Url + IsMain=true en priorité).
            var arRefs = lignesRaw
                .Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .Select(l => l.AR_Ref!)
                .Distinct()
                .ToList();

            var images = arRefs.Count == 0
                ? new Dictionary<string, string?>()
                : await _db.Set<F_ARTICLE_IMAGE>()
                    .AsNoTracking()
                    .Where(i => arRefs.Contains(i.AR_Ref))
                    .OrderByDescending(i => i.IsMain == true)
                    .ThenBy(i => i.SortOrder)
                    .GroupBy(i => i.AR_Ref)
                    .Select(g => new { Key = g.Key, Url = g.First().Url })
                    .ToDictionaryAsync(x => x.Key, x => x.Url, StringComparer.OrdinalIgnoreCase, ct);

            var lignes = lignesRaw.Select(l => new LivreurOrderLineDto
            {
                ArRef = l.AR_Ref,
                Designation = l.DL_Design,
                Quantite = l.DL_Qte,
                PrixUnitaire = l.DL_PrixUnitaire,
                MontantTTC = l.DL_MontantTTC,
                ImageUrl = (!string.IsNullOrWhiteSpace(l.AR_Ref)
                            && images.TryGetValue(l.AR_Ref!, out var url))
                    ? url
                    : null
            }).ToList();

            // 3) Client.
            var clientCode = (entete.DO_Tiers ?? string.Empty).Trim();
            ProfilUtilisateur? client = null;
            if (!string.IsNullOrEmpty(clientCode))
            {
                client = await _db.ProfilsUtilisateurs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.CodeClientSage == clientCode, ct);
            }

            // 4) Historique : statut courant via F_LIVRAISON pour les BL.
            F_LIVRAISON? li = null;
            if (entete.DO_Type == 1)
            {
                li = await _db.F_LIVRAISONS
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.DO_Piece == piece, ct);
            }

            var history = new List<LivreurOrderHistoryDto>();
            if (entete.cbCreation.HasValue)
            {
                history.Add(new LivreurOrderHistoryDto
                {
                    At = entete.cbCreation.Value,
                    StatusCode = (short)(entete.DO_Type == 0 ? 0 : DeliveryStatusCodes.Confirme),
                    StatusLabel = entete.DO_Type == 0 ? "Commande créée" : "Bon de livraison créé"
                });
            }
            if (li != null)
            {
                history.Add(new LivreurOrderHistoryDto
                {
                    At = li.LI_DateCreation,
                    StatusCode = DeliveryStatusCodes.EnLivraison,
                    StatusLabel = "Attribuée au livreur"
                });

                if (li.LI_DateReplanification.HasValue && li.LI_Statut == DeliveryStatusCodes.Reporte)
                {
                    history.Add(new LivreurOrderHistoryDto
                    {
                        At = li.LI_DateReplanification.Value,
                        StatusCode = DeliveryStatusCodes.Reporte,
                        StatusLabel = "Reportée",
                        Motif = li.LI_Commentaire
                    });
                }
                if (li.LI_DateLivree.HasValue)
                {
                    history.Add(new LivreurOrderHistoryDto
                    {
                        At = li.LI_DateLivree.Value,
                        StatusCode = DeliveryStatusCodes.Livre,
                        StatusLabel = "Livrée"
                    });
                }
                else if (li.LI_Statut != DeliveryStatusCodes.EnLivraison
                         && li.LI_Statut != DeliveryStatusCodes.Confirme)
                {
                    history.Add(new LivreurOrderHistoryDto
                    {
                        At = li.LI_DateCreation,
                        StatusCode = li.LI_Statut,
                        StatusLabel = MapLivraisonCodeToStatus(li.LI_Statut),
                        Note = li.LI_Commentaire
                    });
                }
            }

            // 5) DTO final.
            var clientDisplay = BuildClientDisplay(client, clientCode);
            var dto = new LivreurOrderDetailsDto
            {
                DoPiece = entete.DO_Piece,
                DoTiers = clientCode,
                DoDate = entete.DO_Date,
                DoType = entete.DO_Type ?? 0,
                StatusCode = li?.LI_Statut,
                StatusLabel = li != null
                    ? MapLivraisonCodeToStatus(li.LI_Statut)
                    : ResolveDocumentStatus(entete),
                NetAPayer = entete.DO_NetAPayer,
                TotalTTC = entete.DO_TotalTTC,
                TotalHT = entete.DO_TotalHT,
                FraisLivraison = entete.DO_FraisLivraison,
                TimbreFiscal = entete.DO_TimbreFiscal,
                ModePaiement = NormalizeNullable(entete.DO_ModePaiement),
                ModeLivraison = NormalizeNullable(entete.DO_ModeLivraison),
                Adresse = entete.DO_AdresseLivraison,
                Ville = entete.DO_VilleLivraison,
                CodePostal = entete.DO_CodePostalLivraison,
                Client = new LivreurOrderClientDto
                {
                    DisplayName = clientDisplay,
                    DisplayNameArabe = null,
                    Telephone = NormalizeNullable(client?.Telephone),
                    Email = null,
                    Adresse = NormalizeNullable(client?.Adresse) ?? entete.DO_AdresseLivraison,
                    Ville = NormalizeNullable(client?.Delegation) ?? entete.DO_VilleLivraison,
                    Gouvernorat = client?.Gouvernorat?.ToString(),
                    Delegation = NormalizeNullable(client?.Delegation),
                },
                Lignes = lignes,
                History = history
            };

            return Ok(dto);
        }
    }
}