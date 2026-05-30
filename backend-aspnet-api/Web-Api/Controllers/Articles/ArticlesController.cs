using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.Articles;
using Web_Api.Model;

namespace Web_Api.Controllers.Articles
{
    [ApiController]
    [Route("api/articles")]
    public class ArticlesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private const decimal DefaultLowStockThreshold = 5m;

        public ArticlesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] bool publishedOnly = true,
            [FromQuery] int? catalogueNo = null,
            [FromQuery] int? catalogue = null,
            [FromQuery] short? type = null,
            [FromQuery] bool includeSleeping = false,
            [FromQuery] int? depotNo = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] string? stockStatus = null,
            [FromQuery] decimal? stockThreshold = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDirection = null,
            [FromQuery] int take = 200,
            [FromQuery] int skip = 0,
            CancellationToken ct = default)
        {
            if (take <= 0) take = 24;
            if (take > 1000) take = 1000;
            if (skip < 0) skip = 0;

            var effectiveCatalogueNo = catalogueNo ?? catalogue;
            var effectiveThreshold = stockThreshold.GetValueOrDefault(DefaultLowStockThreshold);
            if (effectiveThreshold < 0m) effectiveThreshold = 0m;

            var rawRows = await BuildArticleRowsQuery(
                    search,
                    publishedOnly,
                    effectiveCatalogueNo,
                    type,
                    includeSleeping,
                    depotNo,
                    minPrice,
                    maxPrice)
                .ToListAsync(ct);

            var items = rawRows
                .Select(x => MapArticleRow(x, effectiveThreshold))
                .ToList();

            items = ApplyStockStatusFilter(items, stockStatus).ToList();
            items = ApplySort(items, sortBy, sortDirection).ToList();

            var total = items.Count;

            if (skip >= total && total > 0)
            {
                var lastPageIndex = (int)Math.Ceiling(total / (double)take) - 1;
                skip = Math.Max(0, lastPageIndex * take);
            }

            var pagedItems = items
                .Skip(skip)
                .Take(take)
                .ToList();

            return Ok(new { total, skip, take, items = pagedItems });
        }

        /// <summary>
        /// Métadonnées d'agrégation pour la barre de filtres catalogue React :
        /// nombre d'articles, min et max price. Filtré par les mêmes params
        /// que GET /api/articles (search, publishedOnly, catalogueNo, depotNo, etc.).
        /// </summary>
        [HttpGet("filter-metadata")]
        public async Task<IActionResult> GetFilterMetadata(
            [FromQuery] string? search,
            [FromQuery] bool publishedOnly = true,
            [FromQuery] int? catalogueNo = null,
            [FromQuery] int? catalogue = null,
            [FromQuery] string? familyCode = null,
            [FromQuery] bool includeSleeping = false,
            [FromQuery] int? depotNo = null,
            [FromQuery] string? stockStatus = null,
            CancellationToken ct = default)
        {
            var effectiveCatalogueNo = catalogueNo ?? catalogue;

            var rawRows = await BuildArticleRowsQuery(
                    search,
                    publishedOnly,
                    effectiveCatalogueNo,
                    type: null,
                    includeSleeping,
                    depotNo,
                    minPrice: null,
                    maxPrice: null)
                .ToListAsync(ct);

            var items = rawRows.Select(x => MapArticleRow(x, DefaultLowStockThreshold)).ToList();
            items = ApplyStockStatusFilter(items, stockStatus).ToList();

            if (!string.IsNullOrWhiteSpace(familyCode))
            {
                var fam = familyCode.Trim();
                items = items
                    .Where(x => string.Equals(x.FA_CodeFamille, fam, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            if (items.Count == 0)
                return Ok(new { count = 0, minPrice = (decimal?)null, maxPrice = (decimal?)null });

            var prices = items.Select(x => x.AR_PrixVen).ToList();
            return Ok(new
            {
                count = items.Count,
                minPrice = (decimal?)prices.Min(),
                maxPrice = (decimal?)prices.Max(),
            });
        }

        [HttpGet("{arRef}")]
        public async Task<IActionResult> GetByRef(
            string arRef,
            [FromQuery] int? depotNo = null,
            [FromQuery] decimal? stockThreshold = null,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                return BadRequest(new { message = "arRef est obligatoire." });

            var normalizedRef = arRef.Trim();
            var normalizedRefUpper = normalizedRef.ToUpperInvariant();
            var normalizedLookupRef = NormalizeArticleRefForComparison(normalizedRef);

            var effectiveThreshold = stockThreshold.GetValueOrDefault(DefaultLowStockThreshold);
            if (effectiveThreshold < 0m) effectiveThreshold = 0m;

            var query = BuildArticleRowsQuery(
                search: null,
                publishedOnly: false,
                effectiveCatalogueNo: null,
                type: null,
                includeSleeping: true,
                depotNo: depotNo,
                minPrice: null,
                maxPrice: null);

            var row = await query.FirstOrDefaultAsync(
                x => x.AR_Ref != null && x.AR_Ref.ToUpper() == normalizedRefUpper,
                ct);

            if (row is null)
            {
                var candidates = await query
                    .Where(x => EF.Functions.Like(x.AR_Ref ?? string.Empty, $"%{normalizedRef}%"))
                    .Take(50)
                    .ToListAsync(ct);

                row = candidates.FirstOrDefault(x =>
                    NormalizeArticleRefForComparison(x.AR_Ref) == normalizedLookupRef);
            }

            if (row is null)
                return NotFound(new { message = $"Article introuvable: {normalizedRef}" });

            return Ok(MapArticleRow(row, effectiveThreshold));
        }

        private IQueryable<ArticleQueryRow> BuildArticleRowsQuery(
            string? search,
            bool publishedOnly,
            int? effectiveCatalogueNo,
            short? type,
            bool includeSleeping,
            int? depotNo,
            decimal? minPrice,
            decimal? maxPrice)
        {
            var articles = BuildSafeArticlesQuery();

            if (publishedOnly)
                articles = articles.Where(x => x.AR_Publie == 1);

            if (!includeSleeping)
                articles = articles.Where(x => x.AR_Sommeil == 0);

            if (type.HasValue)
                articles = articles.Where(x => x.AR_Type == type.Value);

            if (effectiveCatalogueNo.HasValue)
            {
                var c = effectiveCatalogueNo.Value;
                articles = articles.Where(x =>
                    x.CL_No1 == c ||
                    x.CL_No2 == c ||
                    x.CL_No3 == c ||
                    x.CL_No4 == c);
            }

            if (minPrice.HasValue)
                articles = articles.Where(x => x.AR_PrixVen >= minPrice.Value);

            if (maxPrice.HasValue)
                articles = articles.Where(x => x.AR_PrixVen <= maxPrice.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                articles = articles.Where(x =>
                    EF.Functions.Like(x.AR_Ref, $"%{s}%") ||
                    EF.Functions.Like(x.AR_Design, $"%{s}%") ||
                    EF.Functions.Like(x.AR_CodeBarre, $"%{s}%") ||
                    EF.Functions.Like(x.FA_CodeFamille, $"%{s}%"));
            }

            var stocks = BuildSafeStocksQuery();

            if (depotNo.HasValue)
                stocks = stocks.Where(x => x.DE_No == depotNo.Value);

            var stockByArticle = stocks
                .GroupBy(x => x.AR_Ref)
                .Select(g => new StockAggregateRow
                {
                    AR_Ref = g.Key,
                    AvailableStock = g.Sum(x => x.AS_QteSto - x.AS_QteRes)
                });

            var mainImages = BuildSafeArticleImagesQuery()
                .Where(x => !string.IsNullOrWhiteSpace(x.Url))
                .GroupBy(x => x.AR_Ref)
                .Select(g => new ArticleImageJoinRow
                {
                    AR_Ref = g.Key,
                    Url = g
                        .OrderByDescending(x => x.IsMain)
                        .ThenBy(x => x.SortOrder)
                        .ThenBy(x => x.Id)
                        .Select(x => x.Url)
                        .FirstOrDefault()
                });

            return
                from a in articles
                join s in stockByArticle on a.AR_Ref equals s.AR_Ref into stockJoin
                from stock in stockJoin.DefaultIfEmpty()
                join i in mainImages on a.AR_Ref equals i.AR_Ref into imageJoin
                from image in imageJoin.DefaultIfEmpty()
                select new ArticleQueryRow
                {
                    CbMarq = a.CbMarq,
                    AR_Ref = a.AR_Ref,
                    AR_Design = a.AR_Design,
                    AR_Description = a.AR_Description,
                    FA_CodeFamille = a.FA_CodeFamille,
                    AR_UniteVen = a.AR_UniteVen,
                    AR_PrixVen = a.AR_PrixVen,
                    AR_PrixTTC = a.AR_PrixTTC,
                    AR_SuiviStock = a.AR_SuiviStock,
                    AR_Sommeil = a.AR_Sommeil,
                    AR_Image = image != null ? image.Url : null,
                    AR_CodeBarre = a.AR_CodeBarre,
                    AR_Publie = a.AR_Publie,
                    CL_No1 = a.CL_No1,
                    CL_No2 = a.CL_No2,
                    CL_No3 = a.CL_No3,
                    CL_No4 = a.CL_No4,
                    AR_Type = a.AR_Type,
                    HasStockRows = stock != null,
                    AvailableStock = stock != null ? stock.AvailableStock : 0m
                };
        }

        private static IEnumerable<ArticleResponseDto> ApplyStockStatusFilter(
            IEnumerable<ArticleResponseDto> items,
            string? stockStatus)
        {
            if (string.IsNullOrWhiteSpace(stockStatus))
                return items;

            var normalized = stockStatus.Trim().ToUpperInvariant();

            return normalized switch
            {
                "AVAILABLE" or "IN_STOCK" or "INSTOCK"
                    => items.Where(x => x.StockStatus == "IN_STOCK"),

                "LOW" or "LOW_STOCK" or "LOWSTOCK"
                    => items.Where(x => x.StockStatus == "LOW_STOCK"),

                "OUT" or "OUT_OF_STOCK" or "OUTOFSTOCK"
                    => items.Where(x => x.StockStatus == "OUT_OF_STOCK"),

                "TRACKED"
                    => items.Where(x => x.StockStatus != "NOT_TRACKED"),

                "NOT_TRACKED" or "UNTRACKED"
                    => items.Where(x => x.StockStatus == "NOT_TRACKED"),

                _ => items
            };
        }

        private static IEnumerable<ArticleResponseDto> ApplySort(
            IEnumerable<ArticleResponseDto> items,
            string? sortBy,
            string? sortDirection)
        {
            var normalizedSortBy = (sortBy ?? "designation").Trim().ToLowerInvariant();
            var desc = string.Equals(sortDirection?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);

            return (normalizedSortBy, desc) switch
            {
                ("price", false) => items.OrderBy(x => x.AR_PrixVen)
                                         .ThenBy(x => x.AR_Design)
                                         .ThenBy(x => x.AR_Ref),

                ("price", true) => items.OrderByDescending(x => x.AR_PrixVen)
                                        .ThenBy(x => x.AR_Design)
                                        .ThenBy(x => x.AR_Ref),

                ("stock", false) => items.OrderBy(x => x.AvailableStock)
                                         .ThenBy(x => x.AR_Design)
                                         .ThenBy(x => x.AR_Ref),

                ("stock", true) => items.OrderByDescending(x => x.AvailableStock)
                                        .ThenBy(x => x.AR_Design)
                                        .ThenBy(x => x.AR_Ref),

                ("ref", false) => items.OrderBy(x => x.AR_Ref),

                ("ref", true) => items.OrderByDescending(x => x.AR_Ref),

                ("designation", true) => items.OrderByDescending(x => x.AR_Design)
                                              .ThenBy(x => x.AR_Ref),

                _ => items.OrderBy(x => x.AR_Design)
                          .ThenBy(x => x.AR_Ref)
            };
        }

        private static ArticleResponseDto MapArticleRow(ArticleQueryRow row, decimal effectiveThreshold)
        {
            var suiviStock = row.AR_SuiviStock ?? 0;
            var hasTrackedStock = suiviStock == 1 || row.HasStockRows;
            var availableStock = hasTrackedStock ? (row.AvailableStock ?? 0m) : 0m;

            var stockStatus = !hasTrackedStock
                ? "NOT_TRACKED"
                : availableStock <= 0m
                    ? "OUT_OF_STOCK"
                    : availableStock <= effectiveThreshold
                        ? "LOW_STOCK"
                        : "IN_STOCK";

            return new ArticleResponseDto
            {
                CbMarq = row.CbMarq ?? 0,
                AR_Ref = (row.AR_Ref ?? string.Empty).Trim(),
                AR_Design = (row.AR_Design ?? string.Empty).Trim(),
                AR_Description = string.IsNullOrWhiteSpace(row.AR_Description) ? null : row.AR_Description.Trim(),
                FA_CodeFamille = (row.FA_CodeFamille ?? string.Empty).Trim(),
                AR_UniteVen = row.AR_UniteVen ?? 0,
                AR_PrixVen = row.AR_PrixVen ?? 0m,
                AR_PrixTTC = row.AR_PrixTTC ?? 0,
                AR_SuiviStock = suiviStock,
                AR_Sommeil = row.AR_Sommeil ?? 0,
                AR_Image = string.IsNullOrWhiteSpace(row.AR_Image) ? null : row.AR_Image.Trim(),
                AR_CodeBarre = (row.AR_CodeBarre ?? string.Empty).Trim(),
                AR_Publie = row.AR_Publie ?? 0,
                CL_No1 = row.CL_No1 ?? 0,
                CL_No2 = row.CL_No2 ?? 0,
                CL_No3 = row.CL_No3 ?? 0,
                CL_No4 = row.CL_No4 ?? 0,
                AR_Type = row.AR_Type ?? 0,
                AvailableStock = availableStock,
                StockStatus = stockStatus,
                IsOutOfStock = stockStatus == "OUT_OF_STOCK",
                IsLowStock = stockStatus == "LOW_STOCK",
                IsInStock = stockStatus == "IN_STOCK"
            };
        }

        private IQueryable<ArticleSafeRow> BuildSafeArticlesQuery()
        {
            return _db.F_ARTICLES
                .AsNoTracking()
                .Select(a => new ArticleSafeRow
                {
                    CbMarq = EF.Property<int?>(a, nameof(F_ARTICLE.cbMarq)) ?? 0,
                    AR_Ref = (EF.Property<string?>(a, nameof(F_ARTICLE.AR_Ref)) ?? string.Empty).Trim(),
                    AR_Design = (EF.Property<string?>(a, nameof(F_ARTICLE.AR_Design)) ?? string.Empty).Trim(),
                    AR_Description = EF.Property<string?>(a, nameof(F_ARTICLE.AR_Description)),
                    FA_CodeFamille = (EF.Property<string?>(a, nameof(F_ARTICLE.FA_CodeFamille)) ?? string.Empty).Trim(),
                    AR_UniteVen = EF.Property<short?>(a, nameof(F_ARTICLE.AR_UniteVen)) ?? (short)0,
                    AR_PrixVen = EF.Property<decimal?>(a, nameof(F_ARTICLE.AR_PrixVen)) ?? 0m,
                    AR_PrixTTC = EF.Property<short?>(a, nameof(F_ARTICLE.AR_PrixTTC)) ?? (short)0,
                    AR_SuiviStock = EF.Property<short?>(a, nameof(F_ARTICLE.AR_SuiviStock)) ?? (short)0,
                    AR_Sommeil = EF.Property<short?>(a, nameof(F_ARTICLE.AR_Sommeil)) ?? (short)0,
                    AR_CodeBarre = (EF.Property<string?>(a, nameof(F_ARTICLE.AR_CodeBarre)) ?? string.Empty).Trim(),
                    AR_Publie = EF.Property<short?>(a, nameof(F_ARTICLE.AR_Publie)) ?? (short)0,
                    CL_No1 = EF.Property<int?>(a, nameof(F_ARTICLE.CL_No1)) ?? 0,
                    CL_No2 = EF.Property<int?>(a, nameof(F_ARTICLE.CL_No2)) ?? 0,
                    CL_No3 = EF.Property<int?>(a, nameof(F_ARTICLE.CL_No3)) ?? 0,
                    CL_No4 = EF.Property<int?>(a, nameof(F_ARTICLE.CL_No4)) ?? 0,
                    AR_Type = EF.Property<short?>(a, nameof(F_ARTICLE.AR_Type)) ?? (short)0
                });
        }

        private IQueryable<StockSafeRow> BuildSafeStocksQuery()
        {
            return _db.F_ARTSTOCKS
                .AsNoTracking()
                .Select(x => new StockSafeRow
                {
                    AR_Ref = (EF.Property<string?>(x, nameof(F_ARTSTOCK.AR_Ref)) ?? string.Empty).Trim(),
                    DE_No = EF.Property<int?>(x, nameof(F_ARTSTOCK.DE_No)) ?? 0,
                    AS_QteSto = EF.Property<decimal?>(x, nameof(F_ARTSTOCK.AS_QteSto)) ?? 0m,
                    AS_QteRes = EF.Property<decimal?>(x, nameof(F_ARTSTOCK.AS_QteRes)) ?? 0m
                });
        }

        private IQueryable<ArticleImageSafeRow> BuildSafeArticleImagesQuery()
        {
            return _db.F_ARTICLE_IMAGES
                .AsNoTracking()
                .Select(x => new ArticleImageSafeRow
                {
                    Id = EF.Property<int?>(x, nameof(F_ARTICLE_IMAGE.Id)) ?? int.MaxValue,
                    AR_Ref = (EF.Property<string?>(x, nameof(F_ARTICLE_IMAGE.AR_Ref)) ?? string.Empty).Trim(),
                    Url = (EF.Property<string?>(x, nameof(F_ARTICLE_IMAGE.Url)) ?? string.Empty).Trim(),
                    IsMain = EF.Property<bool?>(x, nameof(F_ARTICLE_IMAGE.IsMain)) ?? false,
                    SortOrder = EF.Property<int?>(x, nameof(F_ARTICLE_IMAGE.SortOrder)) ?? int.MaxValue
                });
        }

        private static string NormalizeArticleRefForComparison(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            return new string(value.Where(c => !char.IsWhiteSpace(c)).ToArray())
                .Trim()
                .ToUpperInvariant();
        }

        private sealed class ArticleQueryRow
        {
            public int? CbMarq { get; set; }
            public string? AR_Ref { get; set; }
            public string? AR_Design { get; set; }
            public string? AR_Description { get; set; }
            public string? FA_CodeFamille { get; set; }
            public short? AR_UniteVen { get; set; }
            public decimal? AR_PrixVen { get; set; }
            public short? AR_PrixTTC { get; set; }
            public short? AR_SuiviStock { get; set; }
            public short? AR_Sommeil { get; set; }
            public string? AR_Image { get; set; }
            public string? AR_CodeBarre { get; set; }
            public short? AR_Publie { get; set; }
            public int? CL_No1 { get; set; }
            public int? CL_No2 { get; set; }
            public int? CL_No3 { get; set; }
            public int? CL_No4 { get; set; }
            public short? AR_Type { get; set; }
            public bool HasStockRows { get; set; }
            public decimal? AvailableStock { get; set; }
        }

        private sealed class ArticleSafeRow
        {
            public int CbMarq { get; set; }
            public string AR_Ref { get; set; } = string.Empty;
            public string AR_Design { get; set; } = string.Empty;
            public string? AR_Description { get; set; }
            public string FA_CodeFamille { get; set; } = string.Empty;
            public short AR_UniteVen { get; set; }
            public decimal AR_PrixVen { get; set; }
            public short AR_PrixTTC { get; set; }
            public short AR_SuiviStock { get; set; }
            public short AR_Sommeil { get; set; }
            public string AR_CodeBarre { get; set; } = string.Empty;
            public short AR_Publie { get; set; }
            public int CL_No1 { get; set; }
            public int CL_No2 { get; set; }
            public int CL_No3 { get; set; }
            public int CL_No4 { get; set; }
            public short AR_Type { get; set; }
        }

        private sealed class StockSafeRow
        {
            public string AR_Ref { get; set; } = string.Empty;
            public int DE_No { get; set; }
            public decimal AS_QteSto { get; set; }
            public decimal AS_QteRes { get; set; }
        }

        private sealed class StockAggregateRow
        {
            public string? AR_Ref { get; set; }
            public decimal? AvailableStock { get; set; }
        }

        private sealed class ArticleImageSafeRow
        {
            public int Id { get; set; }
            public string AR_Ref { get; set; } = string.Empty;
            public string Url { get; set; } = string.Empty;
            public bool IsMain { get; set; }
            public int SortOrder { get; set; }
        }

        private sealed class ArticleImageJoinRow
        {
            public string? AR_Ref { get; set; }
            public string? Url { get; set; }
        }
    }
}
