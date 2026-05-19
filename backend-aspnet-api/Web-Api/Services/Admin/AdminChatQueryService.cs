using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;
using Web_Api.Model;

namespace Web_Api.Services.Admin
{
    /// <summary>
    /// Couche A du chatbot — exécute le DSL universel <see cref="ChatQueryRequestDto"/>
    /// pour répondre à toute question chiffrée dans le périmètre projet.
    /// Dispatcher par entité (orders/claims/demandes/products/governorates/drivers/confirmatrices)
    /// avec métriques count/sum/avg/list/top et groupBy optionnel.
    /// </summary>
    public class AdminChatQueryService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;
        private const int DefaultLimit = 10;
        private const int MaxLimit = 50;

        private readonly AppDbContext _db;

        public AdminChatQueryService(AppDbContext db)
        {
            _db = db;
        }

        // ====================================================================
        // Entrée principale
        // ====================================================================
        public async Task<ChatQueryResponseDto> ExecuteAsync(
            ChatQueryRequestDto req, CancellationToken ct)
        {
            req ??= new ChatQueryRequestDto();
            req.Filters ??= new ChatQueryFiltersDto();

            var entity = (req.Entity ?? "orders").Trim().ToLowerInvariant();
            var metric = (req.Metric ?? "count").Trim().ToLowerInvariant();
            var groupBy = NormalizeGroupBy(req.GroupBy);
            var limit = NormalizeLimit(req.Limit);
            var orderBy = (req.OrderBy ?? "").Trim().ToLowerInvariant();
            var (from, to) = ResolvePeriod(req.Filters);

            var applied = new ChatQueryAppliedDto
            {
                Entity = entity,
                Metric = metric,
                Filters = req.Filters,
                GroupBy = groupBy,
                Limit = limit,
                OrderBy = string.IsNullOrEmpty(orderBy) ? null : orderBy,
                ResolvedFrom = from,
                ResolvedTo = to
            };

            return entity switch
            {
                "orders" => await QueryOrdersAsync(req.Filters, metric, groupBy, limit, orderBy, from, to, applied, ct),
                "claims" => await QueryClaimsAsync(req.Filters, metric, groupBy, limit, orderBy, from, to, applied, "RECLAMATION", ct),
                "demandes" => await QueryClaimsAsync(req.Filters, metric, groupBy, limit, orderBy, from, to, applied, "DEMANDE", ct),
                "cases" => await QueryClaimsAsync(req.Filters, metric, groupBy, limit, orderBy, from, to, applied, null, ct),
                "products" => await QueryProductsAsync(req.Filters, metric, groupBy, limit, orderBy, from, to, applied, ct),
                "governorates" => await QueryGovernoratesAsync(req.Filters, metric, limit, from, to, applied, ct),
                "drivers" => await QueryDriversAsync(req.Filters, metric, limit, from, to, applied, ct),
                "confirmatrices" => await QueryConfirmatricesAsync(req.Filters, metric, limit, from, to, applied, ct),
                _ => Unsupported(applied, $"Entité inconnue : {entity}")
            };
        }

        // ====================================================================
        // ORDERS — count / sum / avg / list / top
        // ====================================================================
        private async Task<ChatQueryResponseDto> QueryOrdersAsync(
            ChatQueryFiltersDto filters, string metric, string? groupBy,
            int limit, string orderBy, DateTime from, DateTime to,
            ChatQueryAppliedDto applied, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var lookup = BuildProfileLookup(profiles);

            var govKey = NormalizeGovKey(filters.Governorate);
            HashSet<string>? matchingTiers = null;
            if (govKey != null)
            {
                matchingTiers = profiles
                    .Where(p => p.Gouvernorat.HasValue && NormalizeGov(p.Gouvernorat.Value) == govKey)
                    .Select(p => Normalize(p.CodeClientSage))
                    .Where(c => c != null).Cast<string>().ToHashSet();
            }

            var orders = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= from && x.DO_Date < to)
                .ToListAsync(ct);

            if (matchingTiers != null)
                orders = orders.Where(o => o.DO_Tiers != null && matchingTiers.Contains(o.DO_Tiers.ToUpperInvariant())).ToList();

            // Joindre les livraisons pour les statuts orientés livraison.
            var pieces = orders.Select(o => o.DO_Piece).Where(p => !string.IsNullOrWhiteSpace(p)).Cast<string>().ToHashSet();
            var livraisons = pieces.Count == 0
                ? new List<F_LIVRAISON>()
                : await _db.F_LIVRAISONS.AsNoTracking()
                    .Where(l => pieces.Contains(l.DO_Piece))
                    .ToListAsync(ct);

            var livByPiece = livraisons
                .GroupBy(l => l.DO_Piece)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(l => l.LI_DateCreation).First(),
                    StringComparer.OrdinalIgnoreCase);

            // Filtre statut commande / livraison.
            orders = ApplyOrdersStatusFilter(orders, livByPiece, filters.Status).ToList();

            // Filtre livreur (via livraison).
            if (!string.IsNullOrWhiteSpace(filters.DriverId)
                && Guid.TryParse(filters.DriverId, out var driverGuid))
            {
                var driverProfile = profiles.FirstOrDefault(p => p.UtilisateurId == driverGuid);
                if (driverProfile != null)
                {
                    var cb = driverProfile.cbMarq;
                    var keepPieces = livraisons
                        .Where(l => l.LivreurId == cb)
                        .Select(l => l.DO_Piece)
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);
                    orders = orders.Where(o => o.DO_Piece != null && keepPieces.Contains(o.DO_Piece)).ToList();
                }
            }

            // Filtre client.
            if (!string.IsNullOrWhiteSpace(filters.ClientId))
            {
                var key = filters.ClientId.Trim().ToUpperInvariant();
                orders = orders.Where(o => (o.DO_Tiers ?? string.Empty).ToUpperInvariant() == key).ToList();
            }

            // Recherche (numéro / nom / téléphone).
            var search = (filters.OrderNumber ?? filters.Search ?? string.Empty).Trim();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.ToUpperInvariant();
                orders = orders.Where(o =>
                {
                    if ((o.DO_Piece ?? "").ToUpperInvariant().Contains(q)) return true;
                    if ((o.DO_Tiers ?? "").ToUpperInvariant().Contains(q)) return true;
                    var p = ResolveProfile(o.DO_Tiers, lookup);
                    if (p != null)
                    {
                        if ((p.NomComplet ?? "").ToUpperInvariant().Contains(q)) return true;
                        if ((p.Telephone ?? "").ToUpperInvariant().Contains(q)) return true;
                    }
                    return false;
                }).ToList();
            }

            // === Group by (séries) ===
            if (groupBy != null)
            {
                var series = BuildOrdersSeries(orders, livByPiece, lookup, profiles, groupBy);
                series = ApplyOrderingAndLimit(series, orderBy, limit);
                return new ChatQueryResponseDto
                {
                    Label = LabelOrdersGroupBy(metric, groupBy, filters, from, to),
                    Series = series,
                    Value = metric == "count" ? series.Sum(s => s.Value) : null,
                    Applied = applied
                };
            }

            // === metrics sans groupBy ===
            if (metric == "list" || metric == "top")
            {
                var sorted = ApplyOrdersOrdering(orders, orderBy);
                var rows = sorted.Take(limit).Select(o => OrderToRow(o, livByPiece, lookup)).ToList();
                return new ChatQueryResponseDto
                {
                    Label = $"{rows.Count} commande(s) (sur {orders.Count})",
                    Value = orders.Count,
                    Rows = rows,
                    Applied = applied
                };
            }

            if (metric == "sum")
            {
                var total = orders.Sum(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m);
                return new ChatQueryResponseDto
                {
                    Label = LabelOrdersSum(filters, from, to),
                    Value = Math.Round(total, 2),
                    Applied = applied
                };
            }

            if (metric == "avg")
            {
                var values = orders.Select(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m).ToList();
                var avg = values.Count == 0 ? 0m : Math.Round(values.Average(), 2);
                return new ChatQueryResponseDto
                {
                    Label = $"Panier moyen : {FormatAmount(avg)}",
                    Value = avg,
                    Applied = applied,
                    Warnings = values.Count < 10
                        ? new List<string> { $"Échantillon faible ({values.Count} commandes)." }
                        : new List<string>()
                };
            }

            // count par défaut
            return new ChatQueryResponseDto
            {
                Label = LabelOrdersCount(filters, from, to),
                Value = orders.Count,
                Applied = applied
            };
        }

        private static IEnumerable<F_DOCENTETE> ApplyOrdersStatusFilter(
            IEnumerable<F_DOCENTETE> orders,
            IReadOnlyDictionary<string, F_LIVRAISON> livByPiece,
            string? status)
        {
            var s = (status ?? "all").Trim();
            return s switch
            {
                "pending" => orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE),
                "confirmed" => orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME),
                "tentative" => orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE),
                "refused" => orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_REFUSE),
                "inDelivery" => orders.Where(o => HasDeliveryStatus(o, livByPiece, DeliveryStatusCodes.EnLivraison)),
                "delivered" => orders.Where(o => HasDeliveryStatus(o, livByPiece, DeliveryStatusCodes.Livre)),
                "returned" => orders.Where(o => HasDeliveryStatus(o, livByPiece, DeliveryStatusCodes.Retour)),
                "postponed" => orders.Where(o => HasDeliveryStatus(o, livByPiece, DeliveryStatusCodes.Reporte)),
                _ => orders
            };
        }

        private static bool HasDeliveryStatus(
            F_DOCENTETE o, IReadOnlyDictionary<string, F_LIVRAISON> livByPiece, short status)
        {
            if (o.DO_Piece == null) return false;
            return livByPiece.TryGetValue(o.DO_Piece, out var l) && l.LI_Statut == status;
        }

        private static List<F_DOCENTETE> ApplyOrdersOrdering(List<F_DOCENTETE> orders, string orderBy)
        {
            return orderBy switch
            {
                "amount_desc" => orders.OrderByDescending(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m).ToList(),
                "amount_asc" => orders.OrderBy(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m).ToList(),
                "date_asc" => orders.OrderBy(o => o.DO_Date).ToList(),
                _ => orders.OrderByDescending(o => o.DO_Date).ToList()
            };
        }

        private static List<ChatQuerySeriesPointDto> BuildOrdersSeries(
            IEnumerable<F_DOCENTETE> orders,
            IReadOnlyDictionary<string, F_LIVRAISON> livByPiece,
            IReadOnlyDictionary<string, ProfilUtilisateur> lookup,
            IReadOnlyList<ProfilUtilisateur> profiles,
            string groupBy)
        {
            switch (groupBy)
            {
                case "status":
                    return orders.GroupBy(o => F_DOCENTETE.ToStatusLabel(o.DO_Valide))
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();

                case "deliveryStatus":
                    return orders
                        .Where(o => o.DO_Piece != null && livByPiece.ContainsKey(o.DO_Piece))
                        .GroupBy(o => MapDeliveryStatusLabel(livByPiece[o.DO_Piece!].LI_Statut))
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();

                case "governorate":
                    return orders.GroupBy(o =>
                        {
                            var p = ResolveProfile(o.DO_Tiers, lookup);
                            return p?.Gouvernorat?.ToString() ?? "Inconnu";
                        })
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();

                case "driver":
                    var driverIdsSeen = new Dictionary<int, string>();
                    foreach (var liv in livByPiece.Values.Where(l => l.LivreurId.HasValue))
                    {
                        if (driverIdsSeen.ContainsKey(liv.LivreurId!.Value)) continue;
                        var prof = profiles.FirstOrDefault(p => p.cbMarq == liv.LivreurId!.Value);
                        driverIdsSeen[liv.LivreurId!.Value] = prof?.NomComplet ?? $"#{liv.LivreurId}";
                    }
                    return orders
                        .Where(o => o.DO_Piece != null && livByPiece.ContainsKey(o.DO_Piece))
                        .Where(o => livByPiece[o.DO_Piece!].LivreurId.HasValue)
                        .GroupBy(o => livByPiece[o.DO_Piece!].LivreurId!.Value)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = driverIdsSeen.TryGetValue(g.Key, out var n) ? n : $"#{g.Key}",
                            Value = g.Count()
                        }).ToList();

                case "day":
                    return orders.Where(o => o.DO_Date.HasValue)
                        .GroupBy(o => o.DO_Date!.Value.Date)
                        .OrderBy(g => g.Key)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = g.Key.ToString("yyyy-MM-dd"),
                            Value = g.Count()
                        }).ToList();

                case "week":
                    return orders.Where(o => o.DO_Date.HasValue)
                        .GroupBy(o => StartOfWeek(o.DO_Date!.Value))
                        .OrderBy(g => g.Key)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = g.Key.ToString("yyyy-'W'ww", CultureInfo.InvariantCulture),
                            Value = g.Count()
                        }).ToList();

                case "month":
                    return orders.Where(o => o.DO_Date.HasValue)
                        .GroupBy(o => new DateTime(o.DO_Date!.Value.Year, o.DO_Date!.Value.Month, 1))
                        .OrderBy(g => g.Key)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = g.Key.ToString("yyyy-MM"),
                            Value = g.Count()
                        }).ToList();

                default:
                    return new List<ChatQuerySeriesPointDto>();
            }
        }

        private static ChatQueryRowDto OrderToRow(
            F_DOCENTETE o,
            IReadOnlyDictionary<string, F_LIVRAISON> livByPiece,
            IReadOnlyDictionary<string, ProfilUtilisateur> lookup)
        {
            var profile = ResolveProfile(o.DO_Tiers, lookup);
            string? deliveryStatus = null;
            if (o.DO_Piece != null && livByPiece.TryGetValue(o.DO_Piece, out var liv))
                deliveryStatus = MapDeliveryStatusLabel(liv.LI_Statut);

            var amount = o.DO_TotalTTC ?? o.DO_NetAPayer;

            return new ChatQueryRowDto
            {
                Key = o.DO_Piece,
                Label = $"{o.DO_Piece} — {profile?.NomComplet ?? o.DO_Tiers ?? "?"}",
                Value = amount,
                Fields = new Dictionary<string, object?>
                {
                    ["piece"] = o.DO_Piece,
                    ["date"] = o.DO_Date,
                    ["client"] = profile?.NomComplet,
                    ["telephone"] = o.DO_TelephoneLivraison ?? profile?.Telephone,
                    ["governorate"] = profile?.Gouvernorat?.ToString(),
                    ["ville"] = o.DO_VilleLivraison,
                    ["status"] = F_DOCENTETE.ToStatusLabel(o.DO_Valide),
                    ["deliveryStatus"] = deliveryStatus,
                    ["amount"] = amount
                }
            };
        }

        // ====================================================================
        // CLAIMS / DEMANDES — count / list / groupBy
        // ====================================================================
        private async Task<ChatQueryResponseDto> QueryClaimsAsync(
            ChatQueryFiltersDto filters, string metric, string? groupBy,
            int limit, string orderBy, DateTime from, DateTime to,
            ChatQueryAppliedDto applied, string? forcedTypeCas, CancellationToken ct)
        {
            var query = _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to);

            if (!string.IsNullOrEmpty(forcedTypeCas))
                query = query.Where(r => r.TypeCas == forcedTypeCas);
            else if (!string.IsNullOrWhiteSpace(filters.TypeCas))
                query = query.Where(r => r.TypeCas == filters.TypeCas.Trim().ToUpperInvariant());

            var statusFilter = (filters.Status ?? string.Empty).Trim().ToUpperInvariant();
            switch (statusFilter)
            {
                case "OPEN":
                    query = query.Where(r => r.Statut == ReclamationStatuses.ENVOYEE
                        || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT);
                    break;
                case "CLOSED":
                    query = query.Where(r => r.Statut == ReclamationStatuses.CLOTUREE
                        || r.Statut == ReclamationStatuses.REFUSEE);
                    break;
                case "ENVOYEE":
                case "EN_COURS_DE_TRAITEMENT":
                case "CLOTUREE":
                case "REFUSEE":
                    query = query.Where(r => r.Statut == statusFilter);
                    break;
            }

            if (!string.IsNullOrWhiteSpace(filters.Source))
                query = query.Where(r => r.Source == filters.Source!.Trim().ToUpperInvariant());

            if (!string.IsNullOrWhiteSpace(filters.Motif))
                query = query.Where(r => r.Motif == filters.Motif!.Trim().ToUpperInvariant());

            if (!string.IsNullOrWhiteSpace(filters.ConfirmatriceId)
                && Guid.TryParse(filters.ConfirmatriceId, out var confId))
                query = query.Where(r => r.AssignedToUserId == confId);

            if (!string.IsNullOrWhiteSpace(filters.ClientId)
                && Guid.TryParse(filters.ClientId, out var clientId))
                query = query.Where(r => r.ClientUserId == clientId);

            var rows = await query.ToListAsync(ct);

            // Filtre gouvernorat (via lookup ClientUserId).
            if (!string.IsNullOrWhiteSpace(filters.Governorate))
            {
                var govKey = NormalizeGovKey(filters.Governorate);
                var clientIds = rows.Select(r => r.ClientUserId).Distinct().ToList();
                var profilesByUserId = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .Where(p => p.UtilisateurId.HasValue && clientIds.Contains(p.UtilisateurId.Value))
                    .ToDictionaryAsync(p => p.UtilisateurId!.Value, p => p, ct);
                rows = rows.Where(r =>
                {
                    if (!profilesByUserId.TryGetValue(r.ClientUserId, out var p)) return false;
                    return p.Gouvernorat.HasValue && NormalizeGov(p.Gouvernorat.Value) == govKey;
                }).ToList();
            }

            var label = LabelClaims(forcedTypeCas, filters, from, to, rows.Count);

            if (groupBy != null)
            {
                var series = BuildClaimsSeries(rows, groupBy);
                series = ApplyOrderingAndLimit(series, orderBy, limit);
                return new ChatQueryResponseDto
                {
                    Label = label,
                    Series = series,
                    Value = series.Sum(s => s.Value),
                    Applied = applied
                };
            }

            if (metric == "list" || metric == "top")
            {
                var ordered = (orderBy == "date_asc")
                    ? rows.OrderBy(r => r.CreatedAt).ToList()
                    : rows.OrderByDescending(r => r.CreatedAt).ToList();
                var asRows = ordered.Take(limit).Select(ClaimToRow).ToList();
                return new ChatQueryResponseDto
                {
                    Label = label,
                    Value = rows.Count,
                    Rows = asRows,
                    Applied = applied
                };
            }

            return new ChatQueryResponseDto
            {
                Label = label,
                Value = rows.Count,
                Applied = applied
            };
        }

        private static List<ChatQuerySeriesPointDto> BuildClaimsSeries(
            IEnumerable<F_RECLAMATION> rows, string groupBy)
        {
            switch (groupBy)
            {
                case "status":
                    return rows.GroupBy(r => r.Statut)
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();
                case "motif":
                    return rows.GroupBy(r => r.Motif)
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();
                case "typeCas":
                    return rows.GroupBy(r => r.TypeCas)
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();
                case "source":
                    return rows.GroupBy(r => r.Source)
                        .Select(g => new ChatQuerySeriesPointDto { Bucket = g.Key, Value = g.Count() })
                        .ToList();
                case "day":
                    return rows.GroupBy(r => r.CreatedAt.Date)
                        .OrderBy(g => g.Key)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = g.Key.ToString("yyyy-MM-dd"),
                            Value = g.Count()
                        }).ToList();
                case "week":
                    return rows.GroupBy(r => StartOfWeek(r.CreatedAt))
                        .OrderBy(g => g.Key)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = g.Key.ToString("yyyy-'W'ww", CultureInfo.InvariantCulture),
                            Value = g.Count()
                        }).ToList();
                case "month":
                    return rows.GroupBy(r => new DateTime(r.CreatedAt.Year, r.CreatedAt.Month, 1))
                        .OrderBy(g => g.Key)
                        .Select(g => new ChatQuerySeriesPointDto
                        {
                            Bucket = g.Key.ToString("yyyy-MM"),
                            Value = g.Count()
                        }).ToList();
                default:
                    return new List<ChatQuerySeriesPointDto>();
            }
        }

        private static ChatQueryRowDto ClaimToRow(F_RECLAMATION r) => new()
        {
            Key = r.CodeReclamation,
            Label = $"{r.CodeReclamation} — {r.Motif} ({r.Statut})",
            Value = null,
            Fields = new Dictionary<string, object?>
            {
                ["code"] = r.CodeReclamation,
                ["doPiece"] = r.DoPiece,
                ["typeCas"] = r.TypeCas,
                ["source"] = r.Source,
                ["motif"] = r.Motif,
                ["statut"] = r.Statut,
                ["createdAt"] = r.CreatedAt,
                ["closedAt"] = r.ClosedAt,
                ["tentativesCount"] = r.TentativesCount,
                ["assignedTo"] = r.AssignedToUserId,
                ["visibleClient"] = r.VisibleClient
            }
        };

        // ====================================================================
        // PRODUCTS — top par quantité ou revenue
        // ====================================================================
        private async Task<ChatQueryResponseDto> QueryProductsAsync(
            ChatQueryFiltersDto filters, string metric, string? groupBy,
            int limit, string orderBy, DateTime from, DateTime to,
            ChatQueryAppliedDto applied, CancellationToken ct)
        {
            var lines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == DomainVente && l.DO_Type == BcType)
                .ToListAsync(ct);

            // Filtrer sur les pièces dans la période + gouvernorat.
            var validPieces = await GetPiecesInScopeAsync(filters, from, to, ct);
            lines = lines.Where(l => l.DO_Piece != null && validPieces.Contains(l.DO_Piece)).ToList();

            if (!string.IsNullOrWhiteSpace(filters.ProductRef))
            {
                var key = filters.ProductRef.Trim().ToUpperInvariant();
                lines = lines.Where(l => (l.AR_Ref ?? "").ToUpperInvariant() == key).ToList();
            }

            // Aggrégation par AR_Ref.
            var grouped = lines
                .Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .GroupBy(l => l.AR_Ref!)
                .Select(g => new
                {
                    Ref = g.Key,
                    Designation = g.First().DL_Design,
                    Quantity = g.Sum(x => x.DL_Qte ?? 0m),
                    Revenue = g.Sum(x => x.DL_MontantTTC ?? 0m)
                })
                .ToList();

            var ordered = orderBy == "amount_desc" || orderBy == "revenue_desc"
                ? grouped.OrderByDescending(x => x.Revenue).ToList()
                : grouped.OrderByDescending(x => x.Quantity).ToList();

            if (metric == "count")
            {
                return new ChatQueryResponseDto
                {
                    Label = $"{grouped.Count} produit(s) vendus sur la période",
                    Value = grouped.Count,
                    Applied = applied
                };
            }

            var rows = ordered.Take(limit).Select(p => new ChatQueryRowDto
            {
                Key = p.Ref,
                Label = $"{p.Ref} — {p.Designation}",
                Value = orderBy == "amount_desc" || orderBy == "revenue_desc" ? p.Revenue : p.Quantity,
                Fields = new Dictionary<string, object?>
                {
                    ["ref"] = p.Ref,
                    ["designation"] = p.Designation,
                    ["quantity"] = p.Quantity,
                    ["revenue"] = Math.Round(p.Revenue, 2)
                }
            }).ToList();

            return new ChatQueryResponseDto
            {
                Label = $"Top {rows.Count} produits",
                Value = grouped.Count,
                Rows = rows,
                Applied = applied
            };
        }

        private async Task<HashSet<string>> GetPiecesInScopeAsync(
            ChatQueryFiltersDto filters, DateTime from, DateTime to, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var govKey = NormalizeGovKey(filters.Governorate);
            HashSet<string>? matchingTiers = null;
            if (govKey != null)
            {
                matchingTiers = profiles
                    .Where(p => p.Gouvernorat.HasValue && NormalizeGov(p.Gouvernorat.Value) == govKey)
                    .Select(p => Normalize(p.CodeClientSage))
                    .Where(c => c != null).Cast<string>().ToHashSet();
            }

            var orders = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= from && x.DO_Date < to)
                .Select(x => new { x.DO_Piece, x.DO_Tiers })
                .ToListAsync(ct);

            if (matchingTiers != null)
                orders = orders.Where(o => o.DO_Tiers != null && matchingTiers.Contains(o.DO_Tiers.ToUpperInvariant())).ToList();

            return orders.Where(o => !string.IsNullOrWhiteSpace(o.DO_Piece))
                .Select(o => o.DO_Piece!).ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        // ====================================================================
        // GOVERNORATES — répartition + taux
        // ====================================================================
        private async Task<ChatQueryResponseDto> QueryGovernoratesAsync(
            ChatQueryFiltersDto filters, string metric, int limit,
            DateTime from, DateTime to, ChatQueryAppliedDto applied, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var lookup = BuildProfileLookup(profiles);

            var orders = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= from && x.DO_Date < to)
                .ToListAsync(ct);

            var pieces = orders.Select(o => o.DO_Piece).Where(p => !string.IsNullOrWhiteSpace(p)).Cast<string>().ToHashSet();
            var livraisons = pieces.Count == 0
                ? new List<F_LIVRAISON>()
                : await _db.F_LIVRAISONS.AsNoTracking()
                    .Where(l => pieces.Contains(l.DO_Piece))
                    .ToListAsync(ct);
            var livByPiece = livraisons
                .GroupBy(l => l.DO_Piece)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(l => l.LI_DateCreation).First(),
                    StringComparer.OrdinalIgnoreCase);

            var byGov = orders
                .GroupBy(o =>
                {
                    var p = ResolveProfile(o.DO_Tiers, lookup);
                    return p?.Gouvernorat?.ToString() ?? "Inconnu";
                })
                .Select(g =>
                {
                    var ord = g.ToList();
                    var del = ord.Count(o => HasDeliveryStatus(o, livByPiece, DeliveryStatusCodes.Livre));
                    var ret = ord.Count(o => HasDeliveryStatus(o, livByPiece, DeliveryStatusCodes.Retour));
                    return new
                    {
                        Governorate = g.Key,
                        Orders = ord.Count,
                        Delivered = del,
                        Returned = ret,
                        DeliveryRate = ord.Count == 0 ? 0m : Math.Round((decimal)del * 100m / ord.Count, 1)
                    };
                })
                .OrderByDescending(g => g.Orders)
                .Take(limit)
                .ToList();

            var rows = byGov.Select(g => new ChatQueryRowDto
            {
                Key = g.Governorate,
                Label = g.Governorate,
                Value = g.Orders,
                Fields = new Dictionary<string, object?>
                {
                    ["governorate"] = g.Governorate,
                    ["orders"] = g.Orders,
                    ["delivered"] = g.Delivered,
                    ["returned"] = g.Returned,
                    ["deliveryRate"] = g.DeliveryRate
                }
            }).ToList();

            return new ChatQueryResponseDto
            {
                Label = "Répartition par gouvernorat",
                Value = byGov.Sum(g => g.Orders),
                Rows = rows,
                Series = byGov.Select(g => new ChatQuerySeriesPointDto
                {
                    Bucket = g.Governorate,
                    Value = g.Orders
                }).ToList(),
                Applied = applied
            };
        }

        // ====================================================================
        // DRIVERS / CONFIRMATRICES — count + list (basique)
        // ====================================================================
        private async Task<ChatQueryResponseDto> QueryDriversAsync(
            ChatQueryFiltersDto filters, string metric, int limit,
            DateTime from, DateTime to, ChatQueryAppliedDto applied, CancellationToken ct)
            => await QueryUsersByRoleAsync(AppRoles.LIVREUR, "livreur", metric, limit, applied, ct);

        private async Task<ChatQueryResponseDto> QueryConfirmatricesAsync(
            ChatQueryFiltersDto filters, string metric, int limit,
            DateTime from, DateTime to, ChatQueryAppliedDto applied, CancellationToken ct)
            => await QueryUsersByRoleAsync(AppRoles.CONFIRMATEUR, "confirmatrice", metric, limit, applied, ct);

        private async Task<ChatQueryResponseDto> QueryUsersByRoleAsync(
            string roleName, string singularLabel, string metric, int limit,
            ChatQueryAppliedDto applied, CancellationToken ct)
        {
            var role = await _db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == roleName, ct);
            if (role == null)
                return new ChatQueryResponseDto
                {
                    Label = $"Aucun {singularLabel} trouvé",
                    Value = 0, Applied = applied
                };

            var userIds = await _db.UserRoles.AsNoTracking()
                .Where(ur => ur.RoleId == role.Id)
                .Select(ur => ur.UserId).ToListAsync(ct);

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId.HasValue && userIds.Contains(p.UtilisateurId.Value))
                .ToListAsync(ct);

            if (metric == "count")
            {
                return new ChatQueryResponseDto
                {
                    Label = $"{userIds.Count} {singularLabel}(s)",
                    Value = userIds.Count, Applied = applied
                };
            }

            var rows = profiles.Take(limit).Select(p => new ChatQueryRowDto
            {
                Key = p.UtilisateurId?.ToString(),
                Label = p.NomComplet ?? p.UtilisateurId?.ToString() ?? "?",
                Fields = new Dictionary<string, object?>
                {
                    ["userId"] = p.UtilisateurId,
                    ["nomComplet"] = p.NomComplet,
                    ["telephone"] = p.Telephone,
                    ["governorate"] = p.Gouvernorat?.ToString()
                }
            }).ToList();

            return new ChatQueryResponseDto
            {
                Label = $"Liste des {singularLabel}s",
                Value = userIds.Count,
                Rows = rows,
                Applied = applied
            };
        }

        // ====================================================================
        // Helpers communs
        // ====================================================================
        private static ChatQueryResponseDto Unsupported(ChatQueryAppliedDto applied, string message)
            => new()
            {
                Label = message,
                Value = null,
                Applied = applied,
                Warnings = new List<string> { message }
            };

        private static (DateTime from, DateTime to) ResolvePeriod(ChatQueryFiltersDto f)
        {
            var now = DateTime.UtcNow;
            if (f.From.HasValue && f.To.HasValue)
                return (f.From.Value.Date, f.To.Value.Date.AddDays(1));

            var p = (f.Period ?? "30d").Trim().ToLowerInvariant();
            return p switch
            {
                "today" => (now.Date, now.Date.AddDays(1)),
                "yesterday" => (now.Date.AddDays(-1), now.Date),
                "7d" => (now.Date.AddDays(-7), now.Date.AddDays(1)),
                "3m" => (now.Date.AddMonths(-3), now.Date.AddDays(1)),
                "6m" => (now.Date.AddMonths(-6), now.Date.AddDays(1)),
                "12m" => (now.Date.AddYears(-1), now.Date.AddDays(1)),
                "all" => (new DateTime(2020, 1, 1), now.Date.AddDays(1)),
                _ => (now.Date.AddDays(-30), now.Date.AddDays(1))
            };
        }

        private static int NormalizeLimit(int? raw)
        {
            if (!raw.HasValue || raw.Value <= 0) return DefaultLimit;
            return Math.Min(raw.Value, MaxLimit);
        }

        private static string? NormalizeGroupBy(string? raw)
        {
            var g = (raw ?? "").Trim().ToLowerInvariant();
            return g switch
            {
                "status" or "deliverystatus" or "governorate" or "driver"
                or "confirmatrice" or "day" or "week" or "month"
                or "motif" or "typecas" or "source" => g,
                _ => null
            };
        }

        private static List<ChatQuerySeriesPointDto> ApplyOrderingAndLimit(
            List<ChatQuerySeriesPointDto> series, string orderBy, int limit)
        {
            var ordered = orderBy switch
            {
                "value_asc" or "count_asc" => series.OrderBy(s => s.Value).ToList(),
                "bucket_asc" => series.OrderBy(s => s.Bucket).ToList(),
                "bucket_desc" => series.OrderByDescending(s => s.Bucket).ToList(),
                _ => series.OrderByDescending(s => s.Value).ToList()
            };
            return ordered.Take(limit).ToList();
        }

        private static DateTime StartOfWeek(DateTime d)
        {
            var diff = (7 + (d.DayOfWeek - DayOfWeek.Monday)) % 7;
            return d.Date.AddDays(-diff);
        }

        private static string MapDeliveryStatusLabel(short status) => status switch
        {
            DeliveryStatusCodes.Confirme => DeliveryStatuses.Confirme,
            DeliveryStatusCodes.EnLivraison => DeliveryStatuses.EnLivraison,
            DeliveryStatusCodes.Livre => DeliveryStatuses.Livre,
            DeliveryStatusCodes.Retour => DeliveryStatuses.Retour,
            DeliveryStatusCodes.Depot => DeliveryStatuses.Depot,
            DeliveryStatusCodes.Reporte => DeliveryStatuses.Reporte,
            _ => "INCONNU"
        };

        private static string LabelOrdersCount(ChatQueryFiltersDto f, DateTime from, DateTime to)
        {
            var parts = new List<string>();
            switch ((f.Status ?? "all").ToLowerInvariant())
            {
                case "delivered": parts.Add("commande(s) livrée(s)"); break;
                case "returned": parts.Add("commande(s) retournée(s)"); break;
                case "postponed": parts.Add("commande(s) reportée(s)"); break;
                case "indelivery": parts.Add("commande(s) en livraison"); break;
                case "pending": parts.Add("commande(s) en attente"); break;
                case "confirmed": parts.Add("commande(s) confirmée(s)"); break;
                case "refused": parts.Add("commande(s) refusée(s)"); break;
                case "tentative": parts.Add("commande(s) en tentative"); break;
                default: parts.Add("commande(s)"); break;
            }
            if (!string.IsNullOrWhiteSpace(f.Governorate)) parts.Add($"à {f.Governorate}");
            parts.Add($"du {from:yyyy-MM-dd} au {to.AddDays(-1):yyyy-MM-dd}");
            return string.Join(" ", parts);
        }

        private static string LabelOrdersSum(ChatQueryFiltersDto f, DateTime from, DateTime to)
            => $"Chiffre d'affaires {(f.Governorate != null ? $"({f.Governorate}) " : "")}du {from:yyyy-MM-dd} au {to.AddDays(-1):yyyy-MM-dd}";

        private static string LabelOrdersGroupBy(string metric, string groupBy, ChatQueryFiltersDto f, DateTime from, DateTime to)
        {
            var dim = groupBy switch
            {
                "status" => "par statut",
                "deliveryStatus" => "par statut livraison",
                "governorate" => "par gouvernorat",
                "driver" => "par livreur",
                "day" => "par jour",
                "week" => "par semaine",
                "month" => "par mois",
                _ => $"par {groupBy}"
            };
            return $"Commandes {dim}, du {from:yyyy-MM-dd} au {to.AddDays(-1):yyyy-MM-dd}";
        }

        private static string LabelClaims(string? typeCas, ChatQueryFiltersDto f, DateTime from, DateTime to, int total)
        {
            var label = typeCas switch
            {
                "RECLAMATION" => $"{total} réclamation(s) client",
                "DEMANDE" => $"{total} demande(s) livreur",
                _ => $"{total} cas"
            };
            if (!string.IsNullOrWhiteSpace(f.Status)) label += $" — statut {f.Status}";
            if (!string.IsNullOrWhiteSpace(f.Motif)) label += $" — motif {f.Motif}";
            if (!string.IsNullOrWhiteSpace(f.Governorate)) label += $" ({f.Governorate})";
            label += $" du {from:yyyy-MM-dd} au {to.AddDays(-1):yyyy-MM-dd}";
            return label;
        }

        private static string FormatAmount(decimal amount)
            => amount.ToString("N2", CultureInfo.GetCultureInfo("fr-FR")) + " DT";

        // Profil / lookup (calqué sur AdminOrdersService)
        private static Dictionary<string, ProfilUtilisateur> BuildProfileLookup(
            IEnumerable<ProfilUtilisateur> profiles)
        {
            var dict = new Dictionary<string, ProfilUtilisateur>(StringComparer.OrdinalIgnoreCase);
            foreach (var profile in profiles)
            {
                AddAlias(dict, profile.CodeClientSage, profile);
                if (profile.UtilisateurId.HasValue)
                {
                    var userId = profile.UtilisateurId.Value;
                    AddAlias(dict, userId.ToString(), profile);
                    AddAlias(dict, userId.ToString("N"), profile);
                    var n = userId.ToString("N");
                    if (n.Length >= 15)
                        AddAlias(dict, "CL" + n.Substring(0, 15), profile);
                }
            }
            return dict;
        }

        private static void AddAlias(Dictionary<string, ProfilUtilisateur> dict,
            string? value, ProfilUtilisateur profile)
        {
            var n = Normalize(value);
            if (n != null && !dict.ContainsKey(n)) dict[n] = profile;
        }

        private static ProfilUtilisateur? ResolveProfile(string? tiers,
            IReadOnlyDictionary<string, ProfilUtilisateur> lookup)
        {
            var n = Normalize(tiers);
            return n != null && lookup.TryGetValue(n, out var p) ? p : null;
        }

        private static string? Normalize(string? value)
        {
            var n = (value ?? string.Empty).Trim();
            return string.IsNullOrWhiteSpace(n) ? null : n.ToUpperInvariant();
        }

        private static string NormalizeGov(GouvernoratTunisie g)
            => g.ToString().ToUpperInvariant().Replace(" ", "").Replace("-", "");

        private static string? NormalizeGovKey(string? s)
            => string.IsNullOrWhiteSpace(s) ? null
               : s.ToUpperInvariant().Replace(" ", "").Replace("-", "")
                  .Replace("É", "E").Replace("È", "E").Replace("Ê", "E");
    }
}
