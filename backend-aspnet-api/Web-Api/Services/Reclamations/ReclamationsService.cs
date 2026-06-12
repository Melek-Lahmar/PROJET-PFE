using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.Services.Confirmatrice;
using Web_Api.data;
using Web_Api.DTO.Reclamations;
using Web_Api.Hubs;
using Web_Api.Model;

namespace Web_Api.Services.Reclamations
{
    public class ReclamationsService
    {
        private readonly AppDbContext _db;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly ReclamationPhotoStorageService _photos;
        private readonly ILogger<ReclamationsService> _logger;

        public ReclamationsService(
            AppDbContext db,
            IHttpContextAccessor httpContextAccessor,
            IHubContext<ReclamationHub> hub,
            ReclamationPhotoStorageService photos,
            ILogger<ReclamationsService> logger)
        {
            _db = db;
            _httpContextAccessor = httpContextAccessor;
            _hub = hub;
            _photos = photos;
            _logger = logger;
        }

        // ==========================================================================
        // LISTES
        // ==========================================================================

        public async Task<List<ReclamationListItemDto>> GetMineAsync(Guid userId, CancellationToken ct = default)
        {
            var items = await _db.F_RECLAMATIONS
                .AsNoTracking()
                .Where(x => x.ClientUserId == userId)
                .OrderByDescending(x => x.UpdatedAt)
                .ToListAsync(ct);

            return await MapListAsync(items, ct);
        }

        public async Task<List<ReclamationListItemDto>> GetForStaffAsync(ReclamationFilter filter, CancellationToken ct = default)
        {
            var currentStaffUserId = GetCurrentAuthenticatedUserId();

            var query = _db.F_RECLAMATIONS
                .AsNoTracking()
                .Where(x => x.AssignedToUserId == currentStaffUserId)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.Statut))
            {
                var s = filter.Statut.Trim().ToUpperInvariant();
                query = query.Where(x => x.Statut == s);
            }
            if (!string.IsNullOrWhiteSpace(filter.Source))
            {
                var s = filter.Source.Trim().ToUpperInvariant();
                query = query.Where(x => x.Source == s);
            }
            if (!string.IsNullOrWhiteSpace(filter.TypeCas))
            {
                var t = filter.TypeCas.Trim().ToUpperInvariant();
                query = query.Where(x => x.TypeCas == t);
            }
            if (!string.IsNullOrWhiteSpace(filter.Motif))
            {
                var m = filter.Motif.Trim();
                query = query.Where(x => x.Motif == m);
            }
            if (!string.IsNullOrWhiteSpace(filter.DoPiece))
            {
                var p = filter.DoPiece.Trim();
                query = query.Where(x => x.DoPiece == p);
            }
            if (filter.FromDate.HasValue)
                query = query.Where(x => x.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue)
                query = query.Where(x => x.CreatedAt <= filter.ToDate.Value);

            var items = await query.OrderByDescending(x => x.UpdatedAt).ToListAsync(ct);
            return await MapListAsync(items, ct);
        }

        // ==========================================================================
        // CRÉATION CLIENT
        // ==========================================================================

        public async Task<ReclamationResponseDto> CreateAsync(Guid userId, CreateReclamationRequestDto request, CancellationToken ct = default)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct)
                ?? throw new InvalidOperationException("Utilisateur introuvable.");

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct)
                ?? throw new InvalidOperationException("Profil client introuvable.");

            var piece = (request.DoPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("La commande est obligatoire.");

            var motif = NormalizeClientMotif(request.Motif);

            // Correction obligatoire pour certains motifs
            if (ClientMotifs.NeedsCorrection(motif) && string.IsNullOrWhiteSpace(request.CorrectionProposee))
                throw new InvalidOperationException("Ce motif exige une correction proposée (nouvelle adresse ou numéro).");

            // Phase 7 — validation reprogrammation : date obligatoire (J+1 à J+14) + créneau obligatoire.
            if (motif == ClientMotifs.REPROGRAMMATION)
            {
                if (!request.ReprogrammationDate.HasValue)
                    throw new InvalidOperationException("La date de reprogrammation est obligatoire.");
                if (!ReprogrammationCreneaux.IsValidDate(request.ReprogrammationDate.Value))
                    throw new InvalidOperationException(
                        $"La date doit être entre J+{ReprogrammationCreneaux.MinDaysAhead} et J+{ReprogrammationCreneaux.MaxDaysAhead}.");
                if (!ReprogrammationCreneaux.IsValidCreneau(request.ReprogrammationCreneau))
                    throw new InvalidOperationException(
                        "Le créneau est obligatoire : MATIN, APRES_MIDI ou SOIR.");
            }

            var order = await FindOrderAsync(piece, ct)
                ?? throw new InvalidOperationException($"Commande introuvable pour la pièce '{piece}'.");

            if (!await OrderBelongsToClientAsync(order, userId, profile, user.Email, ct))
                throw new UnauthorizedAccessException("Cette commande n'appartient pas au client connecté.");

            // Filtrage motif selon le statut commande (livrée ou non)
            var isDelivered = await IsDeliveredAsync(order, ct);
            if (!ClientMotifsByOrderStatus.IsAllowed(motif, isDelivered))
            {
                throw new InvalidOperationException(isDelivered
                    ? "Ce motif n'est pas disponible pour une commande déjà livrée."
                    : "Ce motif n'est pas disponible tant que la commande n'est pas livrée.");
            }

            // Refus si une Demande livreur ouverte existe pour ce même motif (adresse/numéro)
            if ((motif == ClientMotifs.CHANGEMENT_ADRESSE || motif == ClientMotifs.CHANGEMENT_NUMERO))
            {
                var correspondingMotifs = motif == ClientMotifs.CHANGEMENT_ADRESSE
                    ? new[] { LivreurMotifs.ADRESSE_INCORRECTE }
                    : new[] { LivreurMotifs.NUMERO_INCORRECT };

                var existingDemande = await _db.F_RECLAMATIONS.AsNoTracking()
                    .AnyAsync(r => r.DoPiece == piece
                        && r.TypeCas == Auth.Constants.TypeCas.DEMANDE
                        && (r.Statut == ReclamationStatuses.ENVOYEE || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT)
                        && correspondingMotifs.Contains(r.Motif), ct);

                if (existingDemande)
                    throw new InvalidOperationException("Une demande est déjà en cours sur cette commande. Va dans l'onglet Demandes pour y répondre.");
            }

            // Phase 3B : attribution auto à UNE seule confirmatrice selon 3 critères :
            //   1. éligible (IsInPause = false ET LastActivityAt > now - 10 min)
            //   2. moins chargée (MIN cas En cours de traitement, Réclamations + Demandes confondues)
            //   3. départage sur LastAssignmentAt le plus ancien (null en premier)
            // Si aucune conf. disponible : le cas est créé non attribué (sera repris en 3C).
            var assignedConfirmateur = await FindEligibleConfirmatriceAsync(excludeUserId: null, ct);

            string? normalizedArRef = null;
            var isGlobal = request.IsGlobal;
            if (!isGlobal)
            {
                var rawArRef = (request.ArRef ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(rawArRef))
                    throw new InvalidOperationException("L'article concerné est obligatoire lorsque la réclamation n'est pas globale.");

                var line = await FindLineAsync(piece, rawArRef, ct);
                if (line == null)
                    throw new InvalidOperationException($"L'article '{rawArRef}' n'appartient pas à la commande '{piece}'.");

                normalizedArRef = (line.AR_Ref ?? rawArRef).Trim();
            }

            var now = DateTime.UtcNow;

            var reclamation = new F_RECLAMATION
            {
                CodeReclamation = await GenerateCodeAsync(ct),
                DoPiece = piece,
                ArRef = normalizedArRef,
                IsGlobal = isGlobal,
                ClientUserId = userId,
                ClientProfileId = profile.cbMarq,
                AssignedToUserId = assignedConfirmateur?.Id,
                CreatedByUserId = userId,
                TypeReclamation = NormalizeType(request.TypeReclamation),
                TypeCas = Auth.Constants.TypeCas.RECLAMATION,
                Motif = motif,
                Description = (request.Description ?? string.Empty).Trim(),
                Statut = ReclamationStatuses.ENVOYEE,
                Source = ReclamationSources.CLIENT,
                VisibleClient = false, // Réclamation client : visible via /api/reclamations, pas via /api/demandes
                Priorite = NormalizePriority(request.Priorite),
                CorrectionProposee = string.IsNullOrWhiteSpace(request.CorrectionProposee) ? null : request.CorrectionProposee.Trim(),
                CorrectionAppliquee = false,
                // Phase 7 — persiste date + créneau si motif REPROGRAMMATION.
                ReprogrammationDate = motif == ClientMotifs.REPROGRAMMATION ? request.ReprogrammationDate : null,
                ReprogrammationCreneau = motif == ClientMotifs.REPROGRAMMATION
                    ? request.ReprogrammationCreneau?.Trim().ToUpperInvariant()
                    : null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.F_RECLAMATIONS.Add(reclamation);
            await _db.SaveChangesAsync(ct);

            if (assignedConfirmateur != null)
                await UpdateLastAssignmentAsync(assignedConfirmateur.Id, ct);

            await BroadcastDemandeCreatedAsync(reclamation, ct);

            var details = await GetDetailsForClientAsync(reclamation.Id, userId, ct)
                ?? throw new InvalidOperationException("Réclamation créée mais introuvable au rechargement.");

            return new ReclamationResponseDto
            {
                Message = "Réclamation créée avec succès.",
                Reclamation = details
            };
        }

        // ==========================================================================
        // DÉTAILS
        // ==========================================================================

        public async Task<ReclamationDetailsDto?> GetDetailsForClientAsync(int id, Guid userId, CancellationToken ct = default)
        {
            var entity = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.ClientUserId == userId, ct);
            return entity == null ? null : await MapDetailsAsync(entity, includeInternalNote: false, ct);
        }

        public async Task<ReclamationDetailsDto?> GetDetailsForStaffAsync(int id, CancellationToken ct = default)
        {
            var currentStaffUserId = GetCurrentAuthenticatedUserId();
            var entity = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.AssignedToUserId == currentStaffUserId, ct);
            return entity == null ? null : await MapDetailsAsync(entity, includeInternalNote: true, ct);
        }

        // ==========================================================================
        // TENTATIVES LIVREUR — création automatique de demande
        // ==========================================================================

        /// <summary>
        /// Appelé quand un livreur change le statut d'une commande vers un statut
        /// différé (REPORTE, TENTATIVE, RETOUR, DEPOT, REFUSE). Enregistre une tentative
        /// du jour et crée/rattache une demande selon la règle d'escalation.
        /// </summary>
        public async Task<F_RECLAMATION?> RecordLivreurAttemptAsync(
            Guid livreurUserId,
            LivreurTentativeRequestDto request,
            IFormFile? photo,
            CancellationToken ct = default)
        {
            var piece = (request.DoPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("La référence commande est obligatoire.");

            var motif = NormalizeLivreurMotif(request.Motif);

            if (LivreurMotifs.NeedsPhoto(motif) && (photo == null || photo.Length == 0))
                throw new InvalidOperationException("Une photo est obligatoire pour ce motif.");

            if (LivreurMotifs.NeedsDescription(motif))
            {
                var desc = (request.Description ?? string.Empty).Trim();
                if (desc.Length < LivreurMotifs.DescriptionMinLength)
                    throw new InvalidOperationException(
                        $"Une description d'au moins {LivreurMotifs.DescriptionMinLength} caractères est obligatoire pour ce motif.");
            }

            var order = await FindOrderAsync(piece, ct)
                ?? throw new InvalidOperationException($"Commande introuvable pour la pièce '{piece}'.");

            var today = DateTime.UtcNow.Date;
            var now = DateTime.UtcNow;

            // Upsert tentative du jour
            var tentative = await _db.F_RECLAMATION_TENTATIVES
                .FirstOrDefaultAsync(t => t.CommandePiece == piece && t.DateJour == today, ct);

            if (tentative == null)
            {
                tentative = new F_RECLAMATION_TENTATIVE
                {
                    CommandePiece = piece,
                    DateJour = today,
                    Motif = motif,
                    LivreurUserId = livreurUserId,
                    Latitude = request.Latitude,
                    Longitude = request.Longitude,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _db.F_RECLAMATION_TENTATIVES.Add(tentative);
                await _db.SaveChangesAsync(ct);
            }
            else
            {
                tentative.Motif = motif;
                tentative.LivreurUserId = livreurUserId;
                tentative.Latitude = request.Latitude ?? tentative.Latitude;
                tentative.Longitude = request.Longitude ?? tentative.Longitude;
                tentative.UpdatedAt = now;
            }

            // Photo
            if (photo != null && photo.Length > 0)
            {
                var stored = await _photos.StoreAsync(0, photo, ct);
                tentative.PhotoUrl = stored.RelativeUrl;
            }

            // Existe-t-il déjà une demande OUVERTE pour cette commande ?
            var activeDemande = await _db.F_RECLAMATIONS
                .FirstOrDefaultAsync(r => r.DoPiece == piece
                    && r.Source == ReclamationSources.LIVREUR
                    && (r.Statut == ReclamationStatuses.ENVOYEE || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT), ct);

            var shouldEscalate = LivreurMotifs.IsImmediate(motif);

            if (!shouldEscalate && LivreurMotifs.IsDeferred(motif))
            {
                // Logique 3 tentatives : 1 tentative = 1 jour (unicité garantie par l'index
                // UNIQUE sur F_RECLAMATION_TENTATIVE(CommandePiece, DateJour)).
                // On compte les jours DISTINCTS avec un motif différé (TELEPHONE_ETEINT,
                // CLIENT_INJOIGNABLE, CLIENT_ABSENT). La tentative du jour courant est déjà
                // persistée ci-dessus, donc incluse dans le count.
                var daysWithDeferred = await _db.F_RECLAMATION_TENTATIVES
                    .Where(t => t.CommandePiece == piece && LivreurMotifs.Deferred.Contains(t.Motif))
                    .Select(t => t.DateJour)
                    .Distinct()
                    .CountAsync(ct);

                // Seuil = 3 (LivreurMotifs.DeferredThreshold). À la 3e tentative, on escalade
                // en créant une Demande VisibleClient = false remontée à la confirmatrice.
                if (daysWithDeferred >= LivreurMotifs.DeferredThreshold)
                    shouldEscalate = true;
            }

            F_RECLAMATION? resultDemande = null;

            if (activeDemande != null)
            {
                // Rattacher la tentative à la demande existante et mettre à jour compteurs
                tentative.ReclamationId = activeDemande.Id;
                activeDemande.LastAttemptAt = now;
                activeDemande.UpdatedAt = now;
                activeDemande.TentativesCount = await _db.F_RECLAMATION_TENTATIVES
                    .CountAsync(t => t.ReclamationId == activeDemande.Id && LivreurMotifs.Deferred.Contains(t.Motif), ct);
                await _db.SaveChangesAsync(ct);
                resultDemande = activeDemande;
            }
            else if (shouldEscalate)
            {
                resultDemande = await CreateLivreurDemandeAsync(order, livreurUserId, motif, request.Description, tentative, ct);
                tentative.ReclamationId = resultDemande.Id;
                await _db.SaveChangesAsync(ct);
                await BroadcastDemandeCreatedAsync(resultDemande, ct);

                // Phase 5 — Événement 6 : SeuilTentativesAtteint, uniquement si l'escalade
                // vient d'un motif différé (3e tentative). Les motifs immédiats (A/B) ne
                // passent pas par le seuil.
                if (LivreurMotifs.IsDeferred(motif))
                {
                    try
                    {
                        var payload = new { id = resultDemande.Id, code = resultDemande.CodeReclamation, doPiece = piece, motif };
                        if (resultDemande.AssignedToUserId.HasValue)
                        {
                            await _hub.Clients.User(resultDemande.AssignedToUserId.Value.ToString())
                                .SendAsync(Hubs.ReclamationEvents.SeuilTentativesAtteint, payload, ct);
                        }
                        await _hub.Clients.User(livreurUserId.ToString())
                            .SendAsync(Hubs.ReclamationEvents.SeuilTentativesAtteint, payload, ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "5: émission SeuilTentativesAtteint échouée (cas={Id})", resultDemande.Id);
                    }
                }
            }
            else
            {
                // Pas d'escalade, juste sauvegarder la tentative
                await _db.SaveChangesAsync(ct);
            }

            return resultDemande;
        }

        private async Task<F_RECLAMATION> CreateLivreurDemandeAsync(
            F_DOCENTETE order,
            Guid livreurUserId,
            string motif,
            string? description,
            F_RECLAMATION_TENTATIVE tentative,
            CancellationToken ct)
        {
            // Retrouver le client via DO_Tiers ou via les users
            var clientProfile = await FindClientProfileForOrderAsync(order, ct);
            var clientUserId = clientProfile?.UtilisateurId ?? Guid.Empty;

            // Phase 3B : attribution auto 3 critères, plus de filtre gouvernorat.
            var assignedConfirmateur = await FindEligibleConfirmatriceAsync(excludeUserId: null, ct);

            var now = DateTime.UtcNow;

            var demande = new F_RECLAMATION
            {
                CodeReclamation = await GenerateCodeAsync(ct),
                DoPiece = order.DO_Piece ?? string.Empty,
                ArRef = null,
                IsGlobal = true,
                ClientUserId = clientUserId,
                ClientProfileId = clientProfile?.cbMarq,
                AssignedToUserId = assignedConfirmateur?.Id,
                CreatedByUserId = livreurUserId,
                TypeReclamation = "LIVRAISON",
                TypeCas = LivreurMotifs.ProducesDemande(motif)
                    ? Auth.Constants.TypeCas.DEMANDE
                    : Auth.Constants.TypeCas.RECLAMATION,
                Motif = motif,
                Description = string.IsNullOrWhiteSpace(description)
                    ? $"Signalement livreur — motif {motif}"
                    : description.Trim(),
                Statut = ReclamationStatuses.ENVOYEE,
                Source = ReclamationSources.LIVREUR,
                VisibleClient = LivreurMotifs.IsVisibleClient(motif), // Motifs A (adresse/numéro) → true ; B et C → false
                TentativesCount = 1,
                FirstAttemptAt = tentative.CreatedAt,
                LastAttemptAt = tentative.UpdatedAt,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.F_RECLAMATIONS.Add(demande);
            await _db.SaveChangesAsync(ct);

            if (assignedConfirmateur != null)
                await UpdateLastAssignmentAsync(assignedConfirmateur.Id, ct);

            return demande;
        }

        // ==========================================================================
        // ACTIONS CONFIRMATRICE
        // ==========================================================================

        public async Task<ReclamationDetailsDto> UpdateStatusAsync(int id, string newStatus, string? motifRefus, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id && x.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée à cette confirmatrice.");

            var normalized = (newStatus ?? string.Empty).Trim().ToUpperInvariant();
            if (!ReclamationStatuses.IsStaffEditable(normalized))
                throw new InvalidOperationException("Statut non autorisé. Utilisez EN_COURS_DE_TRAITEMENT, CLOTUREE ou REFUSEE.");

            if (normalized == ReclamationStatuses.REFUSEE && string.IsNullOrWhiteSpace(motifRefus))
                throw new InvalidOperationException("Un motif de refus est obligatoire.");

            var now = DateTime.UtcNow;
            reclamation.Statut = normalized;
            reclamation.UpdatedAt = now;

            if (normalized == ReclamationStatuses.CLOTUREE) reclamation.ResolvedAt = now;
            if (normalized == ReclamationStatuses.REFUSEE)
            {
                reclamation.ResolvedAt = now;
                reclamation.ClosedAt = now;
                reclamation.MotifRefus = (motifRefus ?? string.Empty).Trim();
            }

            // Auto-cancel order when confirmatrice closes an ANNULATION claim
            if (normalized == ReclamationStatuses.CLOTUREE && reclamation.Motif == ClientMotifs.ANNULATION)
            {
                var orderToCancel = await _db.F_DOCENTETES
                    .FirstOrDefaultAsync(o => o.DO_Piece == reclamation.DoPiece, ct);
                if (orderToCancel != null && orderToCancel.DO_Valide != F_DOCENTETE.STATUS_REFUSE)
                    orderToCancel.DO_Valide = F_DOCENTETE.STATUS_REFUSE;
            }

            await _db.SaveChangesAsync(ct);
            await BroadcastDemandeStatusChangedAsync(reclamation, ct);
            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        public async Task<ReclamationDetailsDto> TakeOverAsync(int id, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id && x.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            if (reclamation.Statut == ReclamationStatuses.ENVOYEE)
            {
                reclamation.Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT;
                reclamation.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                await BroadcastDemandeStatusChangedAsync(reclamation, ct);
            }

            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        public async Task<ReclamationDetailsDto> ApplyCorrectionAsync(int id, ApplyCorrectionRequestDto request, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id && x.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            if (ReclamationStatuses.IsClosed(reclamation.Statut))
                throw new InvalidOperationException("Ce cas est déjà clos.");

            // Retrouver la commande concernée (portée V1 : on écrit sur F_DOCENTETE uniquement,
            // pas sur ProfilUtilisateur — la correction ne s'applique qu'à la commande en cours).
            var order = await _db.F_DOCENTETES
                .FirstOrDefaultAsync(o => o.DO_Piece != null && o.DO_Piece == reclamation.DoPiece, ct)
                ?? throw new InvalidOperationException("Commande introuvable.");

            // Contrôle défensif : la commande ne doit pas être déjà livrée ni retournée.
            if (await IsOrderLockedForCorrectionAsync(order, ct))
                throw new InvalidOperationException(
                    "Impossible d'appliquer la correction : la commande est déjà livrée ou retournée.");

            var hasAddress = !string.IsNullOrWhiteSpace(request.NewAddress);
            var hasPhone = !string.IsNullOrWhiteSpace(request.NewPhone);

            if (!hasAddress && !hasPhone)
                throw new InvalidOperationException(
                    "Aucune correction fournie : adresse ou téléphone requis.");

            if (hasPhone && !Web_Api.Validation.TunisianPhone.IsValid(request.NewPhone))
                throw new InvalidOperationException(
                    "Le numéro doit être un numéro tunisien valide à 8 chiffres.");

            // === Écriture sur F_DOCENTETE (snapshot livraison) ===
            if (hasAddress)
            {
                var trimmedAddress = request.NewAddress!.Trim();
                order.DO_AdresseLivraison = trimmedAddress.Length > 150
                    ? trimmedAddress.Substring(0, 150)
                    : trimmedAddress;
                if (request.NewLatitude.HasValue)
                    order.DO_LatitudeLivraison = request.NewLatitude.Value.ToString(
                        System.Globalization.CultureInfo.InvariantCulture);
                if (request.NewLongitude.HasValue)
                    order.DO_LongitudeLivraison = request.NewLongitude.Value.ToString(
                        System.Globalization.CultureInfo.InvariantCulture);
            }
            if (hasPhone)
            {
                order.DO_TelephoneLivraison = Web_Api.Validation.TunisianPhone.Normalize(request.NewPhone!);
            }

            // Phase 6 — Repère / Instructions livreur (optionnels, toujours sur F_DOCENTETE).
            if (!string.IsNullOrWhiteSpace(request.Repere))
            {
                var repere = request.Repere.Trim();
                order.DO_RepereLivraison = repere.Length > 200 ? repere.Substring(0, 200) : repere;
            }
            if (!string.IsNullOrWhiteSpace(request.InstructionsLivreur))
            {
                var instr = request.InstructionsLivreur.Trim();
                order.DO_InstructionsLivraison = instr.Length > 500 ? instr.Substring(0, 500) : instr;
            }

            order.cbModification = DateTime.UtcNow;

            // Clôturer la réclamation (statut final CLOTUREE)
            var now = DateTime.UtcNow;
            reclamation.CorrectionAppliquee = true;
            reclamation.Statut = ReclamationStatuses.CLOTUREE;
            reclamation.UpdatedAt = now;
            reclamation.ClosedAt = now;
            reclamation.ResolvedAt = now;

            await _db.SaveChangesAsync(ct);
            await BroadcastDemandeStatusChangedAsync(reclamation, ct);

            // Phase 5 — Événement 8 : CorrectionAppliquee (livreur + client).
            try
            {
                var payload = new
                {
                    id = reclamation.Id,
                    code = reclamation.CodeReclamation,
                    doPiece = reclamation.DoPiece,
                    newAddress = hasAddress ? request.NewAddress : null,
                    newPhone = hasPhone ? order.DO_TelephoneLivraison : null
                };
                if (reclamation.ClientUserId != Guid.Empty)
                {
                    await _hub.Clients.User(reclamation.ClientUserId.ToString())
                        .SendAsync(Hubs.ReclamationEvents.CorrectionAppliquee, payload, ct);
                }
                // Le livreur assigné à la commande doit être notifié (bandeau rouge levé côté app).
                if (order.AssignedLivreurId.HasValue)
                {
                    await _hub.Clients.User(order.AssignedLivreurId.Value.ToString())
                        .SendAsync(Hubs.ReclamationEvents.CorrectionAppliquee, payload, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "5: émission CorrectionAppliquee échouée (cas={Id})", reclamation.Id);
            }

            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        /// <summary>
        /// Vrai si la commande est dans un état qui interdit la correction
        /// (déjà livrée ou statut REFUSE = retournée).
        /// </summary>
        private async Task<bool> IsOrderLockedForCorrectionAsync(F_DOCENTETE order, CancellationToken ct)
        {
            if (order.DO_Valide == F_DOCENTETE.STATUS_REFUSE)
                return true;
            return await IsDeliveredAsync(order, ct);
        }

        /// <summary>
        /// Renvoie l'état d'escalade d'une commande du point de vue du livreur courant.
        /// Le livreur est considéré en escalade si :
        ///   - il a accumulé au moins DeferredThreshold jours distincts de tentatives
        ///     avec un motif différé (Téléphone fermé / Client non joignable / Client absent)
        ///   - ET il existe une Demande ouverte (non clôturée / non refusée) pour cette commande.
        /// Le front livreur affiche un bandeau persistant et désactive les actions
        /// tant que cet état n'est pas levé par la confirmatrice.
        /// </summary>
        public async Task<OrderEscalationStatusDto> GetOrderEscalationStatusAsync(
            string piece, Guid livreurUserId, CancellationToken ct = default)
        {
            var normalizedPiece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(normalizedPiece))
                throw new InvalidOperationException("La référence commande est obligatoire.");

            var tentativesCount = await _db.F_RECLAMATION_TENTATIVES.AsNoTracking()
                .Where(t => t.CommandePiece == normalizedPiece
                    && t.LivreurUserId == livreurUserId
                    && LivreurMotifs.Deferred.Contains(t.Motif))
                .Select(t => t.DateJour)
                .Distinct()
                .CountAsync(ct);

            var openDemande = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.DoPiece == normalizedPiece
                    && r.Source == ReclamationSources.LIVREUR
                    && (r.Statut == ReclamationStatuses.ENVOYEE
                        || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT)
                    && LivreurMotifs.Deferred.Contains(r.Motif))
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync(ct);

            var isEscalated =
                tentativesCount >= LivreurMotifs.DeferredThreshold
                && openDemande != null;

            return new OrderEscalationStatusDto
            {
                DoPiece = normalizedPiece,
                TentativesCount = tentativesCount,
                Threshold = LivreurMotifs.DeferredThreshold,
                IsEscalated = isEscalated,
                OpenDemandeId = openDemande?.Id,
                OpenDemandeStatut = openDemande?.Statut,
                OpenDemandeMotif = openDemande?.Motif
            };
        }

        public async Task<ReclamationDetailsDto> ChangeCommandeStatusAsync(int id, ChangeCommandeStatusFromDemandeRequestDto request, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id && x.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            var order = await _db.F_DOCENTETES
                .FirstOrDefaultAsync(x => x.DO_Piece != null && x.DO_Piece == reclamation.DoPiece, ct)
                ?? throw new InvalidOperationException("Commande introuvable.");

            order.DO_Valide = request.NewStatus;

            if (reclamation.Statut == ReclamationStatuses.ENVOYEE)
                reclamation.Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT;
            reclamation.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.Note))
                reclamation.NoteInterne = (reclamation.NoteInterne ?? string.Empty) +
                    $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Changement statut commande vers {request.NewStatus}: {request.Note.Trim()}";

            await _db.SaveChangesAsync(ct);
            await BroadcastDemandeStatusChangedAsync(reclamation, ct);

            // Si la commande passe à LIVRE, auto-résoudre les demandes ouvertes
            if (request.NewStatus == F_DOCENTETE.STATUS_CONFIRME)
            {
                // Ne rien faire ici — le hook est dans RecordLivreurAttempt + SetOrderDelivered
            }

            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        public async Task<ReclamationDetailsDto> UpdateNoteAsync(int id, string? note, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id && x.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            reclamation.NoteInterne = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
            reclamation.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        public async Task<ReclamationDetailsDto> AssignAsync(int id, Guid confirmatriceUserId, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable.");

            // Anti-vol : on ne peut (ré)attribuer qu'un cas libre ou déjà à soi — jamais
            // celui d'une autre confirmatrice active.
            if (reclamation.AssignedToUserId.HasValue && reclamation.AssignedToUserId.Value != actorUserId)
                throw new InvalidOperationException("Ce cas est déjà pris en charge par une autre confirmatrice.");

            var target = await EnsureConfirmateurAsync(confirmatriceUserId, ct);
            reclamation.AssignedToUserId = confirmatriceUserId;
            reclamation.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        // ==========================================================================
        // AUTO-RÉSOLUTION SUR LIVRE
        // ==========================================================================

        public async Task AutoResolveOnDeliveredAsync(string doPiece, CancellationToken ct = default)
        {
            var piece = (doPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece)) return;

            var openDemandes = await _db.F_RECLAMATIONS
                .Where(r => r.DoPiece == piece
                    && (r.Statut == ReclamationStatuses.ENVOYEE || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT))
                .ToListAsync(ct);

            var now = DateTime.UtcNow;
            foreach (var d in openDemandes)
            {
                d.Statut = ReclamationStatuses.CLOTUREE;
                d.ResolvedAt = now;
                d.UpdatedAt = now;
                d.NoteInterne = (d.NoteInterne ?? string.Empty) +
                    $"\n[{now:yyyy-MM-dd HH:mm}] Livraison effectuée — cas clos automatiquement.";
            }

            if (openDemandes.Count > 0)
            {
                await _db.SaveChangesAsync(ct);
                foreach (var d in openDemandes)
                    await BroadcastDemandeStatusChangedAsync(d, ct);
            }
        }

        // ==========================================================================
        // PHOTOS
        // ==========================================================================

        public async Task<ReclamationPhotoDto> AddPhotoAsync(int reclamationId, Guid userId, IFormFile file, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reclamationId
                    && (r.ClientUserId == userId || r.AssignedToUserId == userId), ct)
                ?? throw new UnauthorizedAccessException("Accès refusé.");

            if (ReclamationStatuses.IsClosed(reclamation.Statut))
                throw new InvalidOperationException("Impossible d'ajouter une photo, le cas est clos.");

            var existingCount = await _db.F_RECLAMATION_PHOTOS.CountAsync(p => p.ReclamationId == reclamationId, ct);
            if (existingCount >= 5)
                throw new InvalidOperationException("Maximum 5 photos par demande.");

            var stored = await _photos.StoreAsync(reclamationId, file, ct);

            var photo = new F_RECLAMATION_PHOTO
            {
                ReclamationId = reclamationId,
                Url = stored.RelativeUrl,
                FileName = stored.OriginalFileName,
                ContentType = stored.ContentType,
                Size = stored.Size,
                UploadedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.F_RECLAMATION_PHOTOS.Add(photo);
            await _db.SaveChangesAsync(ct);

            return new ReclamationPhotoDto
            {
                Id = photo.Id,
                Url = photo.Url,
                FileName = photo.FileName,
                ContentType = photo.ContentType,
                Size = photo.Size,
                UploadedByUserId = photo.UploadedByUserId,
                CreatedAt = photo.CreatedAt
            };
        }

        // ==========================================================================
        // BROADCAST SIGNALR
        // ==========================================================================

        private async Task BroadcastDemandeCreatedAsync(F_RECLAMATION r, CancellationToken ct)
        {
            // Phase 5 — Événement 1 : NouveauCas. Vers la conf attribuée + le client si
            // c'est une Demande visible (motif A → VisibleClient = true).
            var payload = new { id = r.Id, code = r.CodeReclamation, source = r.Source, motif = r.Motif, typeCas = r.TypeCas.ToString() };

            if (r.AssignedToUserId.HasValue)
            {
                await _hub.Clients.User(r.AssignedToUserId.Value.ToString())
                    .SendAsync(Hubs.ReclamationEvents.NouveauCas, payload, ct);
            }

            if (r.Source == ReclamationSources.LIVREUR && r.VisibleClient && r.ClientUserId != Guid.Empty)
            {
                await _hub.Clients.User(r.ClientUserId.ToString())
                    .SendAsync(Hubs.ReclamationEvents.NouveauCas, payload, ct);
            }
        }

        private async Task BroadcastDemandeStatusChangedAsync(F_RECLAMATION r, CancellationToken ct)
        {
            // Phase 5 — Événement 2 : StatutCasChange.
            var payload = new { id = r.Id, code = r.CodeReclamation, statut = r.Statut };

            if (r.ClientUserId != Guid.Empty)
            {
                await _hub.Clients.User(r.ClientUserId.ToString())
                    .SendAsync(Hubs.ReclamationEvents.StatutCasChange, payload, ct);
            }

            if (r.AssignedToUserId.HasValue)
            {
                await _hub.Clients.User(r.AssignedToUserId.Value.ToString())
                    .SendAsync(Hubs.ReclamationEvents.StatutCasChange, payload, ct);
            }
        }

        /// <summary>
        /// Phase 5 — Événement additionnel CasReattribue. Notifie l'ancienne conf (retrait)
        /// et la nouvelle (ajout) lors d'une redistribution 3C.
        /// </summary>
        private async Task BroadcastCasReattribueAsync(
            int reclamationId, Guid? previousUserId, Guid newUserId, CancellationToken ct)
        {
            var payload = new { id = reclamationId, previousUserId, newUserId };

            if (previousUserId.HasValue)
            {
                await _hub.Clients.User(previousUserId.Value.ToString())
                    .SendAsync(Hubs.ReclamationEvents.CasReattribue, payload, ct);
            }
            await _hub.Clients.User(newUserId.ToString())
                .SendAsync(Hubs.ReclamationEvents.CasReattribue, payload, ct);
        }

        // ==========================================================================
        // MAPPING
        // ==========================================================================

        private async Task<List<ReclamationListItemDto>> MapListAsync(List<F_RECLAMATION> items, CancellationToken ct)
        {
            if (items.Count == 0) return new();

            var ids = items.Select(i => i.Id).ToList();
            var profileIds = items.Where(x => x.ClientProfileId.HasValue).Select(x => x.ClientProfileId!.Value).Distinct().ToList();
            var userIds = items.Where(x => x.AssignedToUserId.HasValue).Select(x => x.AssignedToUserId!.Value).Distinct().ToList();

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(x => profileIds.Contains(x.cbMarq)).ToListAsync(ct);
            var users = await _db.Users.AsNoTracking()
                .Where(x => userIds.Contains(x.Id)).ToListAsync(ct);

            // Lookup ArDesignation depuis F_DOCLIGNES pour les couples (DoPiece, ArRef) connus.
            var pieces = items.Where(x => !string.IsNullOrWhiteSpace(x.DoPiece) && !string.IsNullOrWhiteSpace(x.ArRef))
                .Select(x => x.DoPiece!).Distinct().ToList();
            var refs = items.Where(x => !string.IsNullOrWhiteSpace(x.ArRef))
                .Select(x => x.ArRef!.Trim()).Distinct().ToList();
            var designByKey = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            if (pieces.Count > 0 && refs.Count > 0)
            {
                var docLignes = await _db.F_DOCLIGNES.AsNoTracking()
                    .Where(l => l.DO_Piece != null && pieces.Contains(l.DO_Piece)
                        && l.AR_Ref != null && refs.Contains(l.AR_Ref))
                    .Select(l => new { l.DO_Piece, l.AR_Ref, l.DL_Design })
                    .ToListAsync(ct);
                foreach (var l in docLignes)
                {
                    var key = $"{l.DO_Piece}|{(l.AR_Ref ?? string.Empty).Trim()}";
                    if (!designByKey.ContainsKey(key)) designByKey[key] = l.DL_Design;
                }
            }

            var photoCounts = await _db.F_RECLAMATION_PHOTOS.AsNoTracking()
                .Where(p => ids.Contains(p.ReclamationId))
                .GroupBy(p => p.ReclamationId)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

            return items.Select(x =>
            {
                var profile = x.ClientProfileId.HasValue ? profiles.FirstOrDefault(p => p.cbMarq == x.ClientProfileId.Value) : null;
                var assigned = x.AssignedToUserId.HasValue ? users.FirstOrDefault(u => u.Id == x.AssignedToUserId.Value) : null;

                var (hasAddr, hasPhone) = ParseCorrectionFlags(x.CorrectionProposee);

                var arDesignation = (!string.IsNullOrWhiteSpace(x.DoPiece) && !string.IsNullOrWhiteSpace(x.ArRef))
                    ? designByKey.TryGetValue($"{x.DoPiece}|{x.ArRef!.Trim()}", out var d) ? d : null
                    : null;

                return new ReclamationListItemDto
                {
                    Id = x.Id,
                    CodeReclamation = x.CodeReclamation,
                    DoPiece = x.DoPiece,
                    ArRef = x.ArRef,
                    ArDesignation = arDesignation,
                    IsGlobal = x.IsGlobal,
                    VisibleClient = x.VisibleClient,
                    Motif = x.Motif,
                    DescriptionPreview = string.IsNullOrWhiteSpace(x.Description)
                        ? string.Empty
                        : (x.Description.Length > 120 ? x.Description[..120] + "..." : x.Description),
                    Statut = x.Statut,
                    Source = x.Source,
                    TypeReclamation = x.TypeReclamation,
                    TypeCas = x.TypeCas,
                    Priorite = x.Priorite,
                    ClientDisplay = ResolveClientDisplay(profile),
                    ClientPhone = profile?.Telephone,
                    ClientGouvernorat = profile?.Gouvernorat?.ToString(),
                    AssignedToDisplay = assigned?.Email,
                    TentativesCount = x.TentativesCount,
                    PhotosCount = photoCounts.TryGetValue(x.Id, out var c) ? c : 0,
                    HasCorrectionProposee = !string.IsNullOrWhiteSpace(x.CorrectionProposee),
                    HasAddressChange = hasAddr,
                    HasPhoneChange = hasPhone,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt,
                    ClosedAt = x.ClosedAt,
                };
            }).ToList();
        }

        /// Inspecte le JSON `CorrectionProposee` (clés produites par
        /// ReplyToDemandeAsync) et retourne deux flags : présence d'un
        /// changement d'adresse (address/latitude/longitude) et changement
        /// de téléphone (phone).
        private static (bool hasAddress, bool hasPhone) ParseCorrectionFlags(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return (false, false);
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.ValueKind != System.Text.Json.JsonValueKind.Object)
                    return (false, false);
                bool hasAddress =
                    HasNonEmpty(root, "address") ||
                    HasNonEmpty(root, "latitude") ||
                    HasNonEmpty(root, "longitude");
                bool hasPhone = HasNonEmpty(root, "phone");
                return (hasAddress, hasPhone);
            }
            catch
            {
                return (false, false);
            }
        }

        private static bool HasNonEmpty(System.Text.Json.JsonElement obj, string key)
        {
            if (!obj.TryGetProperty(key, out var v)) return false;
            return v.ValueKind switch
            {
                System.Text.Json.JsonValueKind.String => !string.IsNullOrWhiteSpace(v.GetString()),
                System.Text.Json.JsonValueKind.Number => true,
                System.Text.Json.JsonValueKind.True => true,
                _ => false,
            };
        }

        private async Task<ReclamationDetailsDto> MapDetailsAsync(F_RECLAMATION e, bool includeInternalNote, CancellationToken ct)
        {
            var profile = e.ClientProfileId.HasValue
                ? await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.cbMarq == e.ClientProfileId.Value, ct)
                : null;

            var assigned = e.AssignedToUserId.HasValue
                ? await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == e.AssignedToUserId.Value, ct)
                : null;

            ApplicationUser? clientUser = null;
            if (e.ClientUserId != Guid.Empty)
                clientUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == e.ClientUserId, ct);

            // Livreur (si source LIVREUR) : CreatedByUserId est le livreur
            ApplicationUser? livreur = null;
            ProfilUtilisateur? livreurProfile = null;
            if (e.Source == ReclamationSources.LIVREUR && e.CreatedByUserId.HasValue)
            {
                livreur = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == e.CreatedByUserId.Value, ct);
                if (livreur != null)
                    livreurProfile = await _db.ProfilsUtilisateurs.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.UtilisateurId == livreur.Id, ct);
            }

            var order = await FindOrderAsync(e.DoPiece, ct);

            var rawLines = order == null ? new List<F_DOCLIGNE>() :
                await _db.F_DOCLIGNES.AsNoTracking()
                    .Where(x => x.DO_Piece != null && x.DO_Piece == e.DoPiece)
                    .OrderBy(x => x.cbMarq).ToListAsync(ct);

            var lines = rawLines.Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .Select(l => new ReclamationOrderLineDto
                {
                    ArRef = (l.AR_Ref ?? string.Empty).Trim(),
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList();

            string? arDesignation = null;
            if (!e.IsGlobal && !string.IsNullOrWhiteSpace(e.ArRef))
            {
                var needle = e.ArRef!.Trim();
                arDesignation = lines.FirstOrDefault(l => string.Equals(l.ArRef, needle, StringComparison.OrdinalIgnoreCase))?.Designation;
            }

            var tentatives = await _db.F_RECLAMATION_TENTATIVES.AsNoTracking()
                .Where(t => t.CommandePiece == e.DoPiece)
                .OrderBy(t => t.DateJour).ToListAsync(ct);

            var livreurIds = tentatives.Select(t => t.LivreurUserId).Distinct().ToList();
            var livreurUsers = await _db.Users.AsNoTracking()
                .Where(u => livreurIds.Contains(u.Id)).ToListAsync(ct);
            var livreurProfiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId.HasValue && livreurIds.Contains(p.UtilisateurId.Value))
                .ToListAsync(ct);

            var tentativeDtos = tentatives.Select(t =>
            {
                var lp = livreurProfiles.FirstOrDefault(p => p.UtilisateurId == t.LivreurUserId);
                var lu = livreurUsers.FirstOrDefault(u => u.Id == t.LivreurUserId);
                return new ReclamationTentativeDto
                {
                    Id = t.Id,
                    CommandePiece = t.CommandePiece,
                    DateJour = t.DateJour,
                    Motif = t.Motif,
                    LivreurUserId = t.LivreurUserId,
                    LivreurDisplay = lp?.NomComplet ?? lu?.Email,
                    Latitude = t.Latitude,
                    Longitude = t.Longitude,
                    PhotoUrl = t.PhotoUrl,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                };
            }).ToList();

            var photos = await _db.F_RECLAMATION_PHOTOS.AsNoTracking()
                .Where(p => p.ReclamationId == e.Id)
                .OrderBy(p => p.CreatedAt)
                .Select(p => new ReclamationPhotoDto
                {
                    Id = p.Id,
                    Url = p.Url,
                    FileName = p.FileName,
                    ContentType = p.ContentType,
                    Size = p.Size,
                    UploadedByUserId = p.UploadedByUserId,
                    CreatedAt = p.CreatedAt
                }).ToListAsync(ct);

            // Compteurs contexte client
            var clientCommandesCount = 0;
            var clientReclamationsCount = 0;
            if (profile != null)
            {
                var codeSage = profile.CodeClientSage;
                if (!string.IsNullOrWhiteSpace(codeSage))
                {
                    clientCommandesCount = await _db.F_DOCENTETES.AsNoTracking()
                        .CountAsync(o => o.DO_Tiers == codeSage, ct);
                }
                clientReclamationsCount = await _db.F_RECLAMATIONS.AsNoTracking()
                    .CountAsync(r => r.ClientUserId == e.ClientUserId, ct);
            }

            return new ReclamationDetailsDto
            {
                Id = e.Id,
                CodeReclamation = e.CodeReclamation,
                DoPiece = e.DoPiece,
                ArRef = e.ArRef,
                ArDesignation = arDesignation,
                IsGlobal = e.IsGlobal,
                VisibleClient = e.VisibleClient,
                Motif = e.Motif,
                Description = e.Description,
                Statut = e.Statut,
                Source = e.Source,
                TypeReclamation = e.TypeReclamation,
                Priorite = e.Priorite,
                CorrectionProposee = e.CorrectionProposee,
                CorrectionAppliquee = e.CorrectionAppliquee,
                MotifRefus = e.MotifRefus,
                EchangeDemandeText = e.EchangeDemandeText,
                NoteInterne = includeInternalNote ? e.NoteInterne : null,
                TentativesCount = e.TentativesCount,
                FirstAttemptAt = e.FirstAttemptAt,
                LastAttemptAt = e.LastAttemptAt,
                ClientDisplay = ResolveClientDisplay(profile),
                ClientPhone = profile?.Telephone,
                ClientEmail = clientUser?.Email,
                ClientAddress = profile?.Adresse,
                ClientGouvernorat = profile?.Gouvernorat?.ToString(),
                ClientDelegation = profile?.Delegation,
                ClientCodeSage = profile?.CodeClientSage,
                ClientCommandesCount = clientCommandesCount,
                ClientReclamationsCount = clientReclamationsCount,
                ClientUserId = clientUser?.Id,
                LivreurDisplay = livreurProfile?.NomComplet ?? livreur?.Email,
                LivreurPhone = livreurProfile?.Telephone,
                LivreurUserId = livreur?.Id,
                AssignedToDisplay = assigned?.Email,
                OrderStatut = order != null ? F_DOCENTETE.ToStatusLabel(order.DO_Valide) : null,
                OrderDate = order?.DO_Date,
                OrderNetAPayer = order?.DO_NetAPayer,
                OrderPaymentMethod = order?.DO_ModePaiement,
                OrderDeliveryMode = order?.DO_ModeLivraison,
                OrderLines = lines,
                Tentatives = tentativeDtos,
                Photos = photos,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                ClosedAt = e.ClosedAt,
                ResolvedAt = e.ResolvedAt
            };
        }

        // ==========================================================================
        // HELPERS
        // ==========================================================================

        private async Task<string> GenerateCodeAsync(CancellationToken ct)
        {
            var prefix = $"REC-{DateTime.UtcNow:yyyyMMdd}";
            var count = await _db.F_RECLAMATIONS.CountAsync(x => x.CodeReclamation.StartsWith(prefix), ct);
            return $"{prefix}-{(count + 1):D4}";
        }

        private async Task<F_DOCENTETE?> FindOrderAsync(string piece, CancellationToken ct)
        {
            var candidates = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Piece != null && x.DO_Piece == piece)
                .OrderByDescending(x => x.DO_Date).ToListAsync(ct);
            return candidates.FirstOrDefault(x => string.Equals(x.DO_Piece?.Trim(), piece, StringComparison.OrdinalIgnoreCase));
        }

        private async Task<F_DOCLIGNE?> FindLineAsync(string piece, string arRef, CancellationToken ct)
        {
            var candidates = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(x => x.DO_Piece != null && x.DO_Piece == piece).ToListAsync(ct);
            return candidates.FirstOrDefault(x =>
                !string.IsNullOrWhiteSpace(x.AR_Ref) &&
                string.Equals(x.AR_Ref!.Trim(), arRef, StringComparison.OrdinalIgnoreCase));
        }

        private async Task<ProfilUtilisateur?> FindClientProfileForOrderAsync(F_DOCENTETE order, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(order.DO_Tiers)) return null;
            return await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.CodeClientSage == order.DO_Tiers, ct);
        }

        /// <summary>
        /// Phase 3B — Attribution auto à UNE seule confirmatrice selon 3 critères :
        ///   1. Éligibilité : IsInPause = false ET LastActivityAt dans la fenêtre "en ligne".
        ///   2. Moins chargée : MIN de cas actifs (Réclamations + Demandes en statut
        ///      ENVOYEE ou EN_COURS_DE_TRAITEMENT).
        ///   3. Départage : LastAssignmentAt le plus ancien (null = jamais attribué = premier servi).
        /// Retourne null si aucune confirmatrice n'est éligible (cas créé non attribué,
        /// redistribué en 3C au prochain scan).
        ///
        /// Phase 3C — <paramref name="excludeUserId"/> permet d'exclure la confirmatrice qui vient de
        /// perdre le cas (pause, déconnexion, inactivité). null pour les flows de création initiale.
        /// </summary>
        private async Task<ApplicationUser?> FindEligibleConfirmatriceAsync(
            Guid? excludeUserId,
            CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.Subtract(
                TimeSpan.FromMinutes(ConfirmatriceStatusService.OnlineThresholdMinutes));

            // 1) Éligibilité : confirmatrice active + non en pause + activité récente + pas l'exclue
            var candidates = await (
                from userRole in _db.UserRoles.AsNoTracking()
                join role in _db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
                join user in _db.Users.AsNoTracking() on userRole.UserId equals user.Id
                join profile in _db.ProfilsUtilisateurs.AsNoTracking() on user.Id equals profile.UtilisateurId
                where role.Name == AppRoles.CONFIRMATEUR
                      && profile.TypeProfil == TypeProfil.Employe
                      && !profile.IsInPause
                      && profile.LastActivityAt != null
                      && profile.LastActivityAt >= cutoff
                      && (excludeUserId == null || user.Id != excludeUserId.Value)
                select new
                {
                    UserId = user.Id,
                    User = user,
                    LastAssignmentAt = profile.LastAssignmentAt
                }
            ).ToListAsync(ct);

            if (candidates.Count == 0) return null;

            // 2) Charge actuelle de chacun : cas ENVOYEE + EN_COURS_DE_TRAITEMENT
            var candidateIds = candidates.Select(c => c.UserId).ToList();
            var loadByUser = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId.HasValue
                    && candidateIds.Contains(r.AssignedToUserId.Value)
                    && (r.Statut == ReclamationStatuses.ENVOYEE
                        || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT))
                .GroupBy(r => r.AssignedToUserId!.Value)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

            // 3) Sélection : moins chargée, puis LastAssignmentAt le plus ancien (null en tête)
            var selected = candidates
                .Select(c => new
                {
                    c.User,
                    Load = loadByUser.TryGetValue(c.UserId, out var n) ? n : 0,
                    LastAssign = c.LastAssignmentAt ?? DateTime.MinValue
                })
                .OrderBy(x => x.Load)
                .ThenBy(x => x.LastAssign)
                .First();

            return selected.User;
        }

        /// <summary>
        /// Met à jour ProfilsUtilisateurs.LastAssignmentAt pour la confirmatrice qui vient
        /// de recevoir un nouveau cas. Sert de départage au prochain tour.
        /// </summary>
        private async Task UpdateLastAssignmentAsync(Guid userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            await _db.ProfilsUtilisateurs
                .Where(p => p.UtilisateurId == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LastAssignmentAt, now), ct);
        }

        // ======================================================================
        // Phase 3C — Redistribution auto, libération pause / inactivité,
        //            reprise des cas orphelins.
        // Règle figée : seuls AssignedToUserId, Statut, UpdatedAt peuvent être modifiés.
        // Description, NoteInterne, CorrectionProposee, CorrectionAppliquee,
        // TentativesCount, photos, tentatives sont préservés.
        // ======================================================================

        /// <summary>
        /// Libère tous les cas actifs (ENVOYEE ou EN_COURS_DE_TRAITEMENT) attribués à
        /// <paramref name="userId"/> puis tente de les redistribuer en excluant l'ancienne.
        /// Appelée lors d'une mise en pause ou d'une déconnexion.
        /// Retourne le nombre de cas libérés.
        /// </summary>
        public async Task<int> ReleaseActiveCasesForUserAsync(
            Guid userId, string reason, CancellationToken ct = default)
        {
            var caseIds = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId == userId
                    && (r.Statut == ReclamationStatuses.ENVOYEE
                        || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT))
                .Select(r => r.Id)
                .ToListAsync(ct);

            if (caseIds.Count == 0) return 0;

            _logger.LogInformation(
                "3C: libération de {Count} cas pour user={UserId} raison={Reason}",
                caseIds.Count, userId, reason);

            var now = DateTime.UtcNow;
            await _db.F_RECLAMATIONS
                .Where(r => caseIds.Contains(r.Id) && r.AssignedToUserId == userId
                    && (r.Statut == ReclamationStatuses.ENVOYEE
                        || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(r => r.AssignedToUserId, (Guid?)null)
                    .SetProperty(r => r.Statut, ReclamationStatuses.ENVOYEE)
                    .SetProperty(r => r.UpdatedAt, now), ct);

            foreach (var id in caseIds)
            {
                await RedistributeOneCaseAsync(id, excludeUserId: userId, ct);
            }

            return caseIds.Count;
        }

        /// <summary>
        /// Parcourt les cas sans confirmatrice attribuée et tente de les attribuer via les
        /// 3 critères (sans exclusion). Utilisé par le background service 3C pour rattraper
        /// les cas créés à un moment où aucune conf. n'était éligible.
        /// <paramref name="skipIds"/> permet d'exclure des IDs (p. ex. cas libérés dans le
        /// même tick par <see cref="ReleaseStaleCasesAsync"/>, pour éviter qu'ils reviennent
        /// immédiatement à la confirmatrice exclue).
        /// </summary>
        public async Task<int> RedistributeUnassignedCasesAsync(
            IReadOnlyCollection<int>? skipIds = null,
            CancellationToken ct = default)
        {
            var skip = skipIds ?? Array.Empty<int>();

            var caseIds = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId == null
                    && r.Statut == ReclamationStatuses.ENVOYEE
                    && !skip.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(ct);

            if (caseIds.Count == 0) return 0;

            int reassigned = 0;
            foreach (var id in caseIds)
            {
                var newAssignee = await RedistributeOneCaseAsync(id, excludeUserId: null, ct);
                if (newAssignee.HasValue) reassigned++;
            }

            if (reassigned > 0)
            {
                _logger.LogInformation(
                    "3C: {Count} cas orphelins réattribués (sur {Total} candidats)",
                    reassigned, caseIds.Count);
            }

            return reassigned;
        }

        /// <summary>
        /// Libère les cas en cours dont UpdatedAt est antérieur au seuil d'inactivité, puis
        /// tente de les redistribuer en excluant la conf. qui vient de les perdre. Utilisé par
        /// le background service 3C toutes les 5 minutes (seuil figé 30 minutes).
        /// Retourne la liste des IDs effectivement libérés (utile pour que la reprise des
        /// orphelins dans le même tick les saute — sinon l'exclusion serait annulée).
        /// </summary>
        public async Task<List<int>> ReleaseStaleCasesAsync(
            TimeSpan inactiveThreshold, CancellationToken ct = default)
        {
            var cutoff = DateTime.UtcNow.Subtract(inactiveThreshold);

            var stale = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId != null
                    && (r.Statut == ReclamationStatuses.ENVOYEE
                        || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT)
                    && r.UpdatedAt < cutoff)
                .Select(r => new { r.Id, r.AssignedToUserId })
                .ToListAsync(ct);

            if (stale.Count == 0) return new List<int>();

            _logger.LogInformation(
                "3C: {Count} cas inactifs (> {Threshold}) détectés pour libération",
                stale.Count, inactiveThreshold);

            var released = new List<int>(stale.Count);
            foreach (var item in stale)
            {
                var previousAssignee = item.AssignedToUserId!.Value;
                var now = DateTime.UtcNow;

                // Concurrence optimiste : on ne libère que si personne n'a modifié le cas depuis.
                var affected = await _db.F_RECLAMATIONS
                    .Where(r => r.Id == item.Id
                        && r.AssignedToUserId == previousAssignee
                        && (r.Statut == ReclamationStatuses.ENVOYEE
                            || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(r => r.AssignedToUserId, (Guid?)null)
                        .SetProperty(r => r.Statut, ReclamationStatuses.ENVOYEE)
                        .SetProperty(r => r.UpdatedAt, now), ct);

                if (affected == 0) continue;

                _logger.LogInformation(
                    "3C: cas {Id} libéré (inactivité) de user={User}",
                    item.Id, previousAssignee);

                await RedistributeOneCaseAsync(item.Id, excludeUserId: previousAssignee, ct);
                released.Add(item.Id);
            }

            return released;
        }

        /// <summary>
        /// Tente d'attribuer un cas libéré à une confirmatrice éligible selon les 3 critères
        /// de 3B, en excluant optionnellement celle qui vient de le perdre. Utilise une
        /// concurrence optimiste : si le cas a été repris entre-temps, le update ne touche rien.
        /// Retourne l'UserId du nouveau destinataire, ou null si aucune conf. éligible.
        /// Phase 5 : émet CasReattribue à l'ancienne et la nouvelle conf après réassignation.
        /// </summary>
        private async Task<Guid?> RedistributeOneCaseAsync(
            int reclamationId, Guid? excludeUserId, CancellationToken ct)
        {
            var conf = await FindEligibleConfirmatriceAsync(excludeUserId, ct);
            if (conf == null)
            {
                _logger.LogInformation(
                    "3C: aucune confirmatrice éligible pour cas {Id} (exclude={Exclude}) — reste non attribué",
                    reclamationId, excludeUserId);
                return null;
            }

            var now = DateTime.UtcNow;
            var affected = await _db.F_RECLAMATIONS
                .Where(r => r.Id == reclamationId
                    && r.AssignedToUserId == null
                    && r.Statut == ReclamationStatuses.ENVOYEE)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(r => r.AssignedToUserId, (Guid?)conf.Id)
                    .SetProperty(r => r.UpdatedAt, now), ct);

            if (affected == 0)
            {
                // Un autre flow (création manuelle, autre tick du scan) a repris le cas avant nous.
                _logger.LogDebug(
                    "3C: cas {Id} déjà repris par un autre path, abort redistribute",
                    reclamationId);
                return null;
            }

            await UpdateLastAssignmentAsync(conf.Id, ct);
            _logger.LogInformation(
                "3C: cas {Id} redistribué à user={User}", reclamationId, conf.Id);

            // Phase 5 — événement additionnel CasReattribue (ancienne + nouvelle conf).
            try
            {
                await BroadcastCasReattribueAsync(reclamationId, excludeUserId, conf.Id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "5: émission CasReattribue échouée (cas={Id})", reclamationId);
            }

            return conf.Id;
        }

        private async Task<ApplicationUser> EnsureConfirmateurAsync(Guid userId, CancellationToken ct)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct)
                ?? throw new InvalidOperationException("Confirmateur introuvable.");

            var isConfirmateur = await (
                from userRole in _db.UserRoles.AsNoTracking()
                join role in _db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
                where userRole.UserId == userId && role.Name == AppRoles.CONFIRMATEUR
                select role.Id).AnyAsync(ct);

            if (!isConfirmateur)
                throw new InvalidOperationException("L'utilisateur n'a pas le rôle CONFIRMATEUR.");

            return user;
        }

        private Guid GetCurrentAuthenticatedUserId()
        {
            var raw = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId))
                throw new UnauthorizedAccessException("Utilisateur non authentifié.");
            return userId;
        }

        private static string NormalizeType(string? value)
        {
            var v = (value ?? ReclamationTypes.LIVRAISON).Trim().ToUpperInvariant();
            return ReclamationTypes.IsValid(v) ? v : ReclamationTypes.AUTRE;
        }

        private static string? NormalizePriority(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            return value.Trim().ToUpperInvariant();
        }

        private static string NormalizeClientMotif(string? motif)
        {
            var v = (motif ?? string.Empty).Trim().ToUpperInvariant();
            if (!ClientMotifs.IsValid(v))
                throw new InvalidOperationException("Motif client invalide.");
            return v;
        }

        private static string NormalizeLivreurMotif(string? motif)
        {
            var v = (motif ?? string.Empty).Trim().ToUpperInvariant();
            if (!LivreurMotifs.IsValid(v))
                throw new InvalidOperationException("Motif livreur invalide.");
            return v;
        }

        private async Task<bool> OrderBelongsToClientAsync(F_DOCENTETE order, Guid userId, ProfilUtilisateur? profile, string? userEmail, CancellationToken ct)
        {
            if (profile != null && !string.IsNullOrWhiteSpace(profile.CodeClientSage) && order.DO_Tiers == profile.CodeClientSage)
                return true;

            if (Guid.TryParse(order.DO_Tiers, out var tiersGuid) && tiersGuid == userId)
                return true;

            if (!string.IsNullOrWhiteSpace(order.DO_Tiers) && order.DO_Tiers.StartsWith("CL", StringComparison.OrdinalIgnoreCase))
            {
                var token = order.DO_Tiers.Substring(2);
                if (userId.ToString("N").StartsWith(token, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            if (!string.IsNullOrWhiteSpace(userEmail))
            {
                var linkedUser = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == userId && x.Email == userEmail, ct);
                if (linkedUser != null && order.DO_Tiers == linkedUser.Id.ToString())
                    return true;
            }

            return false;
        }

        private static string? ResolveClientDisplay(ProfilUtilisateur? profile)
        {
            if (profile == null) return null;
            if (!string.IsNullOrWhiteSpace(profile.NomComplet)) return profile.NomComplet;
            if (!string.IsNullOrWhiteSpace(profile.NomSociete)) return profile.NomSociete;
            return profile.CodeClientSage;
        }

        // ==========================================================================
        // NOUVEAUTÉS : Demandes client / Échange / Commander à nouveau
        // ==========================================================================

        private async Task<bool> IsDeliveredAsync(F_DOCENTETE order, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(order.DO_Piece)) return false;
            return await _db.F_LIVRAISONS.AsNoTracking()
                .AnyAsync(l => l.DO_Piece == order.DO_Piece
                    && (l.LI_DateLivree != null || l.LI_Statut == DeliveryStatusCodes.Livre), ct);
        }

        public async Task<List<int>> GetMyDemandesIdsAsync(Guid clientUserId, CancellationToken ct = default)
        {
            return await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.ClientUserId == clientUserId
                    && r.TypeCas == Auth.Constants.TypeCas.DEMANDE
                    && r.VisibleClient)
                .Select(r => r.Id)
                .ToListAsync(ct);
        }

        public async Task<List<ReclamationListItemDto>> GetMyDemandesAsync(Guid clientUserId, CancellationToken ct = default)
        {
            var items = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.ClientUserId == clientUserId
                    && r.TypeCas == Auth.Constants.TypeCas.DEMANDE
                    && r.VisibleClient)
                .OrderByDescending(r => r.UpdatedAt)
                .ToListAsync(ct);
            return await MapListAsync(items, ct);
        }

        /// <summary>
        /// Détail d'une Demande livreur consultable par le client (filtré sur VisibleClient = true).
        /// Garantit qu'un client ne peut pas accéder à une Demande B/C par son ID.
        /// </summary>
        public async Task<ReclamationDetailsDto?> GetDemandeDetailsForClientAsync(int id, Guid clientUserId, CancellationToken ct = default)
        {
            var entity = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id
                    && r.ClientUserId == clientUserId
                    && r.TypeCas == Auth.Constants.TypeCas.DEMANDE
                    && r.VisibleClient, ct);
            return entity == null ? null : await MapDetailsAsync(entity, includeInternalNote: false, ct);
        }

        public async Task<List<ReclamationListItemDto>> GetMyReclamationsOnlyAsync(Guid clientUserId, CancellationToken ct = default)
        {
            var items = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.ClientUserId == clientUserId && r.TypeCas == Auth.Constants.TypeCas.RECLAMATION)
                .OrderByDescending(r => r.UpdatedAt)
                .ToListAsync(ct);
            return await MapListAsync(items, ct);
        }

        public async Task<ReclamationDetailsDto> ReplyToDemandeAsync(int id, Guid clientUserId, string? newAddress, decimal? latitude, decimal? longitude, string? newPhone, string? repere = null, string? instructionsLivreur = null, CancellationToken ct = default)
        {
            var demande = await _db.F_RECLAMATIONS
                .FirstOrDefaultAsync(r => r.Id == id
                    && r.ClientUserId == clientUserId
                    && r.TypeCas == Auth.Constants.TypeCas.DEMANDE
                    && r.VisibleClient, ct)
                ?? throw new UnauthorizedAccessException("Demande introuvable.");

            if (ReclamationStatuses.IsClosed(demande.Statut))
                throw new InvalidOperationException("Cette demande est déjà close.");

            // === Validation stricte selon le motif de la Demande ===
            var motif = (demande.Motif ?? string.Empty).Trim().ToUpperInvariant();
            string? normalizedPhone = null;

            if (motif == LivreurMotifs.ADRESSE_INCORRECTE)
            {
                var addr = (newAddress ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(addr))
                    throw new InvalidOperationException("La nouvelle adresse est obligatoire.");
                if (!latitude.HasValue || !longitude.HasValue)
                    throw new InvalidOperationException("Les coordonnées GPS (latitude et longitude) sont obligatoires.");
            }
            else if (motif == LivreurMotifs.NUMERO_INCORRECT)
            {
                if (string.IsNullOrWhiteSpace(newPhone))
                    throw new InvalidOperationException("Le nouveau numéro de téléphone est obligatoire.");
                if (!Web_Api.Validation.TunisianPhone.IsValid(newPhone))
                    throw new InvalidOperationException("Le numéro doit être un numéro tunisien valide à 8 chiffres.");
                normalizedPhone = Web_Api.Validation.TunisianPhone.Normalize(newPhone);
            }
            else
            {
                throw new InvalidOperationException("Ce motif de demande ne permet pas une réponse client.");
            }

            // Construire la correction proposée en JSON
            var correction = new System.Collections.Generic.Dictionary<string, object?>();
            if (!string.IsNullOrWhiteSpace(newAddress)) correction["address"] = newAddress.Trim();
            if (latitude.HasValue) correction["latitude"] = latitude.Value;
            if (longitude.HasValue) correction["longitude"] = longitude.Value;
            if (normalizedPhone != null) correction["phone"] = normalizedPhone;
            // Phase 6 — Repère + instructions livreur (spécif Tunisie). Texte libre, bornés.
            if (!string.IsNullOrWhiteSpace(repere))
            {
                var r = repere.Trim();
                correction["repere"] = r.Length > 200 ? r.Substring(0, 200) : r;
            }
            if (!string.IsNullOrWhiteSpace(instructionsLivreur))
            {
                var instr = instructionsLivreur.Trim();
                correction["instructions"] = instr.Length > 500 ? instr.Substring(0, 500) : instr;
            }

            demande.CorrectionProposee = System.Text.Json.JsonSerializer.Serialize(correction);
            demande.LastClientReplyAt = DateTime.UtcNow;
            demande.UpdatedAt = DateTime.UtcNow;
            // Transition auto : clic Appliquer client → En cours de traitement
            if (demande.Statut == ReclamationStatuses.ENVOYEE)
                demande.Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT;

            await _db.SaveChangesAsync(ct);
            await BroadcastDemandeStatusChangedAsync(demande, ct);

            // Phase 5 — Événement 5 : ClientARepondu vers la conf attribuée.
            if (demande.AssignedToUserId.HasValue)
            {
                try
                {
                    await _hub.Clients.User(demande.AssignedToUserId.Value.ToString())
                        .SendAsync(Hubs.ReclamationEvents.ClientARepondu,
                            new { id = demande.Id, code = demande.CodeReclamation, motif = demande.Motif }, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "5: émission ClientARepondu échouée (cas={Id})", demande.Id);
                }
            }

            return await MapDetailsAsync(demande, includeInternalNote: false, ct);
        }

        /// <summary>
        /// Vérifie la disponibilité en stock pour les articles de la commande
        /// associée à une réclamation COLIS_ENDOMMAGE_DEPOT. Retourne la liste
        /// des manques (ArRef + quantités requise/disponible). Si la liste est
        /// vide, l'échange est possible immédiatement.
        /// </summary>
        public async Task<StockAvailabilityCheckDto> CheckStockForReclamationAsync(
            int reclamationId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reclamationId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable.");

            var lines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Piece != null && l.DO_Piece == reclamation.DoPiece)
                .ToListAsync(ct);

            var refs = lines
                .Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .Select(l => l.AR_Ref!)
                .Distinct()
                .ToList();

            // Stock agrégé tous dépôts (AS_QteSto - AS_QteRes).
            var stockByRef = await _db.Set<F_ARTSTOCK>().AsNoTracking()
                .Where(s => refs.Contains(s.AR_Ref))
                .GroupBy(s => s.AR_Ref)
                .Select(g => new
                {
                    ArRef = g.Key,
                    Available = g.Sum(x => x.AS_QteSto - x.AS_QteRes)
                })
                .ToDictionaryAsync(x => x.ArRef, x => x.Available, ct);

            var shortages = new List<StockShortageDto>();
            foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref)))
            {
                var required = line.DL_Qte ?? 0m;
                if (required <= 0) continue;
                var available = stockByRef.TryGetValue(line.AR_Ref!, out var a) ? a : 0m;
                if (available < required)
                {
                    shortages.Add(new StockShortageDto
                    {
                        ArRef = line.AR_Ref!,
                        Designation = line.DL_Design,
                        RequiredQty = required,
                        AvailableQty = available,
                    });
                }
            }

            return new StockAvailabilityCheckDto
            {
                AllAvailable = shortages.Count == 0,
                Shortages = shortages,
            };
        }

        /// <summary>
        /// Décision finale de la confirmatrice face à un signalement
        /// COLIS_ENDOMMAGE_DEPOT du livreur. Soit l'échange est possible
        /// (stock dispo, on relance la commande), soit la commande part en
        /// retour et le client doit être rappelé.
        /// </summary>
        public async Task<ReclamationDetailsDto> DecideDepotDamagedAsync(
            int reclamationId,
            Guid actorUserId,
            string decision,
            string? note,
            CancellationToken ct = default)
        {
            var rec = await _db.F_RECLAMATIONS
                .FirstOrDefaultAsync(r => r.Id == reclamationId && r.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            if (rec.Motif != LivreurMotifs.COLIS_ENDOMMAGE_DEPOT)
                throw new InvalidOperationException(
                    "Décision dépôt disponible uniquement pour COLIS_ENDOMMAGE_DEPOT.");

            if (ReclamationStatuses.IsClosed(rec.Statut))
                throw new InvalidOperationException("Cette demande est déjà close.");

            var d = (decision ?? string.Empty).Trim().ToUpperInvariant();
            if (d != "ECHANGE" && d != "RETOUR_APPEL")
                throw new InvalidOperationException(
                    "Décision invalide : attendu ECHANGE ou RETOUR_APPEL.");

            var commande = await _db.F_DOCENTETES
                .FirstOrDefaultAsync(o => o.DO_Piece != null && o.DO_Piece == rec.DoPiece, ct);

            if (d == "ECHANGE")
            {
                // Re-check le stock côté serveur pour éviter un échange à blanc.
                var check = await CheckStockForReclamationAsync(reclamationId, ct);
                if (!check.AllAvailable)
                {
                    var missing = string.Join(", ",
                        check.Shortages.Select(s => $"{s.ArRef} (manque {s.RequiredQty - s.AvailableQty:0.##})"));
                    throw new InvalidOperationException(
                        $"Stock insuffisant pour échange : {missing}");
                }

                if (commande == null)
                    throw new InvalidOperationException(
                        "Commande originale introuvable — impossible de créer l'échange.");

                // Vérifie qu'un échange n'existe pas déjà pour cette réclamation.
                var existingEchange = await _db.F_DOCENTETES.AsNoTracking()
                    .AnyAsync(o => o.ReclamationOrigineId == reclamationId, ct);
                if (existingEchange)
                    throw new InvalidOperationException(
                        "Un échange existe déjà pour cette réclamation.");

                // Récupère les lignes de la commande originale pour les
                // dupliquer en RETOUR (article endommagé) + LIVRAISON (remplacement).
                var origLignes = await _db.F_DOCLIGNES.AsNoTracking()
                    .Where(l => l.DO_Piece != null && l.DO_Piece == commande.DO_Piece)
                    .ToListAsync(ct);

                var lignesValid = origLignes
                    .Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                    .ToList();

                if (lignesValid.Count == 0)
                    throw new InvalidOperationException(
                        "Aucune ligne article exploitable pour l'échange.");

                var echangeLignes = new List<EchangeLigneDto>();
                foreach (var l in lignesValid)
                {
                    echangeLignes.Add(new EchangeLigneDto
                    {
                        ArRef = l.AR_Ref!.Trim(),
                        Designation = l.DL_Design,
                        Quantite = l.DL_Qte ?? 0m,
                        PrixUnitaire = l.DL_PrixUnitaire ?? 0m,
                        Type = LigneTypes.RETOUR,
                    });
                    echangeLignes.Add(new EchangeLigneDto
                    {
                        ArRef = l.AR_Ref!.Trim(),
                        Designation = l.DL_Design,
                        Quantite = l.DL_Qte ?? 0m,
                        PrixUnitaire = l.DL_PrixUnitaire ?? 0m,
                        Type = LigneTypes.LIVRAISON,
                    });
                }

                // Crée la commande d'échange F_DOCENTETE (TypeCommande.ECHANGE)
                // avec les F_DOCLIGNE RETOUR + LIVRAISON. Le BL sera affecté
                // automatiquement au prochain livreur (pool).
                var echange = await CreateEchangeFromDecisionAsync(
                    rec, commande, echangeLignes, actorUserId, ct);

                rec.NoteInterne = ConcatNote(rec.NoteInterne,
                    $"[ÉCHANGE] Commande {echange.DO_Piece} créée (origine: {commande.DO_Piece})." +
                    (string.IsNullOrWhiteSpace(note) ? string.Empty : $" — {note!.Trim()}"));
                rec.Statut = ReclamationStatuses.CLOTUREE;
                rec.ClosedAt = DateTime.UtcNow;
                rec.UpdatedAt = DateTime.UtcNow;
            }
            else // RETOUR_APPEL
            {
                if (commande != null)
                {
                    commande.DO_Valide = F_DOCENTETE.STATUS_REFUSE;
                    commande.cbModification = DateTime.UtcNow;
                }

                rec.NoteInterne = ConcatNote(rec.NoteInterne,
                    "[RETOUR + APPEL CLIENT] Stock insuffisant — client à rappeler." +
                    (string.IsNullOrWhiteSpace(note) ? string.Empty : $" — {note!.Trim()}"));
                rec.Statut = ReclamationStatuses.CLOTUREE;
                rec.ClosedAt = DateTime.UtcNow;
                rec.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            await BroadcastDemandeStatusChangedAsync(rec, ct);
            return await MapDetailsAsync(rec, includeInternalNote: true, ct);
        }

        private static string ConcatNote(string? existing, string addition)
        {
            if (string.IsNullOrWhiteSpace(existing)) return addition;
            return existing.Trim() + "\n" + addition;
        }

        /// Helper interne : crée une vraie commande d'échange F_DOCENTETE +
        /// F_DOCLIGNE (RETOUR + LIVRAISON) sans valider le motif. Utilisé
        /// par DecideDepotDamagedAsync (motif livreur COLIS_ENDOMMAGE_DEPOT)
        /// puisque CreateEchangeCommandeAsync impose un motif client.
        private async Task<F_DOCENTETE> CreateEchangeFromDecisionAsync(
            F_RECLAMATION reclamation,
            F_DOCENTETE originalOrder,
            List<EchangeLigneDto> lignes,
            Guid actorUserId,
            CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var newPiece = $"EX{now:yyMMddHHmmss}";

            var retourLignes = lignes.Where(l => l.Type?.Trim().ToUpperInvariant() == LigneTypes.RETOUR).ToList();
            var livraisonLignes = lignes.Where(l => l.Type?.Trim().ToUpperInvariant() == LigneTypes.LIVRAISON).ToList();
            var retourText = string.Join(", ", retourLignes.Select(l => $"{l.ArRef} x{l.Quantite}"));
            var livraisonText = string.Join(", ", livraisonLignes.Select(l => $"{l.ArRef} x{l.Quantite}"));

            var echange = new F_DOCENTETE
            {
                DO_Piece = newPiece,
                DO_Tiers = originalOrder.DO_Tiers,
                DO_Date = now,
                DO_Valide = F_DOCENTETE.STATUS_CONFIRME,
                TypeCommande = Auth.Constants.TypeCommande.ECHANGE,
                CommandeOriginalePiece = originalOrder.DO_Piece,
                EchangeArticleRetour = retourText.Length > 500 ? retourText[..500] : retourText,
                EchangeArticleLivraison = livraisonText.Length > 500 ? livraisonText[..500] : livraisonText,
                ReclamationOrigineId = reclamation.Id,
                DO_AdresseLivraison = originalOrder.DO_AdresseLivraison,
                DO_VilleLivraison = originalOrder.DO_VilleLivraison,
                DO_CodePostalLivraison = originalOrder.DO_CodePostalLivraison,
                DO_LatitudeLivraison = originalOrder.DO_LatitudeLivraison,
                DO_LongitudeLivraison = originalOrder.DO_LongitudeLivraison,
                DO_ModeLivraison = originalOrder.DO_ModeLivraison,
                DO_ModePaiement = originalOrder.DO_ModePaiement,
                DO_NetAPayer = 0m, // l'échange ne facture rien — le client a déjà payé l'original
                cbCreation = now,
                cbModification = now,
                AssignedLivreurId = null, // pool, sera attribué au prochain livreur
            };
            _db.F_DOCENTETES.Add(echange);

            foreach (var l in lignes)
            {
                var typeNorm = (l.Type ?? string.Empty).Trim().ToUpperInvariant();
                if (typeNorm != LigneTypes.RETOUR && typeNorm != LigneTypes.LIVRAISON)
                    continue;

                var ligne = new F_DOCLIGNE
                {
                    DO_Domaine = originalOrder.DO_Domaine,
                    DO_Type = originalOrder.DO_Type,
                    DO_Piece = newPiece,
                    DO_Date = now,
                    CT_Num = originalOrder.DO_Tiers,
                    AR_Ref = (l.ArRef ?? string.Empty).Trim(),
                    DL_Design = l.Designation,
                    DL_Qte = l.Quantite,
                    DL_PrixUnitaire = l.PrixUnitaire ?? 0m,
                    DL_MontantHT = (l.PrixUnitaire ?? 0m) * l.Quantite,
                    DL_MontantTTC = (l.PrixUnitaire ?? 0m) * l.Quantite,
                    LigneType = typeNorm,
                    cbCreation = now,
                    cbModification = now,
                };
                _db.F_DOCLIGNES.Add(ligne);
            }

            return echange;
        }

        public async Task<ReclamationDetailsDto> RequestEchangeAsync(int id, Guid clientUserId, string text, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS
                .FirstOrDefaultAsync(r => r.Id == id && r.ClientUserId == clientUserId, ct)
                ?? throw new UnauthorizedAccessException("Réclamation introuvable.");

            if (reclamation.Motif != ClientMotifs.COLIS_ENDOMMAGE)
                throw new InvalidOperationException("La demande d'échange n'est disponible que pour le motif 'Colis endommagé'.");

            if (ReclamationStatuses.IsClosed(reclamation.Statut))
                throw new InvalidOperationException("Cette réclamation est déjà close.");

            var trimmed = (text ?? string.Empty).Trim();
            if (trimmed.Length < 10)
                throw new InvalidOperationException("Explique ta demande d'échange (minimum 10 caractères).");
            if (trimmed.Length > 500)
                throw new InvalidOperationException("500 caractères maximum.");

            reclamation.EchangeDemandeText = trimmed;
            reclamation.UpdatedAt = DateTime.UtcNow;
            if (reclamation.Statut == ReclamationStatuses.ENVOYEE)
                reclamation.Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT;

            await _db.SaveChangesAsync(ct);
            await BroadcastDemandeStatusChangedAsync(reclamation, ct);
            return await MapDetailsAsync(reclamation, includeInternalNote: false, ct);
        }

        public async Task<List<ReclamationOrderLineDto>> GetOrderLinesForRepeatOrderAsync(int reclamationId, Guid clientUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reclamationId && r.ClientUserId == clientUserId, ct)
                ?? throw new UnauthorizedAccessException("Réclamation introuvable.");

            if (reclamation.Motif != ClientMotifs.COLIS_ENDOMMAGE)
                throw new InvalidOperationException("Commander à nouveau n'est disponible que pour 'Colis endommagé'.");

            var lines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Piece != null && l.DO_Piece == reclamation.DoPiece)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            return lines.Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .Select(l => new ReclamationOrderLineDto
                {
                    ArRef = (l.AR_Ref ?? string.Empty).Trim(),
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList();
        }

        /// <summary>
        /// V2 Échange structuré multi-lignes : crée une commande d'échange avec
        /// des F_DOCLIGNE typées RETOUR (articles récupérés) et LIVRAISON (articles livrés).
        /// </summary>
        public async Task<F_DOCENTETE> CreateEchangeCommandeAsync(
            int reclamationId,
            Guid actorUserId,
            List<EchangeLigneDto> lignes,
            string? note,
            CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS
                .FirstOrDefaultAsync(r => r.Id == reclamationId && r.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            if (reclamation.Motif != ClientMotifs.COLIS_ENDOMMAGE && reclamation.Motif != ClientMotifs.COLIS_NON_CORRESPONDANT)
                throw new InvalidOperationException("L'échange n'est possible que pour 'Colis endommagé' ou 'Colis non conforme'.");

            if (lignes == null || lignes.Count == 0)
                throw new InvalidOperationException("Au moins une ligne est obligatoire.");

            var hasRetour = lignes.Any(l => l.Type?.Trim().ToUpperInvariant() == LigneTypes.RETOUR);
            var hasLivraison = lignes.Any(l => l.Type?.Trim().ToUpperInvariant() == LigneTypes.LIVRAISON);
            if (!hasRetour)
                throw new InvalidOperationException("Au moins un article à récupérer (RETOUR) est obligatoire.");
            if (!hasLivraison)
                throw new InvalidOperationException("Au moins un article à livrer (LIVRAISON) est obligatoire.");

            var originalOrder = await _db.F_DOCENTETES
                .FirstOrDefaultAsync(o => o.DO_Piece != null && o.DO_Piece == reclamation.DoPiece, ct)
                ?? throw new InvalidOperationException("Commande originale introuvable.");

            var existing = await _db.F_DOCENTETES.AsNoTracking()
                .AnyAsync(o => o.ReclamationOrigineId == reclamationId, ct);
            if (existing)
                throw new InvalidOperationException("Un échange existe déjà pour cette réclamation.");

            var now = DateTime.UtcNow;
            var newPiece = $"EX{now:yyMMddHHmmss}";

            // Construire un texte descriptif pour compatibilité (l'ancien champ texte reste rempli)
            var retourLignes = lignes.Where(l => l.Type?.Trim().ToUpperInvariant() == LigneTypes.RETOUR).ToList();
            var livraisonLignes = lignes.Where(l => l.Type?.Trim().ToUpperInvariant() == LigneTypes.LIVRAISON).ToList();
            var retourText = string.Join(", ", retourLignes.Select(l => $"{l.ArRef} x{l.Quantite}"));
            var livraisonText = string.Join(", ", livraisonLignes.Select(l => $"{l.ArRef} x{l.Quantite}"));

            var echange = new F_DOCENTETE
            {
                DO_Piece = newPiece,
                DO_Tiers = originalOrder.DO_Tiers,
                DO_Date = now,
                DO_Valide = F_DOCENTETE.STATUS_CONFIRME,
                TypeCommande = Auth.Constants.TypeCommande.ECHANGE,
                CommandeOriginalePiece = originalOrder.DO_Piece,
                EchangeArticleRetour = retourText.Length > 500 ? retourText[..500] : retourText,
                EchangeArticleLivraison = livraisonText.Length > 500 ? livraisonText[..500] : livraisonText,
                ReclamationOrigineId = reclamationId,
                DO_AdresseLivraison = originalOrder.DO_AdresseLivraison,
                DO_VilleLivraison = originalOrder.DO_VilleLivraison,
                DO_CodePostalLivraison = originalOrder.DO_CodePostalLivraison,
                DO_LatitudeLivraison = originalOrder.DO_LatitudeLivraison,
                DO_LongitudeLivraison = originalOrder.DO_LongitudeLivraison,
                DO_ModeLivraison = originalOrder.DO_ModeLivraison,
                DO_ModePaiement = originalOrder.DO_ModePaiement,
                DO_NetAPayer = 0m,
                cbCreation = now,
                cbModification = now,
                AssignedLivreurId = null
            };

            _db.F_DOCENTETES.Add(echange);

            // Créer les F_DOCLIGNE
            foreach (var l in lignes)
            {
                var typeNorm = (l.Type ?? string.Empty).Trim().ToUpperInvariant();
                if (typeNorm != LigneTypes.RETOUR && typeNorm != LigneTypes.LIVRAISON)
                    throw new InvalidOperationException($"Type de ligne invalide : {l.Type}");

                var ligne = new F_DOCLIGNE
                {
                    DO_Domaine = originalOrder.DO_Domaine,
                    DO_Type = originalOrder.DO_Type,
                    DO_Piece = newPiece,
                    DO_Date = now,
                    CT_Num = originalOrder.DO_Tiers,
                    AR_Ref = (l.ArRef ?? string.Empty).Trim(),
                    DL_Design = l.Designation,
                    DL_Qte = l.Quantite,
                    DL_PrixUnitaire = l.PrixUnitaire ?? 0m,
                    DL_MontantHT = (l.PrixUnitaire ?? 0m) * l.Quantite,
                    DL_MontantTTC = (l.PrixUnitaire ?? 0m) * l.Quantite,
                    LigneType = typeNorm,
                    cbCreation = now,
                    cbModification = now
                };
                _db.F_DOCLIGNES.Add(ligne);
            }

            reclamation.NoteInterne = (reclamation.NoteInterne ?? string.Empty) +
                $"\n[{now:yyyy-MM-dd HH:mm}] Échange créé : {newPiece} ({lignes.Count} lignes). {note?.Trim() ?? ""}";
            if (reclamation.Statut == ReclamationStatuses.ENVOYEE)
                reclamation.Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT;
            reclamation.UpdatedAt = now;

            await _db.SaveChangesAsync(ct);
            return echange;
        }

        public async Task<List<EchangeLigneDto>> GetOriginalOrderLinesForEchangeAsync(int reclamationId, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reclamationId && r.AssignedToUserId == actorUserId, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable ou non affectée.");

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Piece != null && l.DO_Piece == reclamation.DoPiece
                    && (l.LigneType == LigneTypes.STANDARD || l.LigneType == null))
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            return lignes
                .Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .Select(l => new EchangeLigneDto
                {
                    Type = LigneTypes.RETOUR,
                    ArRef = l.AR_Ref ?? string.Empty,
                    Designation = l.DL_Design,
                    Quantite = l.DL_Qte ?? 1m,
                    PrixUnitaire = l.DL_PrixUnitaire
                }).ToList();
        }

        // ==========================================================================
        // NOUVEAUTÉS : 3 onglets confirmatrice + escalade 24h
        // ==========================================================================

        public async Task<List<ReclamationListItemDto>> GetForStaffByTabAsync(
            string tab,
            bool crossGouvernorat,
            ReclamationFilter filter,
            CancellationToken ct = default)
        {
            var currentStaffUserId = GetCurrentAuthenticatedUserId();
            var now = DateTime.UtcNow;

            IQueryable<F_RECLAMATION> query = _db.F_RECLAMATIONS.AsNoTracking();

            if (crossGouvernorat)
            {
                // Vue "pool partagé" : ses propres cas + les cas orphelins (non attribués)
                // encore à prendre. On n'expose JAMAIS les cas actifs d'une autre
                // confirmatrice — sinon fuite de données + vol de cas possibles.
                query = query.Where(x => x.AssignedToUserId == currentStaffUserId
                    || x.AssignedToUserId == null);
            }
            else
            {
                // Uniquement ses propres cas
                query = query.Where(x => x.AssignedToUserId == currentStaffUserId);
            }

            // 1.D — Mapping simplifié et cohérent avec le brief :
            //   À traiter  : ENVOYEE (nouveaux, à prendre en charge)
            //   En attente : EN_COURS_DE_TRAITEMENT ou CLOTUREE récente (< 7j)
            //   Historique : CLOTUREE ou REFUSEE
            var historiqueCutoff = now.AddDays(-7);
            switch ((tab ?? string.Empty).ToLowerInvariant())
            {
                case "en-attente-client":
                case "en_attente":
                case "en-attente":
                    query = query.Where(r =>
                        r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT
                        || ((r.Statut == ReclamationStatuses.CLOTUREE
                             || r.Statut == ReclamationStatuses.REFUSEE)
                            && r.UpdatedAt >= historiqueCutoff));
                    break;

                case "historique":
                    query = query.Where(r =>
                        r.Statut == ReclamationStatuses.CLOTUREE
                        || r.Statut == ReclamationStatuses.REFUSEE);
                    break;

                case "a-traiter":
                case "a_traiter":
                default:
                    query = query.Where(r => r.Statut == ReclamationStatuses.ENVOYEE);
                    break;
            }

            // Filtres additionnels
            if (!string.IsNullOrWhiteSpace(filter.Statut))
            {
                var s = filter.Statut.Trim().ToUpperInvariant();
                query = query.Where(x => x.Statut == s);
            }
            if (!string.IsNullOrWhiteSpace(filter.Source))
            {
                var s = filter.Source.Trim().ToUpperInvariant();
                query = query.Where(x => x.Source == s);
            }
            if (!string.IsNullOrWhiteSpace(filter.TypeCas))
            {
                var t = filter.TypeCas.Trim().ToUpperInvariant();
                query = query.Where(x => x.TypeCas == t);
            }
            if (!string.IsNullOrWhiteSpace(filter.Motif))
            {
                var m = filter.Motif.Trim();
                query = query.Where(x => x.Motif == m);
            }
            if (!string.IsNullOrWhiteSpace(filter.DoPiece))
            {
                var p = filter.DoPiece.Trim();
                query = query.Where(x => x.DoPiece == p);
            }
            if (filter.FromDate.HasValue)
                query = query.Where(x => x.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue)
                query = query.Where(x => x.CreatedAt <= filter.ToDate.Value);

            var items = await query.OrderByDescending(x => x.UpdatedAt).ToListAsync(ct);
            return await MapListAsync(items, ct);
        }

        public async Task<ReclamationDetailsDto> RepriseAsync(int id, Guid actorUserId, CancellationToken ct = default)
        {
            var reclamation = await _db.F_RECLAMATIONS.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new InvalidOperationException("Réclamation introuvable.");

            // Anti-vol : on ne peut reprendre qu'un cas libre (orphelin) ou déjà à soi.
            // Le cas actif d'une autre confirmatrice n'est jamais repris manuellement
            // (la redistribution 3C s'en charge si l'autre devient inactive).
            if (reclamation.AssignedToUserId.HasValue && reclamation.AssignedToUserId.Value != actorUserId)
                throw new InvalidOperationException("Ce cas est déjà pris en charge par une autre confirmatrice.");

            reclamation.AssignedToUserId = actorUserId;
            reclamation.UpdatedAt = DateTime.UtcNow;
            reclamation.NoteInterne = (reclamation.NoteInterne ?? string.Empty) +
                $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Reprise volontaire par la confirmatrice ({actorUserId}).";

            if (reclamation.Statut == ReclamationStatuses.ENVOYEE)
                reclamation.Statut = ReclamationStatuses.EN_COURS_DE_TRAITEMENT;

            await _db.SaveChangesAsync(ct);
            return await MapDetailsAsync(reclamation, includeInternalNote: true, ct);
        }

        public async Task<List<ReclamationListItemDto>> GetLivreurHistoryAsync(Guid livreurUserId, CancellationToken ct = default)
        {
            var tentatives = await _db.F_RECLAMATION_TENTATIVES.AsNoTracking()
                .Where(t => t.LivreurUserId == livreurUserId)
                .OrderByDescending(t => t.DateJour)
                .Take(50)
                .ToListAsync(ct);

            var pieces = tentatives.Select(t => t.CommandePiece).Distinct().ToList();

            var escalated = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedByUserId == livreurUserId || pieces.Contains(r.DoPiece))
                .OrderByDescending(r => r.CreatedAt)
                .Take(50)
                .ToListAsync(ct);

            return escalated.Select(r => new ReclamationListItemDto
            {
                Id = r.Id,
                CodeReclamation = r.CodeReclamation,
                DoPiece = r.DoPiece,
                Motif = r.Motif,
                Statut = r.Statut,
                Source = r.Source,
                TypeCas = r.TypeCas,
                VisibleClient = r.VisibleClient,
                TentativesCount = r.TentativesCount,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                ClosedAt = r.ClosedAt
            }).OrderByDescending(r => r.CreatedAt).ToList();
        }
    }

    public class ReclamationFilter
    {
        public string? Statut { get; set; }
        public string? Source { get; set; }
        public string? TypeCas { get; set; }
        public string? Motif { get; set; }
        public string? DoPiece { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }
}
