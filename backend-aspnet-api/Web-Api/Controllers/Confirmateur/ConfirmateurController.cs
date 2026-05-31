using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Confirmateur;
using Web_Api.Hubs;
using Web_Api.Model;
using Web_Api.Services;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers.Confirmateur
{
    [ApiController]
    [Route("api/confirmateur")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR)]
    public class ConfirmateurController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly SageService _sage;
        private readonly UserManager<ApplicationUser> _users;
        private readonly ISupervisorAlertService _alerts;

        public ConfirmateurController(
            AppDbContext db,
            IHubContext<ReclamationHub> hub,
            SageService sage,
            UserManager<ApplicationUser> users,
            ISupervisorAlertService alerts)
        {
            _db = db;
            _hub = hub;
            _sage = sage;
            _users = users;
            _alerts = alerts;
        }

        // ── Zone key normalisation (same logic as CommandePoolService.NormalizeZoneKey) ──
        private static string NormalizeZoneKey(string? value)
        {
            var text = (value ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;

            text = text.Replace('–', '-').Replace('—', '-').Replace('’', '\'');
            var normalized = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(normalized.Length);
            foreach (var c in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(c);
                if (category == UnicodeCategory.NonSpacingMark) continue;
                if (char.IsLetterOrDigit(c)) sb.Append(c);
                else if (c == '-' || char.IsWhiteSpace(c)) sb.Append(' ');
            }
            return string.Join(' ', sb.ToString().Normalize(NormalizationForm.FormC)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        private static string? TypeClientToString(TypeClient? t)
        {
            return t switch
            {
                TypeClient.B2B => "B2B",
                TypeClient.B2C => "B2C",
                _ => null
            };
        }

        private static string? ComputeDisplay(ConfirmateurClientDto? c)
        {
            if (c == null) return null;
            var t = (c.TypeClient ?? "").ToUpperInvariant();
            if (t == "B2B") return string.IsNullOrWhiteSpace(c.NomSociete) ? null : c.NomSociete;
            if (t == "B2C") return string.IsNullOrWhiteSpace(c.NomComplet) ? null : c.NomComplet;
            return c.NomSociete ?? c.NomComplet;
        }

        // ✅ Résoudre le profil client à partir de DO_Tiers
        private async Task<ConfirmateurClientDto?> ResolveClientAsync(string? tiers, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(tiers))
                return null;

            // 1) DO_Tiers = CodeClientSage
            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.CodeClientSage == tiers, ct);

            // 2) DO_Tiers = Guid string
            if (profile == null && Guid.TryParse(tiers, out var guid))
            {
                profile = await _db.ProfilsUtilisateurs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UtilisateurId == guid, ct);
            }

            // 3) DO_Tiers format "CLxxxx" (début GUID sans tirets)
            if (profile == null && tiers.StartsWith("CL", StringComparison.OrdinalIgnoreCase))
            {
                var token = tiers.Substring(2);
                var all = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);

                profile = all.FirstOrDefault(p =>
                    p.UtilisateurId.HasValue &&
                    p.UtilisateurId.Value.ToString("N").StartsWith(token, StringComparison.OrdinalIgnoreCase)
                );
            }

            if (profile == null)
                return null;

            return new ConfirmateurClientDto
            {
                TypeClient = TypeClientToString(profile.TypeClient),
                UtilisateurId = profile.UtilisateurId?.ToString(),
                Telephone = profile.Telephone,

                // B2C
                NomComplet = profile.NomComplet,
                Cin = profile.CIN,

                // B2B
                NomSociete = profile.NomSociete,
                MatriculeFiscal = profile.MatriculeFiscal,
                NumeroTVA = profile.NumeroTVA,
                Remise = profile.Remise,
                PlafondCredit = profile.PlafondCredit,

                // localisation
                Gouvernorat = profile.Gouvernorat?.ToString(),
                Delegation = profile.Delegation,
                CodePostal = profile.CodePostal,
                Adresse = profile.Adresse,
                AdresseComplementaire = profile.AdresseComplementaire
            };
        }

        // ✅ LISTE BC
        [HttpGet("commandes")]
        [HttpGet("bc")]
        public async Task<ActionResult<List<ConfirmateurOrderDto>>> GetBcList([FromQuery] short? status, CancellationToken ct)
        {
            var q = _db.Set<F_DOCENTETE>()
                .AsNoTracking()
                .Where(x => x.DO_Domaine == 0 && x.DO_Type == 0)
                .OrderByDescending(x => x.cbMarq)
                .AsQueryable();

            if (status.HasValue)
                q = q.Where(x => x.DO_Valide == status.Value);

            var list = await q.Select(x => new ConfirmateurOrderDto
            {
                DO_Piece = x.DO_Piece,
                DO_Tiers = x.DO_Tiers,
                DO_Date = x.DO_Date,
                DO_TotalHT = x.DO_TotalHT,
                DO_TotalTTC = x.DO_TotalTTC,
                DO_NetAPayer = x.DO_NetAPayer,
                DO_Valide = x.DO_Valide,
                StatusLabel = x.DocumentStatus,
                Lignes = new List<ConfirmateurOrderLineDto>()
            }).ToListAsync(ct);

            // ✅ enrichir pour afficher Nom client dans la table
            foreach (var o in list)
            {
                var c = await ResolveClientAsync(o.DO_Tiers, ct);
                o.ClientType = c?.TypeClient;
                o.ClientDisplay = ComputeDisplay(c);
            }

            return Ok(list);
        }

        // ✅ DÉTAIL BC
        [HttpGet("commandes/{piece}")]
        [HttpGet("bc/{piece}")]
        public async Task<ActionResult<ConfirmateurOrderDto>> GetBcByPiece(string piece, CancellationToken ct)
        {
            var entete = await _db.Set<F_DOCENTETE>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 0, ct);

            if (entete == null)
                return NotFound(new { message = "BC introuvable." });

            var lignes = await _db.Set<F_DOCLIGNE>()
                .AsNoTracking()
                .Where(l => l.DO_Piece == piece && l.DO_Domaine == 0 && l.DO_Type == 0)
                .OrderBy(l => l.cbMarq)
                .Select(l => new ConfirmateurOrderLineDto
                {
                    AR_Ref = l.AR_Ref,
                    DL_Design = l.DL_Design,
                    DL_Qte = l.DL_Qte,
                    DL_PrixUnitaire = l.DL_PrixUnitaire,
                    DL_MontantTTC = l.DL_MontantTTC
                })
                .ToListAsync(ct);

            // B.1 — Hydratation des images articles depuis F_ARTICLE_IMAGE.
            await HydrateImageUrlsAsync(lignes, ct);

            var client = await ResolveClientAsync(entete.DO_Tiers, ct);

            var dto = new ConfirmateurOrderDto
            {
                DO_Piece = entete.DO_Piece,
                DO_Tiers = entete.DO_Tiers,
                DO_Date = entete.DO_Date,
                DO_TotalHT = entete.DO_TotalHT,
                DO_TotalTTC = entete.DO_TotalTTC,
                DO_NetAPayer = entete.DO_NetAPayer,
                DO_Valide = entete.DO_Valide,
                StatusLabel = entete.DocumentStatus,

                ClientType = client?.TypeClient,
                ClientDisplay = ComputeDisplay(client),
                Client = client,

                Lignes = lignes,

                DO_PassagerGouvernorat = entete.DO_PassagerGouvernorat,
                DO_PassagerDelegation = entete.DO_PassagerDelegation,
                DO_LatitudeLivraison = entete.DO_LatitudeLivraison,
                DO_LongitudeLivraison = entete.DO_LongitudeLivraison,
                DO_ModeLivraison = entete.DO_ModeLivraison,
                DO_AdresseLivraison = entete.DO_AdresseLivraison,
                DO_VilleLivraison = entete.DO_VilleLivraison,
                DO_CodePostalLivraison = entete.DO_CodePostalLivraison,
                DO_TelephoneLivraison = entete.DO_TelephoneLivraison,
            };

            return Ok(dto);
        }

        public class UpdateStatusRequest { public short Status { get; set; } }

        // ✅ EN_ATTENTE / TENTATIVE / REFUSE
        [HttpPut("commandes/{piece}/status")]
        [HttpPut("bc/{piece}/status")]
        public async Task<IActionResult> UpdateStatus(string piece, [FromBody] UpdateStatusRequest req, CancellationToken ct)
        {
            if (req.Status < 0 || req.Status > 3)
                return BadRequest(new { message = "Status invalide (0..3)." });

            var entete = await _db.Set<F_DOCENTETE>()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 0, ct);

            if (entete == null)
                return NotFound(new { message = "BC introuvable." });

            entete.DO_Valide = req.Status;
            entete.cbModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        public class UpdateStatusExtendedRequest
        {
            public string? StatusKey { get; set; }
            public int? TentativeCount { get; set; }
            public string? Note { get; set; }
        }

        // 1.E — La confirmatrice peut désormais changer le statut commande
        // vers EN_LIVRAISON / DEPOT / REPORTE / RETOUR / LIVRE (en plus des
        // 4 statuts BC d'origine). Les statuts livraison agissent sur
        // F_LIVRAISON.LI_Statut (la ligne est créée si absente, à partir
        // du BL si disponible, sinon du BC).
        [HttpPut("commandes/{piece}/status-extended")]
        public async Task<IActionResult> UpdateStatusExtended(string piece, [FromBody] UpdateStatusExtendedRequest req, CancellationToken ct)
        {
            var key = (req.StatusKey ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(key))
                return BadRequest(new { message = "statusKey requis." });

            // Statuts BC (DO_Valide 0..3)
            short? docValide = key switch
            {
                "EN_ATTENTE" => (short)0,
                "CONFIRME"   => (short)1,
                "TENTATIVE"  => (short)2,
                "REFUSE"     => (short)3,
                _ => null
            };

            // Statuts livraison (F_LIVRAISON.LI_Statut)
            short? liStatut = key switch
            {
                "CONFIRME"     => DeliveryStatusCodes.Confirme,
                "EN_LIVRAISON" => DeliveryStatusCodes.EnLivraison,
                "LIVRE"        => DeliveryStatusCodes.Livre,
                "RETOUR"       => DeliveryStatusCodes.Retour,
                "DEPOT"        => DeliveryStatusCodes.Depot,
                "REPORTE"      => DeliveryStatusCodes.Reporte,
                _ => null
            };

            if (docValide == null && liStatut == null)
                return BadRequest(new { message = $"Statut '{key}' non reconnu." });

            // Chercher d'abord le BC, sinon le BL portant ce DO_Piece.
            var entete = await _db.Set<F_DOCENTETE>()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0, ct);

            if (entete == null)
                return NotFound(new { message = "Document introuvable." });

            var now = DateTime.UtcNow;

            // Volet BC : applicable seulement sur DO_Type=0 (BC)
            if (docValide.HasValue && entete.DO_Type == 0)
            {
                entete.DO_Valide = docValide.Value;
                entete.cbModification = now;
            }

            // Volet livraison : applicable si la commande est passée au BL.
            if (liStatut.HasValue)
            {
                // Si on a un BC ici, tenter de trouver le BL associé via DE_No.
                F_DOCENTETE? blEntete = entete;
                if (entete.DO_Type == 0)
                {
                    blEntete = await _db.Set<F_DOCENTETE>().FirstOrDefaultAsync(
                        x => x.DO_Domaine == 0 && x.DO_Type == 1 && x.DE_No == entete.DE_No, ct);
                }

                if (blEntete != null)
                {
                    var li = await _db.Set<F_LIVRAISON>()
                        .FirstOrDefaultAsync(l => l.DO_Piece == blEntete.DO_Piece, ct);

                    if (li == null)
                    {
                        li = new F_LIVRAISON
                        {
                            DO_Piece = blEntete.DO_Piece,
                            LI_Adresse = blEntete.DO_AdresseLivraison ?? string.Empty,
                            LI_Ville = blEntete.DO_VilleLivraison ?? string.Empty,
                            LI_CodePostal = blEntete.DO_CodePostalLivraison,
                            LI_Latitude = blEntete.DO_LatitudeLivraison,
                            LI_Longitude = blEntete.DO_LongitudeLivraison,
                            LI_Statut = liStatut.Value,
                            LI_DateCreation = now
                        };
                        _db.Add(li);
                    }
                    else
                    {
                        li.LI_Statut = liStatut.Value;
                    }

                    if (liStatut.Value == DeliveryStatusCodes.Livre)
                    {
                        li.LI_DateLivree ??= now;
                    }

                    if (!string.IsNullOrWhiteSpace(req.Note))
                    {
                        li.LI_Commentaire = req.Note!.Trim();
                    }

                    blEntete.cbModification = now;
                }
            }

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        public class TransformResultDto
        {
            public string? BlPiece { get; set; }

            // Compte rendu de l'envoi Sage. Permet au front de savoir si le BL a
            // été synchronisé ou si on est resté local (Sage HS, désactivé, etc.).
            public bool SageSent { get; set; }
            public bool SageSuccess { get; set; }
            public int SageHttpStatus { get; set; }
            public string? SageMessage { get; set; }

            // Auto-assignment result: true when no livreur covers the zone.
            public bool NoLivreurForZone { get; set; }
        }

        // ✅ CONFIRMER = TRANSFORMER BC → BL
        [HttpPost("commandes/{piece}/transform-to-bl")]
        [HttpPost("bc/{piece}/transform-to-bl")]
        public async Task<ActionResult<TransformResultDto>> TransformBcToBl(string piece, CancellationToken ct)
        {
            var bc = await _db.Set<F_DOCENTETE>()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 0, ct);

            if (bc == null)
                return NotFound(new { message = "BC introuvable." });

            var bcLines = await _db.Set<F_DOCLIGNE>()
                .Where(l => l.DO_Piece == piece && l.DO_Domaine == 0 && l.DO_Type == 0)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            if (bcLines.Count == 0)
                return BadRequest(new { message = "BC sans lignes." });

            // ✅ DO_Piece max 13 => "BL" + yyMMddHHmm (10) + 1 digit = 13
            var blPiece = "BL" + DateTime.UtcNow.ToString("yyMMddHHmm") + Random.Shared.Next(0, 10);

            await using var trx = await _db.Database.BeginTransactionAsync(ct);

            var bl = new F_DOCENTETE
            {
                DO_Domaine = 0,
                DO_Type = 1,
                DO_Piece = blPiece,

                DO_Tiers = bc.DO_Tiers,
                DO_Date = DateTime.UtcNow,
                DE_No = bc.DE_No,

                DO_TotalHT = bc.DO_TotalHT,
                DO_TotalTTC = bc.DO_TotalTTC,
                DO_NetAPayer = bc.DO_NetAPayer,

                // ✅ champs checkout réels
                DO_ModeLivraison = bc.DO_ModeLivraison,
                DO_ModePaiement = bc.DO_ModePaiement,
                DO_FraisLivraison = bc.DO_FraisLivraison,
                DO_TimbreFiscal = bc.DO_TimbreFiscal,

                DO_AdresseLivraison = bc.DO_AdresseLivraison,
                DO_VilleLivraison = bc.DO_VilleLivraison,
                DO_CodePostalLivraison = bc.DO_CodePostalLivraison,
                DO_LatitudeLivraison = bc.DO_LatitudeLivraison,
                DO_LongitudeLivraison = bc.DO_LongitudeLivraison,

                // BL = commande validée, prête à être prise par un livreur.
                // Doit être DO_Valide=1 (CONFIRME) sinon `GetAvailable` du
                // livreur le filtre car il ne garde que les BL CONFIRME.
                // Cohérent avec BcToBlService.cs:187 et BonCommandeService.cs:229.
                DO_Valide = 1,
                cbCreation = DateTime.UtcNow,
                cbModification = DateTime.UtcNow
            };

            _db.Add(bl);
            await _db.SaveChangesAsync(ct);

            foreach (var l in bcLines)
            {
                _db.Add(new F_DOCLIGNE
                {
                    DO_Domaine = 0,
                    DO_Type = 1,
                    DO_Piece = blPiece,
                    DO_Date = DateTime.UtcNow,
                    CT_Num = l.CT_Num,

                    AR_Ref = l.AR_Ref,
                    DL_Design = l.DL_Design,
                    DL_Qte = l.DL_Qte,
                    DL_PrixUnitaire = l.DL_PrixUnitaire,
                    DL_MontantHT = l.DL_MontantHT,
                    DL_MontantTTC = l.DL_MontantTTC,

                    cbCreation = DateTime.UtcNow,
                    cbModification = DateTime.UtcNow
                });
            }

            // ✅ On marque BC comme “transformé” => DO_Valide = 1 (historique)
            bc.DO_Valide = 1;
            bc.cbModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            // Phase 3 — Auto-assignment: find livreur covering the BC zone.
            bool noLivreurForZone = false;
            var govZone = bc.DO_PassagerGouvernorat;
            var delZone = bc.DO_PassagerDelegation;

            if (!string.IsNullOrWhiteSpace(govZone) && !string.IsNullOrWhiteSpace(delZone))
            {
                var normGov = NormalizeZoneKey(govZone);
                var normDel = NormalizeZoneKey(delZone);

                // Collect all livreur zones and find matching LivreurUserIds.
                var matchingLivreurIds = await _db.F_LIVREUR_ZONES
                    .AsNoTracking()
                    .ToListAsync(ct);

                var candidateIds = matchingLivreurIds
                    .Where(z =>
                        NormalizeZoneKey(z.Gouvernorat) == normGov &&
                        NormalizeZoneKey(z.Delegation) == normDel)
                    .Select(z => z.LivreurUserId)
                    .Distinct()
                    .ToList();

                if (candidateIds.Count > 0)
                {
                    // Filter: non-transit livreurs only.
                    var candidateProfiles = await _db.ProfilsUtilisateurs
                        .AsNoTracking()
                        .Where(p => p.UtilisateurId != null
                            && candidateIds.Contains(p.UtilisateurId!.Value)
                            && p.IsTransit == false)
                        .ToListAsync(ct);

                    if (candidateProfiles.Count == 0)
                    {
                        noLivreurForZone = true;
                    }
                    else
                    {
                        // Pick the livreur with fewest active assignments.
                        var profileIds = candidateProfiles
                            .Where(p => p.UtilisateurId.HasValue)
                            .Select(p => p.UtilisateurId!.Value)
                            .ToList();

                        var activeCounts = await _db.F_DOCENTETES
                            .AsNoTracking()
                            .Where(d => d.AssignedLivreurId != null
                                && profileIds.Contains(d.AssignedLivreurId.Value)
                                && d.DO_Valide == 1)
                            .GroupBy(d => d.AssignedLivreurId!.Value)
                            .Select(g => new { LivreurId = g.Key, Count = g.Count() })
                            .ToListAsync(ct);

                        var countDict = activeCounts.ToDictionary(x => x.LivreurId, x => x.Count);

                        var chosen = candidateProfiles
                            .Where(p => p.UtilisateurId.HasValue)
                            .OrderBy(p => countDict.TryGetValue(p.UtilisateurId!.Value, out var c) ? c : 0)
                            .ThenBy(_ => Random.Shared.Next()) // tie-break aléatoire
                            .First();

                        bl.AssignedLivreurId = chosen.UtilisateurId;

                        // Create F_LIVRAISON for the BL.
                        _db.F_LIVRAISONS.Add(new F_LIVRAISON
                        {
                            DO_Piece = blPiece,
                            LivreurId = chosen.cbMarq,
                            LI_Adresse = bl.DO_AdresseLivraison ?? string.Empty,
                            LI_Ville = bl.DO_VilleLivraison ?? string.Empty,
                            LI_CodePostal = bl.DO_CodePostalLivraison,
                            LI_Latitude = bl.DO_LatitudeLivraison,
                            LI_Longitude = bl.DO_LongitudeLivraison,
                            LI_Statut = DeliveryStatusCodes.Depot,
                            DepotPassageNumber = 0,
                            LI_DateCreation = DateTime.UtcNow,
                        });

                        _db.F_LIVRAISON_HISTORIQUES.Add(new F_LIVRAISON_HISTORIQUE
                        {
                            DoPiece = blPiece,
                            LivreurUserId = chosen.UtilisateurId,
                            LivreurProfileId = chosen.cbMarq,
                            Type = "ASSIGN_AUTO",
                            Note = "Affectation automatique à la confirmation.",
                            CreatedAt = DateTime.UtcNow,
                        });

                        await _db.SaveChangesAsync(ct);
                    }
                }
                else
                {
                    noLivreurForZone = true;
                }
            }

            // Phase 3b — alerte superviseur si aucun livreur ne couvre la zone.
            F_SUPERVISOR_ALERT? zoneAlert = null;
            if (noLivreurForZone)
            {
                var zoneLabel = (!string.IsNullOrWhiteSpace(govZone) && !string.IsNullOrWhiteSpace(delZone))
                    ? $"{govZone} / {delZone}"
                    : govZone ?? delZone ?? "zone inconnue";

                zoneAlert = new F_SUPERVISOR_ALERT
                {
                    Severity = "CRITICAL",
                    AlertType = "ZONE_SANS_LIVREUR",
                    Message = $"BC {blPiece} confirmé mais aucun livreur ne couvre la zone {zoneLabel}. Affectation manuelle requise.",
                    CreatedAt = DateTime.UtcNow
                };
                _db.F_SUPERVISOR_ALERTS.Add(zoneAlert);
            }

            // Phase 4 — libération automatique du verrou 15 min après confirmation.
            await _db.CommandeConfirmationLocks
                .Where(l => l.DoPiece == piece)
                .ExecuteDeleteAsync(ct);

            await trx.CommitAsync(ct);

            // Phase 3c — push SignalR vers superviseurs (non bloquant, après commit).
            if (zoneAlert != null)
            {
                try
                {
                    await _hub.Clients.Group(ReclamationEvents.GroupSuperviseurs)
                        .SendAsync(ReclamationEvents.NouvelleAlerte, new
                        {
                            id = zoneAlert.Id,
                            severity = zoneAlert.Severity,
                            alertType = zoneAlert.AlertType,
                            message = zoneAlert.Message,
                        }, ct);
                }
                catch
                {
                    // Non bloquant.
                }
            }

            // ----- Sync Sage : POST docentete BL après commit local ------------
            // L'envoi est volontairement non-bloquant : si Sage est HS ou répond
            // 4xx, le BL local reste valide et le compte rendu remonte au front.
            var sagePayload = new SageDocEntetePayload
            {
                DO_Domaine = bl.DO_Domaine,
                DO_Type = bl.DO_Type,
                DO_Piece = bl.DO_Piece ?? blPiece,
                DO_Date = bl.DO_Date,
                DO_Tiers = bl.DO_Tiers,
                DE_No = bl.DE_No,
                DO_TotalHT = bl.DO_TotalHT,
                DO_TotalTTC = bl.DO_TotalTTC,
                DO_NetAPayer = bl.DO_NetAPayer,
                DO_FraisLivraison = bl.DO_FraisLivraison,
                DO_TimbreFiscal = bl.DO_TimbreFiscal,
                DO_ModeLivraison = bl.DO_ModeLivraison,
                DO_ModePaiement = bl.DO_ModePaiement,
                DO_AdresseLivraison = bl.DO_AdresseLivraison,
                DO_VilleLivraison = bl.DO_VilleLivraison,
                DO_CodePostalLivraison = bl.DO_CodePostalLivraison,
                DO_TelephoneLivraison = bl.DO_TelephoneLivraison,
                DO_Valide = bl.DO_Valide,
                DO_Ref = bl.DO_Ref,
                Lines = await _db.F_DOCLIGNES
                    .AsNoTracking()
                    .Where(l => l.DO_Piece == blPiece && l.DO_Domaine == 0 && l.DO_Type == 1)
                    .Select(l => new SageDocLignePayload
                    {
                        AR_Ref = l.AR_Ref,
                        DL_Design = l.DL_Design,
                        DL_Qte = l.DL_Qte,
                        DL_PrixUnitaire = l.DL_PrixUnitaire,
                        DL_MontantHT = l.DL_MontantHT,
                        DL_MontantTTC = l.DL_MontantTTC,
                    })
                    .ToListAsync(ct)
            };

            var sageResult = await _sage.PostDocEnteteAsync(sagePayload, ct);

            // Phase 5 — Événement 4 : CommandeLiberee (suite à confirmation) vers groupe conf.
            // + Événement 7 : StatutCommandeChange vers le client (BC → BL).
            try
            {
                await _hub.Clients.Group(ReclamationEvents.GroupConfirmateurs)
                    .SendAsync(ReclamationEvents.CommandeLiberee,
                        new { doPiece = piece, reason = "transform-to-bl" }, ct);

                // Client = ProfilUtilisateur lié via DO_Tiers → CodeClientSage.
                if (!string.IsNullOrWhiteSpace(bc.DO_Tiers))
                {
                    var clientUserId = await _db.ProfilsUtilisateurs.AsNoTracking()
                        .Where(p => p.CodeClientSage == bc.DO_Tiers && p.UtilisateurId != null)
                        .Select(p => p.UtilisateurId)
                        .FirstOrDefaultAsync(ct);
                    if (clientUserId.HasValue && clientUserId.Value != Guid.Empty)
                    {
                        await _hub.Clients.User(clientUserId.Value.ToString())
                            .SendAsync(ReclamationEvents.StatutCommandeChange,
                                new { doPiece = piece, blPiece, newStatut = "CONFIRME" }, ct);
                    }
                }
            }
            catch
            {
                // Non bloquant.
            }

            return Ok(new TransformResultDto
            {
                BlPiece = blPiece,
                SageSent = sageResult.Sent,
                SageSuccess = sageResult.Success,
                SageHttpStatus = sageResult.HttpStatus,
                SageMessage = sageResult.Message,
                NoLivreurForZone = noLivreurForZone
            });
        }

        // ✅ LISTE BL
        [HttpGet("bl")]
        public async Task<ActionResult<List<ConfirmateurOrderDto>>> GetBlList([FromQuery] short? status, CancellationToken ct)
        {
            var q = _db.Set<F_DOCENTETE>()
                .AsNoTracking()
                .Where(x => x.DO_Domaine == 0 && x.DO_Type == 1)
                .OrderByDescending(x => x.cbMarq)
                .AsQueryable();

            if (status.HasValue)
                q = q.Where(x => x.DO_Valide == status.Value);

            var list = await q.Select(x => new ConfirmateurOrderDto
            {
                DO_Piece = x.DO_Piece,
                DO_Tiers = x.DO_Tiers,
                DO_Date = x.DO_Date,
                DO_TotalHT = x.DO_TotalHT,
                DO_TotalTTC = x.DO_TotalTTC,
                DO_NetAPayer = x.DO_NetAPayer,
                DO_Valide = x.DO_Valide,
                StatusLabel = x.DocumentStatus,
                Lignes = new List<ConfirmateurOrderLineDto>()
            }).ToListAsync(ct);

            foreach (var o in list)
            {
                var c = await ResolveClientAsync(o.DO_Tiers, ct);
                o.ClientType = c?.TypeClient;
                o.ClientDisplay = ComputeDisplay(c);
            }

            return Ok(list);
        }

        // ✅ DÉTAIL BL
        [HttpGet("bl/{piece}")]
        public async Task<ActionResult<ConfirmateurOrderDto>> GetBlByPiece(string piece, CancellationToken ct)
        {
            var entete = await _db.Set<F_DOCENTETE>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 1, ct);

            if (entete == null)
                return NotFound(new { message = "BL introuvable." });

            var lignes = await _db.Set<F_DOCLIGNE>()
                .AsNoTracking()
                .Where(l => l.DO_Piece == piece && l.DO_Domaine == 0 && l.DO_Type == 1)
                .OrderBy(l => l.cbMarq)
                .Select(l => new ConfirmateurOrderLineDto
                {
                    AR_Ref = l.AR_Ref,
                    DL_Design = l.DL_Design,
                    DL_Qte = l.DL_Qte,
                    DL_PrixUnitaire = l.DL_PrixUnitaire,
                    DL_MontantTTC = l.DL_MontantTTC
                })
                .ToListAsync(ct);

            await HydrateImageUrlsAsync(lignes, ct);

            var client = await ResolveClientAsync(entete.DO_Tiers, ct);

            return Ok(new ConfirmateurOrderDto
            {
                DO_Piece = entete.DO_Piece,
                DO_Tiers = entete.DO_Tiers,
                DO_Date = entete.DO_Date,
                DO_TotalHT = entete.DO_TotalHT,
                DO_TotalTTC = entete.DO_TotalTTC,
                DO_NetAPayer = entete.DO_NetAPayer,
                DO_Valide = entete.DO_Valide,
                StatusLabel = entete.DocumentStatus,

                ClientType = client?.TypeClient,
                ClientDisplay = ComputeDisplay(client),
                Client = client,

                Lignes = lignes
            });
        }

        // ── Request / Response DTOs for new endpoints ──────────────────────────────

        public class UpdateLocationRequest
        {
            public string? Gouvernorat { get; set; }
            public string? Delegation { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
        }

        // ── 1. PUT /api/confirmateur/commandes/{piece}/location ─────────────────────

        [HttpPut("commandes/{piece}/location")]
        public async Task<IActionResult> UpdateLocation(string piece, [FromBody] UpdateLocationRequest req, CancellationToken ct)
        {
            var entete = await _db.Set<F_DOCENTETE>()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 0, ct);

            if (entete == null)
                return NotFound(new { message = "BC introuvable." });

            if (entete.DO_Valide == 1)
                return BadRequest(new { message = "BC déjà transformé" });

            entete.DO_PassagerGouvernorat = req.Gouvernorat;
            entete.DO_PassagerDelegation = req.Delegation;

            if (req.Latitude.HasValue)
                entete.DO_LatitudeLivraison = req.Latitude.Value.ToString(CultureInfo.InvariantCulture);

            if (req.Longitude.HasValue)
                entete.DO_LongitudeLivraison = req.Longitude.Value.ToString(CultureInfo.InvariantCulture);

            if (!string.IsNullOrWhiteSpace(req.Gouvernorat) && !string.IsNullOrWhiteSpace(req.Delegation))
                entete.DO_AdresseLivraison = $"{req.Delegation}, {req.Gouvernorat}";

            entete.cbModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok();
        }

        // ── 2. GET /api/confirmateur/commandes/{piece}/zone-coverage ───────────────

        public class ZoneLivreurDto
        {
            public string? UserId { get; set; }
            public string? NomComplet { get; set; }
            public string? Telephone { get; set; }
            public int ActiveOrders { get; set; }
        }

        public class ZoneCoverageDto
        {
            public bool HasCoverage { get; set; }
            public string? Gouvernorat { get; set; }
            public string? Delegation { get; set; }
            public int LivreurCount { get; set; }
            public List<ZoneLivreurDto> Livreurs { get; set; } = new();
        }

        [HttpGet("commandes/{piece}/zone-coverage")]
        public async Task<ActionResult<ZoneCoverageDto>> GetZoneCoverage(string piece, CancellationToken ct)
        {
            var entete = await _db.Set<F_DOCENTETE>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 0, ct);

            if (entete == null)
                return NotFound(new { message = "BC introuvable." });

            var gov = entete.DO_PassagerGouvernorat;
            var del = entete.DO_PassagerDelegation;

            if (string.IsNullOrWhiteSpace(gov) || string.IsNullOrWhiteSpace(del))
            {
                return Ok(new ZoneCoverageDto
                {
                    HasCoverage = false,
                    Gouvernorat = null,
                    Delegation = null,
                    LivreurCount = 0,
                    Livreurs = new List<ZoneLivreurDto>()
                });
            }

            var normGov = NormalizeZoneKey(gov);
            var normDel = NormalizeZoneKey(del);

            var allZones = await _db.F_LIVREUR_ZONES.AsNoTracking().ToListAsync(ct);

            var candidateIds = allZones
                .Where(z =>
                    NormalizeZoneKey(z.Gouvernorat) == normGov &&
                    NormalizeZoneKey(z.Delegation) == normDel)
                .Select(z => z.LivreurUserId)
                .Distinct()
                .ToList();

            if (candidateIds.Count == 0)
            {
                return Ok(new ZoneCoverageDto
                {
                    HasCoverage = false,
                    Gouvernorat = gov,
                    Delegation = del,
                    LivreurCount = 0,
                    Livreurs = new List<ZoneLivreurDto>()
                });
            }

            var profiles = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .Where(p => p.UtilisateurId != null
                    && candidateIds.Contains(p.UtilisateurId!.Value)
                    && p.IsTransit == false)
                .ToListAsync(ct);

            if (profiles.Count == 0)
            {
                return Ok(new ZoneCoverageDto
                {
                    HasCoverage = false,
                    Gouvernorat = gov,
                    Delegation = del,
                    LivreurCount = 0,
                    Livreurs = new List<ZoneLivreurDto>()
                });
            }

            var profileIds = profiles
                .Where(p => p.UtilisateurId.HasValue)
                .Select(p => p.UtilisateurId!.Value)
                .ToList();

            var activeCounts = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(d => d.AssignedLivreurId != null
                    && profileIds.Contains(d.AssignedLivreurId.Value)
                    && d.DO_Valide == 1)
                .GroupBy(d => d.AssignedLivreurId!.Value)
                .Select(g => new { LivreurId = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            var countDict = activeCounts.ToDictionary(x => x.LivreurId, x => x.Count);

            var livreurs = profiles
                .Where(p => p.UtilisateurId.HasValue)
                .Select(p => new ZoneLivreurDto
                {
                    UserId = p.UtilisateurId!.Value.ToString(),
                    NomComplet = p.NomComplet,
                    Telephone = p.Telephone,
                    ActiveOrders = countDict.TryGetValue(p.UtilisateurId!.Value, out var c) ? c : 0
                })
                .ToList();

            return Ok(new ZoneCoverageDto
            {
                HasCoverage = true,
                Gouvernorat = gov,
                Delegation = del,
                LivreurCount = livreurs.Count,
                Livreurs = livreurs
            });
        }

        // ── 3. GET /api/confirmateur/supervisors ───────────────────────────────────

        public class SupervisorDto
        {
            public string? UserId { get; set; }
            public string? NomComplet { get; set; }
            public string? Telephone { get; set; }
            public string? Email { get; set; }
        }

        [HttpGet("supervisors")]
        public async Task<ActionResult<List<SupervisorDto>>> GetSupervisors(CancellationToken ct)
        {
            var supervisors = await _users.GetUsersInRoleAsync(AppRoles.SUPERVISEUR);

            var ids = supervisors.Select(u => u.Id).ToList();

            var profiles = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .Where(p => p.UtilisateurId != null && ids.Contains(p.UtilisateurId!.Value))
                .ToListAsync(ct);

            var profileDict = profiles
                .Where(p => p.UtilisateurId.HasValue)
                .ToDictionary(p => p.UtilisateurId!.Value);

            var result = supervisors.Select(u =>
            {
                profileDict.TryGetValue(u.Id, out var prof);
                return new SupervisorDto
                {
                    UserId = u.Id.ToString(),
                    NomComplet = prof?.NomComplet,
                    Telephone = prof?.Telephone,
                    Email = u.Email
                };
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// B.1 — Hydrate `ImageUrl` sur chaque ligne en lisant F_ARTICLE_IMAGE :
        /// on prend l'image principale (IsMain=true) sinon la première par SortOrder.
        /// </summary>
        private async Task HydrateImageUrlsAsync(
            List<ConfirmateurOrderLineDto> lignes,
            CancellationToken ct)
        {
            var arRefs = lignes
                .Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .Select(l => l.AR_Ref!)
                .Distinct()
                .ToList();
            if (arRefs.Count == 0) return;

            var images = await _db.Set<F_ARTICLE_IMAGE>()
                .AsNoTracking()
                .Where(i => arRefs.Contains(i.AR_Ref))
                .OrderByDescending(i => i.IsMain == true)
                .ThenBy(i => i.SortOrder)
                .GroupBy(i => i.AR_Ref)
                .Select(g => new { Key = g.Key, Url = g.First().Url })
                .ToDictionaryAsync(x => x.Key, x => x.Url,
                    StringComparer.OrdinalIgnoreCase, ct);

            foreach (var l in lignes)
            {
                if (!string.IsNullOrWhiteSpace(l.AR_Ref)
                    && images.TryGetValue(l.AR_Ref, out var url))
                {
                    l.ImageUrl = url;
                }
            }
        }
    }
}