using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Quotes;
using Web_Api.Model;

namespace Web_Api.Services.B2B
{
    public sealed class QuoteService
    {
        private static readonly HashSet<string> FinalStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            F_DEVIS_ENTETE.STATUS_CONVERTI_BC,
            F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT,
            F_DEVIS_ENTETE.STATUS_EXPIRE,
            F_DEVIS_ENTETE.STATUS_ANNULE
        };

        private readonly AppDbContext _db;
        private readonly OrderCalculatorService _calculator;
        private readonly BonCommandeService _bonCommandeService;

        public QuoteService(AppDbContext db, OrderCalculatorService calculator, BonCommandeService bonCommandeService)
        {
            _db = db;
            _calculator = calculator;
            _bonCommandeService = bonCommandeService;
        }

        public async Task<QuoteDetailDto> CreateQuoteAsync(Guid actorUserId, IReadOnlyCollection<string> roles, CreateQuoteRequestDto req, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.ADMIN, AppRoles.VENDEUR, AppRoles.CONFIRMATEUR);
            return await CreateCoreAsync(actorUserId, roles, req, isClientSelfRequest: false, ct);
        }

        public async Task<QuoteDetailDto> CreateClientQuoteAsync(Guid clientUserId, IReadOnlyCollection<string> roles, CreateQuoteRequestDto req, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.CLIENT);
            req.ClientUserId = clientUserId;
            req.ValidUntil ??= DateTime.UtcNow.AddDays(15);
            return await CreateCoreAsync(clientUserId, roles, req, isClientSelfRequest: true, ct);
        }

        private async Task<QuoteDetailDto> CreateCoreAsync(Guid actorUserId, IReadOnlyCollection<string> roles, CreateQuoteRequestDto req, bool isClientSelfRequest, CancellationToken ct)
        {
            if (req.ClientUserId == Guid.Empty)
                throw new QuoteValidationException("ClientUserId est obligatoire.");

            if (req.Lines == null || req.Lines.Count == 0)
                throw new QuoteValidationException("Le devis doit contenir au moins une ligne.");

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == req.ClientUserId, ct)
                ?? throw new QuoteNotFoundException("Client introuvable.");

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.UtilisateurId == req.ClientUserId, ct)
                ?? throw new QuoteValidationException("Profil client introuvable.");

            EnsureB2BProfile(profile);

            var piece = await GenerateUniqueDevisPieceAsync(ct);
            var now = DateTime.UtcNow;
            var clientCode = await _bonCommandeService.ResolveClientCodeAsync(req.ClientUserId, user.Email, ct);
            var lines = await BuildLinesAsync(req.Lines.Select(x => new UpdateQuoteLineDto
            {
                ArticleRef = x.ArticleRef,
                Qty = x.Qty
            }).ToList(), ct);

            var totalHT = lines.Sum(x => x.AmountHT);
            var totalTTC = lines.Sum(x => x.AmountTTC);
            var totals = _calculator.Compute(totalHT, profile);

            var devis = new F_DEVIS_ENTETE
            {
                DevisPiece = piece,
                ClientUserId = req.ClientUserId,
                ClientCode = clientCode,
                ClientType = "B2B",
                StatusKey = F_DEVIS_ENTETE.STATUS_SOUMIS,
                TotalHT = totalHT,
                DiscountPercentSnapshot = totals.DiscountRate,
                DiscountAmount = totals.DiscountAmount,
                TotalHTNet = totals.Total,
                TotalTTC = totalTTC,
                NetAPayer = totals.Total,
                ValidUntil = req.ValidUntil ?? now.AddDays(15),
                AssignedConfirmateurId = !isClientSelfRequest && roles.Contains(AppRoles.CONFIRMATEUR, StringComparer.OrdinalIgnoreCase) ? actorUserId : null,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = actorUserId,
                Version = 1,
                Lignes = lines
            };

            devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), F_DEVIS_EVENT.TYPE_STATUS_CHANGE, null, devis.StatusKey,
                isClientSelfRequest ? "Demande de devis créée par le client B2B." : "Devis créé par un utilisateur interne.", true));

            if (!string.IsNullOrWhiteSpace(req.ClientNote))
            {
                devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), F_DEVIS_EVENT.TYPE_COMMENT, null, null, req.ClientNote, true));
            }

            if (!string.IsNullOrWhiteSpace(req.InternalNote))
            {
                devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), F_DEVIS_EVENT.TYPE_COMMENT, null, null, req.InternalNote, false));
            }

            _db.F_DEVIS_ENTETES.Add(devis);
            await _db.SaveChangesAsync(ct);

            return await BuildDetailAsync(devis, includeInternalEvents: !isClientSelfRequest, ct);
        }

        public async Task<List<QuoteListItemDto>> GetAdminQuotesAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string? status, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.ADMIN, AppRoles.VENDEUR, AppRoles.CONFIRMATEUR);
            await ExpireQuotesAsync(ct);

            var query = _db.F_DEVIS_ENTETES.AsNoTracking().Where(x => x.ClientType == "B2B");
            var normalized = NormalizeStatusOrNull(status);
            if (normalized != null)
                query = query.Where(x => x.StatusKey == normalized);

            var devis = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).ToListAsync(ct);
            return await BuildListAsync(devis, ct);
        }

        public Task<List<QuoteListItemDto>> GetConfirmateurQuotesAsync(string? status, CancellationToken ct)
        {
            return GetAdminQuotesAsync(Guid.Empty, new[] { AppRoles.CONFIRMATEUR }, status, ct);
        }

        public async Task<QuoteDetailDto> GetConfirmateurQuoteDetailAsync(string piece, CancellationToken ct)
        {
            await ExpireQuotesAsync(ct);
            var devis = await FindDevisAsync(piece, tracking: false, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            return await BuildDetailAsync(devis, includeInternalEvents: true, ct);
        }

        public async Task<List<QuoteListItemDto>> GetMyQuotesAsync(Guid clientUserId, CancellationToken ct)
        {
            await ExpireQuotesAsync(ct);

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.UtilisateurId == clientUserId, ct);
            if (profile?.TypeClient != TypeClient.B2B)
                return new List<QuoteListItemDto>();

            var devis = await _db.F_DEVIS_ENTETES.AsNoTracking()
                .Where(x => x.ClientUserId == clientUserId && x.ClientType == "B2B")
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .ToListAsync(ct);

            return await BuildListAsync(devis, ct);
        }

        public async Task<QuoteDetailDto> GetQuoteDetailAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, CancellationToken ct)
        {
            await ExpireQuotesAsync(ct);
            var devis = await FindDevisAsync(piece, tracking: false, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            if (!CanReadDevis(actorUserId, roles, devis))
                throw new QuoteForbiddenException("Accès au devis refusé.");

            var includeInternal = roles.Contains(AppRoles.ADMIN, StringComparer.OrdinalIgnoreCase)
                                  || roles.Contains(AppRoles.CONFIRMATEUR, StringComparer.OrdinalIgnoreCase)
                                  || roles.Contains(AppRoles.VENDEUR, StringComparer.OrdinalIgnoreCase);

            return await BuildDetailAsync(devis, includeInternal, ct);
        }

        public async Task<QuoteDetailDto> TakeQuoteAsync(Guid confirmateurId, string piece, CancellationToken ct)
        {
            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            EnsureMutable(devis);
            var old = devis.StatusKey;
            devis.AssignedConfirmateurId = confirmateurId;
            devis.StatusKey = F_DEVIS_ENTETE.STATUS_EN_ETUDE;
            Touch(devis);
            devis.Events.Add(NewEvent(confirmateurId, AppRoles.CONFIRMATEUR, F_DEVIS_EVENT.TYPE_STATUS_CHANGE, old, devis.StatusKey, "Devis pris en charge.", true));

            await _db.SaveChangesAsync(ct);
            return await BuildDetailAsync(devis, includeInternalEvents: true, ct);
        }

        public async Task<QuoteDetailDto> UpdateQuoteStatusByConfirmateurAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, string status, string? message, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.ADMIN, AppRoles.CONFIRMATEUR);

            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            EnsureMutable(devis);
            var next = NormalizeStatus(status);
            if (next is F_DEVIS_ENTETE.STATUS_INFO_MANQUANTE or F_DEVIS_ENTETE.STATUS_MODIFIE or F_DEVIS_ENTETE.STATUS_ANNULE
                && string.IsNullOrWhiteSpace(message))
            {
                throw new QuoteValidationException("Un commentaire est obligatoire pour ce changement de statut.");
            }

            var old = devis.StatusKey;
            devis.StatusKey = next;
            Touch(devis);

            var eventType = next switch
            {
                F_DEVIS_ENTETE.STATUS_INFO_MANQUANTE => F_DEVIS_EVENT.TYPE_REQUEST_INFO,
                F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT => F_DEVIS_EVENT.TYPE_SENT_TO_CLIENT,
                F_DEVIS_ENTETE.STATUS_ANNULE => F_DEVIS_EVENT.TYPE_CANCELLED,
                _ => F_DEVIS_EVENT.TYPE_STATUS_CHANGE
            };

            devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), eventType, old, next, message, next != F_DEVIS_ENTETE.STATUS_ANNULE));
            await _db.SaveChangesAsync(ct);
            return await BuildDetailAsync(devis, includeInternalEvents: true, ct);
        }

        public async Task<QuoteDetailDto> SendToClientAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, string? message, CancellationToken ct)
        {
            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            if (devis.StatusKey != F_DEVIS_ENTETE.STATUS_VALIDE && devis.StatusKey != F_DEVIS_ENTETE.STATUS_MODIFIE)
                throw new QuoteValidationException("Le devis doit être validé ou modifié avant envoi au client.");

            return await UpdateQuoteStatusByConfirmateurAsync(actorUserId, roles, piece, F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT, message, ct);
        }

        public async Task<QuoteDetailDto> AddCommentAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, string? message, bool isPublic, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(message))
                throw new QuoteValidationException("Le commentaire est obligatoire.");

            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            if (!CanReadDevis(actorUserId, roles, devis))
                throw new QuoteForbiddenException("Accès au devis refusé.");

            if (roles.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase))
            {
                EnsureOwner(actorUserId, devis);
                isPublic = true;
                var old = devis.StatusKey;
                if (devis.StatusKey == F_DEVIS_ENTETE.STATUS_INFO_MANQUANTE)
                {
                    devis.StatusKey = F_DEVIS_ENTETE.STATUS_REPONSE_CLIENT;
                    devis.Events.Add(NewEvent(actorUserId, AppRoles.CLIENT, F_DEVIS_EVENT.TYPE_STATUS_CHANGE, old, devis.StatusKey, "Réponse client reçue.", true));
                }
            }

            devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), roles.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase) ? F_DEVIS_EVENT.TYPE_CLIENT_REPLY : F_DEVIS_EVENT.TYPE_COMMENT, null, null, message, isPublic));
            Touch(devis);

            await _db.SaveChangesAsync(ct);
            return await BuildDetailAsync(devis, includeInternalEvents: !roles.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase), ct);
        }

        public async Task<QuoteDetailDto> UpdateLinesAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, UpdateQuoteLinesRequestDto req, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.ADMIN, AppRoles.CONFIRMATEUR);
            if (string.IsNullOrWhiteSpace(req.Message))
                throw new QuoteValidationException("Un commentaire est obligatoire pour modifier un devis.");

            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            EnsureMutable(devis);
            if (req.Lines.Count == 0)
                throw new QuoteValidationException("Le devis doit contenir au moins une ligne.");

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.UtilisateurId == devis.ClientUserId, ct)
                ?? throw new QuoteValidationException("Profil client introuvable.");

            var newLines = await BuildLinesAsync(req.Lines, ct);
            _db.F_DEVIS_LIGNES.RemoveRange(devis.Lignes);
            devis.Lignes = newLines;
            RecomputeTotals(devis, profile);

            var old = devis.StatusKey;
            devis.StatusKey = F_DEVIS_ENTETE.STATUS_MODIFIE;
            Touch(devis);
            devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), F_DEVIS_EVENT.TYPE_PRICE_UPDATED, old, devis.StatusKey, req.Message, true));

            await _db.SaveChangesAsync(ct);
            return await BuildDetailAsync(devis, includeInternalEvents: true, ct);
        }

        public async Task<ConvertDevisToBcResultDto> AcceptQuoteAsync(Guid clientUserId, string piece, string? message, CancellationToken ct)
        {
            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            EnsureOwner(clientUserId, devis);
            if (devis.StatusKey == F_DEVIS_ENTETE.STATUS_CONVERTI_BC && !string.IsNullOrWhiteSpace(devis.BcPiece))
            {
                return new ConvertDevisToBcResultDto
                {
                    DevisPiece = devis.DevisPiece,
                    BcPiece = devis.BcPiece,
                    AlreadyConverted = true,
                    Message = $"Devis déjà converti en BC {devis.BcPiece}."
                };
            }

            EnsureAcceptable(devis);
            await EnsureStockAvailableAsync(devis, ct);

            var old = devis.StatusKey;
            devis.StatusKey = F_DEVIS_ENTETE.STATUS_ACCEPTE_CLIENT;
            devis.Events.Add(NewEvent(clientUserId, AppRoles.CLIENT, F_DEVIS_EVENT.TYPE_ACCEPTED, old, devis.StatusKey, message, true));
            Touch(devis);

            var bcPiece = await ConvertAcceptedQuoteToBcAsync(devis, ct);

            return new ConvertDevisToBcResultDto
            {
                DevisPiece = devis.DevisPiece,
                BcPiece = bcPiece,
                AlreadyConverted = false,
                Message = $"Devis {devis.DevisPiece} converti en BC {bcPiece}."
            };
        }

        public async Task<QuoteDetailDto> RefuseQuoteAsync(Guid clientUserId, string piece, string? reason, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new QuoteValidationException("Un commentaire est obligatoire pour refuser un devis.");

            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            EnsureOwner(clientUserId, devis);
            if (FinalStatuses.Contains(devis.StatusKey))
                throw new QuoteValidationException("Ce devis ne peut plus être refusé.");

            var old = devis.StatusKey;
            devis.StatusKey = F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT;
            Touch(devis);
            devis.Events.Add(NewEvent(clientUserId, AppRoles.CLIENT, F_DEVIS_EVENT.TYPE_REJECTED, old, devis.StatusKey, reason, true));

            await _db.SaveChangesAsync(ct);
            return await BuildDetailAsync(devis, includeInternalEvents: false, ct);
        }

        public async Task<QuoteDetailDto> CancelQuoteAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, string? reason, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.ADMIN, AppRoles.CONFIRMATEUR);
            if (string.IsNullOrWhiteSpace(reason))
                throw new QuoteValidationException("Un commentaire est obligatoire pour annuler un devis.");

            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            EnsureMutable(devis);
            var old = devis.StatusKey;
            devis.StatusKey = F_DEVIS_ENTETE.STATUS_ANNULE;
            Touch(devis);
            devis.Events.Add(NewEvent(actorUserId, PrimaryRole(roles), F_DEVIS_EVENT.TYPE_CANCELLED, old, devis.StatusKey, reason, false));

            await _db.SaveChangesAsync(ct);
            return await BuildDetailAsync(devis, includeInternalEvents: true, ct);
        }

        public async Task<ConvertDevisToBcResultDto> ConvertQuoteToOrderAsync(Guid actorUserId, IReadOnlyCollection<string> roles, string piece, ConvertQuoteToOrderRequestDto req, CancellationToken ct)
        {
            EnsureRole(roles, AppRoles.ADMIN, AppRoles.CONFIRMATEUR);
            var devis = await FindDevisAsync(piece, tracking: true, includeChildren: true, ct)
                ?? throw new QuoteNotFoundException("Devis introuvable.");

            if (devis.StatusKey == F_DEVIS_ENTETE.STATUS_CONVERTI_BC && !string.IsNullOrWhiteSpace(devis.BcPiece))
            {
                return new ConvertDevisToBcResultDto { DevisPiece = devis.DevisPiece, BcPiece = devis.BcPiece, AlreadyConverted = true, Message = "Déjà converti." };
            }

            if (devis.StatusKey != F_DEVIS_ENTETE.STATUS_ACCEPTE_CLIENT)
                throw new QuoteValidationException("Seul un devis accepté par le client peut être converti.");

            await EnsureStockAvailableAsync(devis, ct);
            var bcPiece = await ConvertAcceptedQuoteToBcAsync(devis, ct, actorUserId, PrimaryRole(roles), req.InternalNote);
            return new ConvertDevisToBcResultDto { DevisPiece = devis.DevisPiece, BcPiece = bcPiece, AlreadyConverted = false, Message = $"BC {bcPiece} créé." };
        }

        private async Task<string> ConvertAcceptedQuoteToBcAsync(F_DEVIS_ENTETE devis, CancellationToken ct, Guid? actorUserId = null, string? actorRole = null, string? message = null)
        {
            if (!string.IsNullOrWhiteSpace(devis.BcPiece))
                return devis.BcPiece;

            var now = DateTime.UtcNow;
            var bcPiece = await _bonCommandeService.GenerateUniquePieceAsync(ct);

            var order = new F_DOCENTETE
            {
                DO_Domaine = 0,
                DO_Type = F_DOCENTETE.DOC_TYPE_BC,
                DO_Date = now,
                DO_Tiers = devis.ClientCode,
                DO_TotalHT = devis.TotalHT,
                DO_TotalHTNet = devis.TotalHTNet,
                DO_TotalTTC = devis.TotalTTC,
                DO_NetAPayer = devis.NetAPayer,
                DO_Valide = F_DOCENTETE.STATUS_EN_ATTENTE,
                DO_Piece = bcPiece,
                DO_ModeLivraison = BonCommandeService.DeliveryTypeHome,
                DO_ModePaiement = "COD",
                DO_ClientUserId = devis.ClientUserId,
                DO_ClientMode = BonCommandeService.CustomerModeExisting,
                TotalBeforeDiscount = devis.TotalHT,
                B2BDiscountRate = devis.DiscountPercentSnapshot,
                B2BDiscountAmount = devis.DiscountAmount,
                DiscountSource = "DevisSnapshot",
                cbCreation = now,
                cbModification = now
            };

            _db.F_DOCENTETES.Add(order);
            foreach (var line in devis.Lignes.OrderBy(x => x.SortOrder))
            {
                _db.F_DOCLIGNES.Add(new F_DOCLIGNE
                {
                    DO_Domaine = 0,
                    DO_Type = F_DOCENTETE.DOC_TYPE_BC,
                    DO_Piece = bcPiece,
                    DO_Date = now,
                    CT_Num = devis.ClientCode,
                    AR_Ref = line.ArticleRef,
                    DL_Design = line.Designation,
                    DL_Qte = line.Qty,
                    DL_PrixUnitaire = line.UnitPriceHT,
                    DL_MontantHT = line.AmountHT,
                    DL_MontantTTC = line.AmountTTC,
                    cbCreation = now,
                    cbModification = now
                });
            }

            var old = devis.StatusKey;
            devis.StatusKey = F_DEVIS_ENTETE.STATUS_CONVERTI_BC;
            devis.BcPiece = bcPiece;
            Touch(devis);
            devis.Events.Add(NewEvent(actorUserId ?? devis.ClientUserId, actorRole ?? AppRoles.CLIENT, F_DEVIS_EVENT.TYPE_CONVERTED_TO_BC, old, devis.StatusKey, message ?? $"BC généré automatiquement : {bcPiece}.", true));

            await _db.SaveChangesAsync(ct);
            return bcPiece;
        }

        private async Task<List<F_DEVIS_LIGNE>> BuildLinesAsync(List<UpdateQuoteLineDto> requestLines, CancellationToken ct)
        {
            var refs = requestLines
                .Select(x => (x.ArticleRef ?? string.Empty).Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (refs.Count == 0)
                throw new QuoteValidationException("Aucun article valide.");

            var articles = await _db.F_ARTICLES.AsNoTracking().Where(x => refs.Contains(x.AR_Ref)).ToListAsync(ct);
            if (articles.Count != refs.Count)
            {
                var found = articles.Select(x => x.AR_Ref).ToHashSet(StringComparer.OrdinalIgnoreCase);
                var missing = refs.Where(x => !found.Contains(x));
                throw new QuoteNotFoundException($"Articles introuvables: {string.Join(", ", missing)}");
            }

            var result = new List<F_DEVIS_LIGNE>();
            var order = 1;
            foreach (var input in requestLines)
            {
                var arRef = (input.ArticleRef ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(arRef))
                    throw new QuoteValidationException("ArticleRef est obligatoire.");
                if (input.Qty <= 0)
                    throw new QuoteValidationException($"Quantité invalide pour {arRef}.");

                var article = articles.First(x => string.Equals(x.AR_Ref, arRef, StringComparison.OrdinalIgnoreCase));
                if (article.AR_Sommeil == 1)
                    throw new QuoteValidationException($"Article indisponible: {arRef}");

                var unit = input.UnitPriceHT.HasValue && input.UnitPriceHT.Value >= 0 ? input.UnitPriceHT.Value : article.AR_PrixVen;
                var discount = input.DiscountLinePercent.HasValue ? Math.Clamp(input.DiscountLinePercent.Value, 0m, 100m) : (decimal?)null;
                var gross = unit * input.Qty;
                var net = gross - decimal.Round(gross * ((discount ?? 0m) / 100m), 3);

                result.Add(new F_DEVIS_LIGNE
                {
                    ArticleRef = article.AR_Ref,
                    Designation = article.AR_Design,
                    Qty = input.Qty,
                    UnitPriceHT = unit,
                    DiscountLinePercent = discount,
                    AmountHT = net,
                    AmountTTC = net,
                    SortOrder = order++
                });
            }

            return result;
        }

        private void RecomputeTotals(F_DEVIS_ENTETE devis, ProfilUtilisateur profile)
        {
            var totalHT = devis.Lignes.Sum(x => x.AmountHT);
            var totalTTC = devis.Lignes.Sum(x => x.AmountTTC);
            var totals = _calculator.Compute(totalHT, profile);

            devis.TotalHT = totalHT;
            devis.TotalTTC = totalTTC;
            devis.DiscountPercentSnapshot = totals.DiscountRate;
            devis.DiscountAmount = totals.DiscountAmount;
            devis.TotalHTNet = totals.Total;
            devis.NetAPayer = totals.Total;
        }

        private async Task EnsureStockAvailableAsync(F_DEVIS_ENTETE devis, CancellationToken ct)
        {
            var refs = devis.Lignes.Select(x => x.ArticleRef).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var articles = await _db.F_ARTICLES.AsNoTracking().Where(x => refs.Contains(x.AR_Ref)).ToListAsync(ct);

            foreach (var line in devis.Lignes)
            {
                var article = articles.FirstOrDefault(x => string.Equals(x.AR_Ref, line.ArticleRef, StringComparison.OrdinalIgnoreCase));
                if (article?.AR_SuiviStock != 1)
                    continue;

                var available = await _db.F_ARTSTOCKS.AsNoTracking()
                    .Where(x => x.AR_Ref == line.ArticleRef)
                    .SumAsync(x => x.AS_QteSto - x.AS_QteRes, ct);

                if (available < line.Qty)
                {
                    devis.Events.Add(NewEvent(null, "SYSTEM", F_DEVIS_EVENT.TYPE_COMMENT, null, null,
                        $"Stock insuffisant pour {line.ArticleRef}. Disponible={available}, demandé={line.Qty}.", false));
                    await _db.SaveChangesAsync(ct);
                    throw new QuoteValidationException($"Stock insuffisant pour {line.ArticleRef}. Disponible={available}, demandé={line.Qty}.");
                }
            }
        }

        private async Task<F_DEVIS_ENTETE?> FindDevisAsync(string piece, bool tracking, bool includeChildren, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            IQueryable<F_DEVIS_ENTETE> query = tracking ? _db.F_DEVIS_ENTETES : _db.F_DEVIS_ENTETES.AsNoTracking();
            if (includeChildren)
            {
                query = query
                    .Include(x => x.Lignes.OrderBy(l => l.SortOrder))
                    .Include(x => x.Events.OrderBy(e => e.CreatedAt));
            }

            return await query.FirstOrDefaultAsync(x => x.DevisPiece == piece, ct);
        }

        private async Task<List<QuoteListItemDto>> BuildListAsync(List<F_DEVIS_ENTETE> devis, CancellationToken ct)
        {
            var userIds = devis.Select(x => x.ClientUserId).Concat(devis.Select(x => x.AssignedConfirmateurId ?? Guid.Empty)).Where(x => x != Guid.Empty).Distinct().ToList();
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(x => x.UtilisateurId.HasValue && userIds.Contains(x.UtilisateurId.Value))
                .ToListAsync(ct);
            var users = await _db.Users.AsNoTracking()
                .Where(x => userIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.Email ?? x.UserName ?? x.Id.ToString(), ct);

            return devis.Select(d =>
            {
                var client = profiles.FirstOrDefault(x => x.UtilisateurId == d.ClientUserId);
                return new QuoteListItemDto
                {
                    Piece = d.DevisPiece,
                    DevisPiece = d.DevisPiece,
                    Date = d.CreatedAt,
                    CreatedAt = d.CreatedAt,
                    ClientName = client?.NomComplet,
                    CompanyName = client?.NomSociete,
                    ClientCode = d.ClientCode,
                    ClientType = d.ClientType,
                    ClientPhone = client?.Telephone,
                    QuoteStatus = d.StatusKey,
                    StatusKey = d.StatusKey,
                    ValidUntil = d.ValidUntil,
                    TotalBeforeDiscount = d.TotalHT,
                    TotalHT = d.TotalHT,
                    TotalHTNet = d.TotalHTNet,
                    TotalTTC = d.TotalTTC,
                    B2BDiscountRate = d.DiscountPercentSnapshot,
                    DiscountPercentSnapshot = d.DiscountPercentSnapshot,
                    B2BDiscountAmount = d.DiscountAmount,
                    DiscountAmount = d.DiscountAmount,
                    NetAPayer = d.NetAPayer,
                    CreatedBy = users.TryGetValue(d.CreatedByUserId, out var createdBy) ? createdBy : null,
                    AssignedTo = d.AssignedConfirmateurId.HasValue && users.TryGetValue(d.AssignedConfirmateurId.Value, out var assignedTo) ? assignedTo : null,
                    BcPiece = d.BcPiece
                };
            }).ToList();
        }

        private async Task<QuoteDetailDto> BuildDetailAsync(F_DEVIS_ENTETE devis, bool includeInternalEvents, CancellationToken ct)
        {
            var item = (await BuildListAsync(new List<F_DEVIS_ENTETE> { devis }, ct)).First();
            var events = devis.Events
                .Where(x => includeInternalEvents || x.IsPublic)
                .OrderBy(x => x.CreatedAt)
                .Select(x => new QuoteEventDto
                {
                    Id = x.Id,
                    EventType = x.EventType,
                    AuthorRole = x.AuthorRole,
                    OldStatus = x.OldStatus,
                    NewStatus = x.NewStatus,
                    Message = x.Message,
                    IsPublic = x.IsPublic,
                    CreatedAt = x.CreatedAt
                })
                .ToList();

            return new QuoteDetailDto
            {
                Piece = item.Piece,
                DevisPiece = item.DevisPiece,
                Date = item.Date,
                CreatedAt = item.CreatedAt,
                ClientName = item.ClientName,
                CompanyName = item.CompanyName,
                ClientCode = item.ClientCode,
                ClientType = item.ClientType,
                ClientPhone = item.ClientPhone,
                QuoteStatus = item.QuoteStatus,
                StatusKey = item.StatusKey,
                ValidUntil = item.ValidUntil,
                TotalBeforeDiscount = item.TotalBeforeDiscount,
                TotalHT = item.TotalHT,
                TotalHTNet = item.TotalHTNet,
                TotalTTC = item.TotalTTC,
                B2BDiscountRate = item.B2BDiscountRate,
                DiscountPercentSnapshot = item.DiscountPercentSnapshot,
                B2BDiscountAmount = item.B2BDiscountAmount,
                DiscountAmount = item.DiscountAmount,
                NetAPayer = item.NetAPayer,
                CreatedBy = item.CreatedBy,
                AssignedTo = item.AssignedTo,
                ClientUserId = devis.ClientUserId,
                DiscountSource = "DevisSnapshot",
                ConvertedAt = devis.StatusKey == F_DEVIS_ENTETE.STATUS_CONVERTI_BC ? devis.UpdatedAt : null,
                QuoteConvertedToPiece = devis.BcPiece,
                BcPiece = devis.BcPiece,
                Version = devis.Version,
                Lines = devis.Lignes.OrderBy(x => x.SortOrder).Select(x => new QuoteLineDto
                {
                    ArticleRef = x.ArticleRef,
                    Designation = x.Designation,
                    Qty = x.Qty,
                    UnitPrice = x.UnitPriceHT,
                    UnitPriceHT = x.UnitPriceHT,
                    DiscountLinePercent = x.DiscountLinePercent,
                    AmountHT = x.AmountHT,
                    AmountTTC = x.AmountTTC,
                    SortOrder = x.SortOrder
                }).ToList(),
                Timeline = events.Select(x => new QuoteTimelineItemDto
                {
                    Label = x.EventType,
                    Date = x.CreatedAt,
                    Status = x.NewStatus ?? devis.StatusKey
                }).ToList(),
                Events = events
            };
        }

        private async Task ExpireQuotesAsync(CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var expired = await _db.F_DEVIS_ENTETES
                .Where(x => x.ValidUntil.HasValue
                            && x.ValidUntil < now
                            && !FinalStatuses.Contains(x.StatusKey))
                .ToListAsync(ct);

            foreach (var devis in expired)
            {
                var old = devis.StatusKey;
                devis.StatusKey = F_DEVIS_ENTETE.STATUS_EXPIRE;
                Touch(devis);
                devis.Events.Add(NewEvent(null, "SYSTEM", F_DEVIS_EVENT.TYPE_STATUS_CHANGE, old, devis.StatusKey, "Devis expiré automatiquement.", true));
            }

            if (expired.Count > 0)
                await _db.SaveChangesAsync(ct);
        }

        private async Task<string> GenerateUniqueDevisPieceAsync(CancellationToken ct)
        {
            for (var i = 1; i <= 999; i++)
            {
                var piece = $"DV{DateTime.UtcNow:yyMMdd}{i:000}";
                var exists = await _db.F_DEVIS_ENTETES.AsNoTracking().AnyAsync(x => x.DevisPiece == piece, ct);
                if (!exists) return piece;
            }

            return ("DV" + Guid.NewGuid().ToString("N"))[..13];
        }

        private static F_DEVIS_EVENT NewEvent(Guid? userId, string? role, string type, string? oldStatus, string? newStatus, string? message, bool isPublic)
        {
            return new F_DEVIS_EVENT
            {
                AuthorUserId = userId,
                AuthorRole = role,
                EventType = type,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                Message = Limit(message, 2000),
                IsPublic = isPublic,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static void EnsureMutable(F_DEVIS_ENTETE devis)
        {
            if (devis.StatusKey == F_DEVIS_ENTETE.STATUS_CONVERTI_BC)
                throw new QuoteValidationException("Un devis déjà converti en BC ne peut plus être modifié.");
            if (devis.StatusKey == F_DEVIS_ENTETE.STATUS_EXPIRE)
                throw new QuoteValidationException("Un devis expiré ne peut plus être modifié.");
        }

        private static void EnsureAcceptable(F_DEVIS_ENTETE devis)
        {
            if (devis.ValidUntil.HasValue && devis.ValidUntil.Value < DateTime.UtcNow)
                throw new QuoteValidationException("Ce devis est expiré.");
            if (devis.StatusKey == F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT)
                throw new QuoteValidationException("Un devis refusé ne peut pas être accepté.");
            if (devis.StatusKey != F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT)
                throw new QuoteValidationException("Seul un devis envoyé au client peut être accepté.");
        }

        private static void EnsureOwner(Guid clientUserId, F_DEVIS_ENTETE devis)
        {
            if (devis.ClientUserId != clientUserId)
                throw new QuoteForbiddenException("Ce devis n'appartient pas au client connecté.");
        }

        private static bool CanReadDevis(Guid actorUserId, IReadOnlyCollection<string> roles, F_DEVIS_ENTETE devis)
        {
            if (roles.Contains(AppRoles.ADMIN, StringComparer.OrdinalIgnoreCase)) return true;
            if (roles.Contains(AppRoles.CONFIRMATEUR, StringComparer.OrdinalIgnoreCase)) return true;
            if (roles.Contains(AppRoles.VENDEUR, StringComparer.OrdinalIgnoreCase)) return true;
            if (roles.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase) && devis.ClientUserId == actorUserId) return true;
            return false;
        }

        private static void EnsureB2BProfile(ProfilUtilisateur profile)
        {
            if (profile.TypeProfil != TypeProfil.Client || profile.TypeClient != TypeClient.B2B)
                throw new QuoteValidationException("Les devis commerciaux sont réservés aux clients B2B.");
        }

        private static void EnsureRole(IReadOnlyCollection<string> roles, params string[] allowed)
        {
            if (!allowed.Any(role => roles.Contains(role, StringComparer.OrdinalIgnoreCase)))
                throw new QuoteForbiddenException("Rôle non autorisé pour cette action.");
        }

        private static string? NormalizeStatusOrNull(string? status)
        {
            var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
            return string.IsNullOrWhiteSpace(normalized) || normalized == "ALL" ? null : NormalizeStatus(normalized);
        }

        private static string NormalizeStatus(string? status)
        {
            var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
            return normalized switch
            {
                "DRAFT" => F_DEVIS_ENTETE.STATUS_BROUILLON,
                "SENT" => F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT,
                "ACCEPTED" => F_DEVIS_ENTETE.STATUS_ACCEPTE_CLIENT,
                "REFUSED" => F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT,
                "CONVERTED" => F_DEVIS_ENTETE.STATUS_CONVERTI_BC,
                "CANCELLED" => F_DEVIS_ENTETE.STATUS_ANNULE,
                "EXPIRED" => F_DEVIS_ENTETE.STATUS_EXPIRE,
                F_DEVIS_ENTETE.STATUS_BROUILLON => F_DEVIS_ENTETE.STATUS_BROUILLON,
                F_DEVIS_ENTETE.STATUS_SOUMIS => F_DEVIS_ENTETE.STATUS_SOUMIS,
                F_DEVIS_ENTETE.STATUS_EN_ETUDE => F_DEVIS_ENTETE.STATUS_EN_ETUDE,
                F_DEVIS_ENTETE.STATUS_INFO_MANQUANTE => F_DEVIS_ENTETE.STATUS_INFO_MANQUANTE,
                F_DEVIS_ENTETE.STATUS_REPONSE_CLIENT => F_DEVIS_ENTETE.STATUS_REPONSE_CLIENT,
                F_DEVIS_ENTETE.STATUS_MODIFIE => F_DEVIS_ENTETE.STATUS_MODIFIE,
                F_DEVIS_ENTETE.STATUS_VALIDE => F_DEVIS_ENTETE.STATUS_VALIDE,
                F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT => F_DEVIS_ENTETE.STATUS_ENVOYE_CLIENT,
                F_DEVIS_ENTETE.STATUS_ACCEPTE_CLIENT => F_DEVIS_ENTETE.STATUS_ACCEPTE_CLIENT,
                F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT => F_DEVIS_ENTETE.STATUS_REFUSE_CLIENT,
                F_DEVIS_ENTETE.STATUS_EXPIRE => F_DEVIS_ENTETE.STATUS_EXPIRE,
                F_DEVIS_ENTETE.STATUS_CONVERTI_BC => F_DEVIS_ENTETE.STATUS_CONVERTI_BC,
                F_DEVIS_ENTETE.STATUS_ANNULE => F_DEVIS_ENTETE.STATUS_ANNULE,
                _ => throw new QuoteValidationException("Statut devis invalide.")
            };
        }

        private static string PrimaryRole(IReadOnlyCollection<string> roles)
        {
            return roles.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? "SYSTEM";
        }

        private static void Touch(F_DEVIS_ENTETE devis)
        {
            devis.UpdatedAt = DateTime.UtcNow;
            devis.Version++;
        }

        private static string? Limit(string? value, int max)
        {
            var clean = value?.Trim();
            if (string.IsNullOrWhiteSpace(clean)) return null;
            return clean.Length <= max ? clean : clean[..max];
        }
    }

    public class QuoteValidationException : Exception
    {
        public QuoteValidationException(string message) : base(message) { }
    }

    public class QuoteNotFoundException : Exception
    {
        public QuoteNotFoundException(string message) : base(message) { }
    }

    public class QuoteForbiddenException : Exception
    {
        public QuoteForbiddenException(string message) : base(message) { }
    }
}
