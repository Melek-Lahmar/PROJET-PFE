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
    /// Onglet Commandes/Colis du cockpit admin Flutter : liste paginée filtrable
    /// (période, gouvernorat, statut, recherche), KPIs globaux sur la période, et
    /// détail commande pour le drawer (entête + lignes article + livraison).
    /// Pattern et helpers alignés sur AdminDashboardService pour cohérence.
    /// </summary>
    public class AdminOrdersService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;

        private readonly AppDbContext _db;

        public AdminOrdersService(AppDbContext db)
        {
            _db = db;
        }

        // ====================================================================
        // GET /api/admin/orders — liste paginée + KPIs
        // ====================================================================
        public async Task<AdminOrdersPageDto> GetPageAsync(
            AdminOrdersQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct);

            // KPIs sur l'ensemble période + gouvernorat (avant filtre statut/search).
            var kpis = BuildKpis(snapshot);

            // Filtre statut + recherche, puis tri, puis pagination.
            var filtered = ApplyStatusAndSearch(snapshot, filter);
            var sorted = ApplySort(filtered, filter.Sort);
            var total = sorted.Count;
            var totalPages = filter.PageSize == 0 ? 0 : (int)Math.Ceiling(total / (double)filter.PageSize);

            var paged = sorted
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            var items = paged.Select(o => MapListItem(o, snapshot)).ToList();

            return new AdminOrdersPageDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = new AdminOrdersAppliedFiltersDto
                {
                    Period = filter.Period,
                    From = filter.From,
                    To = filter.To,
                    Governorate = filter.Governorate,
                    Status = filter.Status,
                    Search = filter.Search,
                    Sort = filter.Sort,
                    Page = filter.Page,
                    PageSize = filter.PageSize
                },
                Page = filter.Page,
                PageSize = filter.PageSize,
                Total = total,
                TotalPages = totalPages,
                Kpis = kpis,
                Items = items
            };
        }

        // ====================================================================
        // GET /api/admin/orders/{piece} — détail (drawer)
        // ====================================================================
        public async Task<AdminOrdersDetailDto?> GetDetailAsync(string piece, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(piece)) return null;
            var trimmed = piece.Trim();

            var order = await _db.F_DOCENTETES.AsNoTracking()
                .Where(o => o.DO_Domaine == DomainVente && o.DO_Type == BcType
                            && o.DO_Piece == trimmed)
                .FirstOrDefaultAsync(ct);

            if (order == null) return null;

            var lines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == DomainVente && l.DO_Type == BcType
                            && l.DO_Piece == trimmed)
                .ToListAsync(ct);

            var livraison = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(l => l.DO_Piece == trimmed)
                .OrderByDescending(l => l.LI_DateCreation)
                .FirstOrDefaultAsync(ct);

            var reclamations = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.DoPiece == trimmed)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new AdminOrdersReclamationLinkDto
                {
                    Id = r.Id,
                    Code = r.CodeReclamation,
                    TypeCas = r.TypeCas,
                    Source = r.Source,
                    Motif = r.Motif,
                    Statut = r.Statut,
                    CreatedAt = r.CreatedAt,
                    ClosedAt = r.ClosedAt,
                    VisibleClient = r.VisibleClient
                })
                .ToListAsync(ct);

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var lookup = BuildProfileLookup(profiles);
            var clientProfile = ResolveProfile(order.DO_Tiers, lookup);

            ProfilUtilisateur? livreurProfile = null;
            if (livraison?.LivreurId != null)
            {
                livreurProfile = profiles.FirstOrDefault(p => p.cbMarq == livraison.LivreurId);
            }

            return new AdminOrdersDetailDto
            {
                Piece = order.DO_Piece ?? trimmed,
                Date = order.DO_Date,
                OrderStatus = F_DOCENTETE.ToStatusLabel(order.DO_Valide),
                TypeCommande = order.TypeCommande,

                Tiers = order.DO_Tiers,
                ClientName = clientProfile?.NomComplet,
                ClientPhone = order.DO_TelephoneLivraison ?? clientProfile?.Telephone,
                Address = order.DO_AdresseLivraison,
                Ville = order.DO_VilleLivraison,
                Governorate = clientProfile?.Gouvernorat?.ToString(),

                AmountHt = order.DO_TotalHT,
                AmountTtc = order.DO_TotalTTC ?? order.DO_NetAPayer,
                FraisLivraison = order.DO_FraisLivraison,
                ModePaiement = order.DO_ModePaiement,
                ModeLivraison = order.DO_ModeLivraison,

                Lines = lines.Select(l => new AdminOrdersLineDto
                {
                    ArticleRef = l.AR_Ref,
                    Designation = l.DL_Design,
                    Quantity = l.DL_Qte,
                    UnitPrice = l.DL_PrixUnitaire,
                    TotalTtc = l.DL_MontantTTC,
                    LineType = l.LigneType
                }).ToList(),

                Delivery = livraison == null ? null : new AdminOrdersDeliveryDto
                {
                    Status = MapDeliveryStatusLabel(livraison.LI_Statut),
                    CreatedAt = livraison.LI_DateCreation,
                    DeliveredAt = livraison.LI_DateLivree,
                    RescheduledAt = livraison.LI_DateReplanification,
                    Address = livraison.LI_Adresse,
                    Comment = livraison.LI_Commentaire,
                    LivreurName = livreurProfile?.NomComplet,
                    LivreurPhone = livreurProfile?.Telephone
                },

                Reclamations = reclamations
            };
        }

        // ====================================================================
        // Snapshot loader
        // ====================================================================
        private async Task<Snapshot> LoadSnapshotAsync(Filter filter, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var lookup = BuildProfileLookup(profiles);

            HashSet<string>? matchingTiers = null;
            if (filter.Governorate != null)
            {
                matchingTiers = profiles
                    .Where(p => p.Gouvernorat.HasValue &&
                                NormalizeGov(p.Gouvernorat.Value) == NormalizeGovKey(filter.Governorate))
                    .Select(p => Normalize(p.CodeClientSage))
                    .Where(c => c != null)
                    .Cast<string>()
                    .ToHashSet();
            }

            var ordersQuery = _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= filter.From && x.DO_Date < filter.To);

            var orders = await ordersQuery.ToListAsync(ct);
            if (matchingTiers != null)
            {
                orders = orders
                    .Where(o => o.DO_Tiers != null && matchingTiers.Contains(o.DO_Tiers.ToUpperInvariant()))
                    .ToList();
            }

            var pieces = orders
                .Select(o => o.DO_Piece)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Cast<string>()
                .ToHashSet();

            var livraisons = pieces.Count == 0
                ? new List<F_LIVRAISON>()
                : await _db.F_LIVRAISONS.AsNoTracking()
                    .Where(l => pieces.Contains(l.DO_Piece))
                    .ToListAsync(ct);

            // Une commande peut avoir plusieurs livraisons (replanif, etc.) — on prend la plus récente.
            var livraisonByPiece = livraisons
                .GroupBy(l => l.DO_Piece)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(l => l.LI_DateCreation).First(),
                    StringComparer.OrdinalIgnoreCase);

            var reclamationPieces = pieces.Count == 0
                ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : (await _db.F_RECLAMATIONS.AsNoTracking()
                    .Where(r => pieces.Contains(r.DoPiece))
                    .Select(r => r.DoPiece)
                    .ToListAsync(ct))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var livreurProfiles = livraisons
                .Where(l => l.LivreurId.HasValue)
                .Select(l => l.LivreurId!.Value)
                .Distinct()
                .ToList();

            var livreurByCbMarq = profiles
                .Where(p => livreurProfiles.Contains(p.cbMarq))
                .ToDictionary(p => p.cbMarq, p => p);

            return new Snapshot
            {
                Orders = orders,
                LivraisonByPiece = livraisonByPiece,
                ReclamationPieces = reclamationPieces,
                ProfileByAlias = lookup,
                LivreurByCbMarq = livreurByCbMarq
            };
        }

        // ====================================================================
        // KPIs (sur la période + gouvernorat, sans filtre statut/search)
        // ====================================================================
        private static List<AdminKpiDto> BuildKpis(Snapshot s)
        {
            var orders = s.Orders.Count;
            var pending = s.Orders.Count(o => o.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE);
            var confirmed = s.Orders.Count(o => o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME);
            var refused = s.Orders.Count(o => o.DO_Valide == F_DOCENTETE.STATUS_REFUSE);

            var livraisons = s.LivraisonByPiece.Values.ToList();
            var inDelivery = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.EnLivraison);
            var delivered = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre);
            var returned = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour);
            var postponed = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Reporte);
            var totalLiv = livraisons.Count;

            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            return new List<AdminKpiDto>
            {
                Count("orders", "Commandes", orders),
                Count("pending", "En attente", pending),
                Count("confirmed", "Confirmées", confirmed),
                Count("inDelivery", "En livraison", inDelivery),
                Count("delivered", "Livrées", delivered),
                Count("returned", "Retournées", returned),
                Count("postponed", "Reportées", postponed),
                Count("refused", "Refusées", refused),
                Percent("deliveryRate", "Taux livraison", Rate(delivered, totalLiv))
            };
        }

        private static AdminKpiDto Count(string key, string label, int value) => new()
        {
            Key = key,
            Label = label,
            Value = value,
            FormattedValue = value.ToString("N0", CultureInfo.GetCultureInfo("fr-FR")),
            DeltaDirection = "flat",
            Format = "count"
        };

        private static AdminKpiDto Percent(string key, string label, decimal value) => new()
        {
            Key = key,
            Label = label,
            Value = value,
            FormattedValue = $"{value.ToString("0.#", CultureInfo.GetCultureInfo("fr-FR"))} %",
            DeltaDirection = "flat",
            Format = "percent"
        };

        // ====================================================================
        // Filtre statut + recherche
        // ====================================================================
        private static List<F_DOCENTETE> ApplyStatusAndSearch(Snapshot s, Filter filter)
        {
            IEnumerable<F_DOCENTETE> query = s.Orders;

            switch (filter.Status)
            {
                case "pending":
                    query = query.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE);
                    break;
                case "confirmed":
                    query = query.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME);
                    break;
                case "tentative":
                    query = query.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE);
                    break;
                case "refused":
                    query = query.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_REFUSE);
                    break;
                case "inDelivery":
                    query = query.Where(o => HasDeliveryStatus(o, s, DeliveryStatusCodes.EnLivraison));
                    break;
                case "delivered":
                    query = query.Where(o => HasDeliveryStatus(o, s, DeliveryStatusCodes.Livre));
                    break;
                case "returned":
                    query = query.Where(o => HasDeliveryStatus(o, s, DeliveryStatusCodes.Retour));
                    break;
                case "postponed":
                    query = query.Where(o => HasDeliveryStatus(o, s, DeliveryStatusCodes.Reporte));
                    break;
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToUpperInvariant();
                query = query.Where(o =>
                {
                    if ((o.DO_Piece ?? string.Empty).ToUpperInvariant().Contains(q)) return true;
                    if ((o.DO_Tiers ?? string.Empty).ToUpperInvariant().Contains(q)) return true;
                    if ((o.DO_VilleLivraison ?? string.Empty).ToUpperInvariant().Contains(q)) return true;
                    var profile = ResolveProfile(o.DO_Tiers, s.ProfileByAlias);
                    if (profile != null)
                    {
                        if ((profile.NomComplet ?? string.Empty).ToUpperInvariant().Contains(q)) return true;
                        if ((profile.Telephone ?? string.Empty).ToUpperInvariant().Contains(q)) return true;
                    }
                    return false;
                });
            }

            return query.ToList();
        }

        private static bool HasDeliveryStatus(F_DOCENTETE o, Snapshot s, short status)
        {
            if (o.DO_Piece == null) return false;
            return s.LivraisonByPiece.TryGetValue(o.DO_Piece, out var l) && l.LI_Statut == status;
        }

        private static List<F_DOCENTETE> ApplySort(List<F_DOCENTETE> orders, string sort)
        {
            return sort switch
            {
                "date_asc" => orders.OrderBy(o => o.DO_Date).ToList(),
                "amount_desc" => orders.OrderByDescending(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m).ToList(),
                _ => orders.OrderByDescending(o => o.DO_Date).ToList()
            };
        }

        // ====================================================================
        // Mapping liste
        // ====================================================================
        private static AdminOrderListItemDto MapListItem(F_DOCENTETE o, Snapshot s)
        {
            var profile = ResolveProfile(o.DO_Tiers, s.ProfileByAlias);
            string? livreurName = null;
            string? deliveryStatus = null;

            if (o.DO_Piece != null && s.LivraisonByPiece.TryGetValue(o.DO_Piece, out var liv))
            {
                deliveryStatus = MapDeliveryStatusLabel(liv.LI_Statut);
                if (liv.LivreurId.HasValue
                    && s.LivreurByCbMarq.TryGetValue(liv.LivreurId.Value, out var livreur))
                {
                    livreurName = livreur.NomComplet;
                }
            }

            return new AdminOrderListItemDto
            {
                Piece = o.DO_Piece ?? string.Empty,
                Date = o.DO_Date,
                Tiers = o.DO_Tiers,
                ClientName = profile?.NomComplet,
                Telephone = o.DO_TelephoneLivraison ?? profile?.Telephone,
                Ville = o.DO_VilleLivraison,
                Governorate = profile?.Gouvernorat?.ToString(),
                OrderStatus = F_DOCENTETE.ToStatusLabel(o.DO_Valide),
                DeliveryStatus = deliveryStatus,
                Amount = o.DO_TotalTTC ?? o.DO_NetAPayer,
                LivreurName = livreurName,
                HasClaim = o.DO_Piece != null && s.ReclamationPieces.Contains(o.DO_Piece)
            };
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

        // ====================================================================
        // Plumbing — filtres / périodes / profils (calqué sur AdminDashboardService)
        // ====================================================================
        private static Filter BuildFilter(AdminOrdersQueryDto q)
        {
            var (period, from, to) = ResolvePeriod(q);
            var status = NormalizeStatus(q.Status);
            var sort = NormalizeSort(q.Sort);
            var page = (q.Page.HasValue && q.Page.Value > 0) ? q.Page.Value : 1;
            var pageSize = (q.PageSize.HasValue && q.PageSize.Value > 0 && q.PageSize.Value <= 100)
                ? q.PageSize.Value : 25;

            return new Filter
            {
                Period = period,
                From = from,
                To = to,
                Governorate = string.IsNullOrWhiteSpace(q.Governorate) ? null : q.Governorate.Trim(),
                Status = status,
                Search = string.IsNullOrWhiteSpace(q.Search) ? null : q.Search.Trim(),
                Sort = sort,
                Page = page,
                PageSize = pageSize
            };
        }

        private static (string period, DateTime from, DateTime to) ResolvePeriod(AdminOrdersQueryDto q)
        {
            var now = DateTime.UtcNow;

            if (q.From.HasValue && q.To.HasValue)
                return ("custom", q.From.Value.Date, q.To.Value.Date.AddDays(1));

            var p = (q.Period ?? "30d").ToLowerInvariant();
            return p switch
            {
                "today" => ("today", now.Date, now.Date.AddDays(1)),
                "7d" => ("7d", now.Date.AddDays(-7), now.Date.AddDays(1)),
                "3m" => ("3m", now.Date.AddMonths(-3), now.Date.AddDays(1)),
                "12m" => ("12m", now.Date.AddYears(-1), now.Date.AddDays(1)),
                _ => ("30d", now.Date.AddDays(-30), now.Date.AddDays(1))
            };
        }

        private static string NormalizeStatus(string? raw)
        {
            var s = (raw ?? "all").Trim();
            return s switch
            {
                "pending" or "confirmed" or "tentative" or "refused"
                or "inDelivery" or "delivered" or "returned" or "postponed"
                or "all" => s,
                _ => "all"
            };
        }

        private static string NormalizeSort(string? raw)
        {
            var s = (raw ?? "date_desc").Trim();
            return s switch
            {
                "date_asc" or "amount_desc" or "date_desc" => s,
                _ => "date_desc"
            };
        }

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

        private static string NormalizeGovKey(string s)
            => (s ?? string.Empty).ToUpperInvariant()
                .Replace(" ", "").Replace("-", "")
                .Replace("É", "E").Replace("È", "E").Replace("Ê", "E");

        // ====================================================================
        // Types internes
        // ====================================================================
        private class Filter
        {
            public string Period { get; set; } = "30d";
            public DateTime From { get; set; }
            public DateTime To { get; set; }
            public string? Governorate { get; set; }
            public string Status { get; set; } = "all";
            public string? Search { get; set; }
            public string Sort { get; set; } = "date_desc";
            public int Page { get; set; } = 1;
            public int PageSize { get; set; } = 25;
        }

        private class Snapshot
        {
            public List<F_DOCENTETE> Orders { get; set; } = new();
            public Dictionary<string, F_LIVRAISON> LivraisonByPiece { get; set; } =
                new(StringComparer.OrdinalIgnoreCase);
            public HashSet<string> ReclamationPieces { get; set; } =
                new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, ProfilUtilisateur> ProfileByAlias { get; set; } =
                new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<int, ProfilUtilisateur> LivreurByCbMarq { get; set; } = new();
        }
    }
}
