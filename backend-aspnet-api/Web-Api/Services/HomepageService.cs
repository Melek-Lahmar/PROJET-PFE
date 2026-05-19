using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.Homepage;
using Web_Api.Model;

namespace Web_Api.Services
{
    public class HomepageService
    {
        private const string SingletonScope = "DEFAULT";
        private readonly AppDbContext _db;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };

        public HomepageService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<HomepageAdminDocumentDto> GetAdminDocumentAsync(CancellationToken ct)
        {
            var entity = await GetOrCreateEntityAsync(ct);
            var draft = Deserialize(entity.DraftJson);
            var published = string.IsNullOrWhiteSpace(entity.PublishedJson)
                ? null
                : Deserialize(entity.PublishedJson!);

            return new HomepageAdminDocumentDto
            {
                Draft = draft,
                Published = published,
                HasPublishedVersion = published != null,
                UpdatedAt = entity.UpdatedAt,
                PublishedAt = entity.PublishedAt
            };
        }

        public async Task<HomepageViewDto> GetPublicViewAsync(CancellationToken ct)
        {
            var entity = await GetOrCreateEntityAsync(ct);

            if (string.IsNullOrWhiteSpace(entity.PublishedJson))
            {
                return await BuildViewAsync(
                    HomepageContentDtoFactory.CreateDefault(),
                    false,
                    entity.PublishedAt,
                    ct
                );
            }

            return await BuildViewAsync(
                Deserialize(entity.PublishedJson!),
                true,
                entity.PublishedAt,
                ct
            );
        }

        public async Task<HomepageViewDto> GetDraftPreviewAsync(CancellationToken ct)
        {
            var entity = await GetOrCreateEntityAsync(ct);
            var draft = Deserialize(entity.DraftJson);

            return await BuildViewAsync(draft, false, entity.PublishedAt, ct);
        }

        public async Task<HomepageAdminDocumentDto> SaveDraftAsync(
            HomepageContentDto content,
            Guid? userId,
            CancellationToken ct)
        {
            var normalized = await NormalizeAndValidateAsync(content, ct);
            var entity = await GetOrCreateEntityAsync(ct);

            entity.DraftJson = Serialize(normalized);
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedByUserId = userId;

            await _db.SaveChangesAsync(ct);

            return await GetAdminDocumentAsync(ct);
        }

        public async Task<HomepageAdminDocumentDto> PublishAsync(Guid? userId, CancellationToken ct)
        {
            var entity = await GetOrCreateEntityAsync(ct);
            var draft = await NormalizeAndValidateAsync(Deserialize(entity.DraftJson), ct);

            entity.DraftJson = Serialize(draft);
            entity.PublishedJson = entity.DraftJson;
            entity.PublishedAt = DateTime.UtcNow;
            entity.PublishedByUserId = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await GetAdminDocumentAsync(ct);
        }

        private async Task<HomepageContentDto> NormalizeAndValidateAsync(
            HomepageContentDto? input,
            CancellationToken ct)
        {
            var content = input ?? HomepageContentDtoFactory.CreateDefault();
            var normalized = HomepageContentDtoFactory.CreateDefault();

            normalized.PageTitle = TrimOrNull(content.PageTitle, 140);
            normalized.PageSubtitle = TrimOrNull(content.PageSubtitle, 500);
            normalized.SectionOrder = NormalizeSectionOrder(content.SectionOrder);

            normalized.Hero = new HomepageHeroSectionDto
            {
                Enabled = content.Hero?.Enabled ?? true,
                Title = TrimOrNull(content.Hero?.Title, 160),
                Subtitle = TrimOrNull(content.Hero?.Subtitle, 220),
                Description = TrimOrNull(content.Hero?.Description, 1200),
                BadgeText = TrimOrNull(content.Hero?.BadgeText, 80),
                ImageUrl = TrimOrNull(content.Hero?.ImageUrl, 1000),
                PrimaryCtaText = TrimOrNull(content.Hero?.PrimaryCtaText, 80),
                PrimaryCtaHref = NormalizeHref(content.Hero?.PrimaryCtaHref),
                SecondaryCtaText = TrimOrNull(content.Hero?.SecondaryCtaText, 80),
                SecondaryCtaHref = NormalizeHref(content.Hero?.SecondaryCtaHref),
                ReassuranceText = TrimOrNull(content.Hero?.ReassuranceText, 220)
            };

            normalized.FeaturedProducts = new HomepageFeaturedProductsSectionDto
            {
                Enabled = content.FeaturedProducts?.Enabled ?? true,
                Title = TrimOrNull(content.FeaturedProducts?.Title, 160),
                Subtitle = TrimOrNull(content.FeaturedProducts?.Subtitle, 220),
                Description = TrimOrNull(content.FeaturedProducts?.Description, 1200),
                ViewAllHref = NormalizeHref(content.FeaturedProducts?.ViewAllHref) ?? "/articles",
                EmptyMessage = TrimOrNull(content.FeaturedProducts?.EmptyMessage, 220),
                ArticleRefs = NormalizeArticleRefs(content.FeaturedProducts?.ArticleRefs)
            };

            normalized.FeaturedCatalogues = new HomepageFeaturedCataloguesSectionDto
            {
                Enabled = content.FeaturedCatalogues?.Enabled ?? true,
                Title = TrimOrNull(content.FeaturedCatalogues?.Title, 160),
                Subtitle = TrimOrNull(content.FeaturedCatalogues?.Subtitle, 220),
                Description = TrimOrNull(content.FeaturedCatalogues?.Description, 1200),
                ViewAllHref = NormalizeHref(content.FeaturedCatalogues?.ViewAllHref) ?? "/articles",
                CatalogueNos = NormalizeCatalogueNos(content.FeaturedCatalogues?.CatalogueNos)
            };

            normalized.Audiences = new HomepageAudiencesSectionDto
            {
                Enabled = content.Audiences?.Enabled ?? true,
                Title = TrimOrNull(content.Audiences?.Title, 160),
                Subtitle = TrimOrNull(content.Audiences?.Subtitle, 220),
                Description = TrimOrNull(content.Audiences?.Description, 1200),
                B2B = NormalizeAudienceCard(content.Audiences?.B2B),
                B2C = NormalizeAudienceCard(content.Audiences?.B2C)
            };

            normalized.Advantages = new HomepageAdvantagesSectionDto
            {
                Enabled = content.Advantages?.Enabled ?? true,
                Title = TrimOrNull(content.Advantages?.Title, 160),
                Subtitle = TrimOrNull(content.Advantages?.Subtitle, 220),
                Description = TrimOrNull(content.Advantages?.Description, 1200),
                Items = (content.Advantages?.Items ?? new List<HomepageAdvantageItemDto>())
                    .Select(NormalizeAdvantage)
                    .Where(x => !string.IsNullOrWhiteSpace(x.Title) || !string.IsNullOrWhiteSpace(x.Description))
                    .Take(8)
                    .ToList()
            };

            normalized.Stats = new HomepageStatsSectionDto
            {
                Enabled = content.Stats?.Enabled ?? true,
                Title = TrimOrNull(content.Stats?.Title, 160),
                Subtitle = TrimOrNull(content.Stats?.Subtitle, 220),
                Description = TrimOrNull(content.Stats?.Description, 1200),
                Items = (content.Stats?.Items ?? new List<HomepageStatItemDto>())
                    .Select(NormalizeStat)
                    .Where(x => !string.IsNullOrWhiteSpace(x.Value) || !string.IsNullOrWhiteSpace(x.Label))
                    .Take(8)
                    .ToList()
            };

            normalized.FinalCta = new HomepageFinalCtaSectionDto
            {
                Enabled = content.FinalCta?.Enabled ?? true,
                Title = TrimOrNull(content.FinalCta?.Title, 160),
                Subtitle = TrimOrNull(content.FinalCta?.Subtitle, 220),
                Description = TrimOrNull(content.FinalCta?.Description, 1200),
                BackgroundImageUrl = TrimOrNull(content.FinalCta?.BackgroundImageUrl, 1000),
                PrimaryCtaText = TrimOrNull(content.FinalCta?.PrimaryCtaText, 80),
                PrimaryCtaHref = NormalizeHref(content.FinalCta?.PrimaryCtaHref),
                SecondaryCtaText = TrimOrNull(content.FinalCta?.SecondaryCtaText, 80),
                SecondaryCtaHref = NormalizeHref(content.FinalCta?.SecondaryCtaHref)
            };

            await ValidateReferencedArticlesAsync(normalized.FeaturedProducts.ArticleRefs, ct);
            await ValidateReferencedCataloguesAsync(normalized.FeaturedCatalogues.CatalogueNos, ct);

            return normalized;
        }

        private async Task ValidateReferencedArticlesAsync(List<string> refs, CancellationToken ct)
        {
            if (refs.Count == 0) return;

            var existing = await _db.F_ARTICLES
                .AsNoTracking()
                .Where(x => refs.Contains((x.AR_Ref ?? string.Empty).Trim()))
                .Select(x => (x.AR_Ref ?? string.Empty).Trim())
                .ToListAsync(ct);

            var missing = refs
                .Where(r => !existing.Contains(r, StringComparer.OrdinalIgnoreCase))
                .ToList();

            if (missing.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Références article introuvables: {string.Join(", ", missing)}");
            }
        }

        private async Task ValidateReferencedCataloguesAsync(List<int> catalogueNos, CancellationToken ct)
        {
            if (catalogueNos.Count == 0) return;

            var existing = await _db.F_CATALOGUES
                .AsNoTracking()
                .Where(x => catalogueNos.Contains(x.CL_No))
                .Select(x => x.CL_No)
                .ToListAsync(ct);

            var missing = catalogueNos.Where(no => !existing.Contains(no)).ToList();

            if (missing.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Catalogues introuvables: {string.Join(", ", missing)}");
            }
        }

        private async Task<HomepageViewDto> BuildViewAsync(
            HomepageContentDto content,
            bool isPublished,
            DateTime? publishedAt,
            CancellationToken ct)
        {
            var featuredProducts = await ResolveFeaturedProductsAsync(content.FeaturedProducts.ArticleRefs, ct);
            var featuredCatalogues = await ResolveFeaturedCataloguesAsync(content.FeaturedCatalogues.CatalogueNos, ct);

            return new HomepageViewDto
            {
                IsPublished = isPublished,
                PublishedAt = publishedAt,
                Content = content,
                FeaturedProducts = featuredProducts,
                FeaturedCatalogues = featuredCatalogues
            };
        }

        private async Task<List<HomepageResolvedArticleDto>> ResolveFeaturedProductsAsync(
            List<string> refs,
            CancellationToken ct)
        {
            if (refs.Count == 0) return new List<HomepageResolvedArticleDto>();

            var articles = await _db.F_ARTICLES
                .AsNoTracking()
                .Where(x => refs.Contains((x.AR_Ref ?? string.Empty).Trim()))
                .Select(x => new
                {
                    Ref = (x.AR_Ref ?? string.Empty).Trim(),
                    x.AR_Design,
                    x.AR_PrixVen,
                    x.AR_PrixTTC,
                    x.AR_Publie,
                    x.AR_Sommeil,
                    x.AR_SuiviStock
                })
                .ToListAsync(ct);

            var images = await _db.F_ARTICLE_IMAGES
                .AsNoTracking()
                .Where(x => refs.Contains((x.AR_Ref ?? string.Empty).Trim()) && !string.IsNullOrWhiteSpace(x.Url))
                .Select(x => new
                {
                    Ref = (x.AR_Ref ?? string.Empty).Trim(),
                    x.Url,
                    IsMain = x.IsMain ?? false,
                    SortOrder = x.SortOrder ?? int.MaxValue,
                    Id = x.Id ?? int.MaxValue
                })
                .ToListAsync(ct);

            var stocks = await _db.F_ARTSTOCKS
                .AsNoTracking()
                .Where(x => refs.Contains((x.AR_Ref ?? string.Empty).Trim()))
                .GroupBy(x => (x.AR_Ref ?? string.Empty).Trim())
                .Select(g => new
                {
                    Ref = g.Key,
                    Available = g.Sum(x => x.AS_QteSto - x.AS_QteRes)
                })
                .ToListAsync(ct);

            var stockMap = stocks.ToDictionary(
                x => x.Ref,
                x => x.Available,
                StringComparer.OrdinalIgnoreCase);

            var imageMap = images
                .GroupBy(x => x.Ref, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.IsMain)
                          .ThenBy(x => x.SortOrder)
                          .ThenBy(x => x.Id)
                          .Select(x => x.Url)
                          .FirstOrDefault(),
                    StringComparer.OrdinalIgnoreCase);

            var articleMap = articles.ToDictionary(
                x => x.Ref,
                StringComparer.OrdinalIgnoreCase);

            var list = new List<HomepageResolvedArticleDto>();

            foreach (var itemRef in refs)
            {
                if (!articleMap.TryGetValue(itemRef, out var article))
                    continue;

                var available = stockMap.TryGetValue(itemRef, out var stock)
                    ? stock
                    : 0m;

                var tracked = article.AR_SuiviStock == 1 || stockMap.ContainsKey(itemRef);

                var stockStatus = !tracked
                    ? "NOT_TRACKED"
                    : available <= 0m
                        ? "OUT_OF_STOCK"
                        : available <= 5m
                            ? "LOW_STOCK"
                            : "IN_STOCK";

                list.Add(new HomepageResolvedArticleDto
                {
                    ArticleRef = article.Ref,
                    Designation = article.AR_Design ?? string.Empty,
                    Price = article.AR_PrixVen,
                    PriceTtc = article.AR_PrixTTC,
                    AvailableStock = tracked ? available : 0m,
                    StockStatus = stockStatus,
                    ImageUrl = imageMap.TryGetValue(itemRef, out var image) ? image : null,
                    IsPublished = article.AR_Publie,
                    IsSleeping = article.AR_Sommeil
                });
            }

            return list;
        }

        private async Task<List<HomepageResolvedCatalogueDto>> ResolveFeaturedCataloguesAsync(
            List<int> catalogueNos,
            CancellationToken ct)
        {
            if (catalogueNos.Count == 0) return new List<HomepageResolvedCatalogueDto>();

            var items = await _db.F_CATALOGUES
                .AsNoTracking()
                .Where(x => catalogueNos.Contains(x.CL_No))
                .Select(x => new HomepageResolvedCatalogueDto
                {
                    CatalogueNo = x.CL_No,
                    Code = x.CL_Code,
                    Title = x.CL_Intitule,
                    Level = x.CL_Niveau,
                    ParentNo = x.CL_NoParent
                })
                .ToListAsync(ct);

            var map = items.ToDictionary(x => x.CatalogueNo);

            return catalogueNos
                .Where(map.ContainsKey)
                .Select(no => map[no])
                .ToList();
        }

        private async Task<CMS_HOMEPAGE> GetOrCreateEntityAsync(CancellationToken ct)
        {
            var entity = await _db.HOMEPAGES
                .FirstOrDefaultAsync(x => x.Scope == SingletonScope, ct);

            if (entity != null) return entity;

            entity = new CMS_HOMEPAGE
            {
                Scope = SingletonScope,
                DraftJson = Serialize(HomepageContentDtoFactory.CreateDefault()),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.HOMEPAGES.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity;
        }

        private string Serialize(HomepageContentDto content)
            => JsonSerializer.Serialize(content, _jsonOptions);

        private HomepageContentDto Deserialize(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return HomepageContentDtoFactory.CreateDefault();

            try
            {
                return JsonSerializer.Deserialize<HomepageContentDto>(json, _jsonOptions)
                       ?? HomepageContentDtoFactory.CreateDefault();
            }
            catch
            {
                return HomepageContentDtoFactory.CreateDefault();
            }
        }

        private static List<string> NormalizeSectionOrder(List<string>? order)
        {
            var normalized = (order ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Where(x => HomepageSectionIds.All.Contains(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var sectionId in HomepageSectionIds.All)
            {
                if (!normalized.Contains(sectionId, StringComparer.OrdinalIgnoreCase))
                {
                    normalized.Add(sectionId);
                }
            }

            return normalized;
        }

        private static HomepageAudienceCardDto NormalizeAudienceCard(HomepageAudienceCardDto? card)
        {
            return new HomepageAudienceCardDto
            {
                Title = TrimOrNull(card?.Title, 120),
                Description = TrimOrNull(card?.Description, 1000),
                BadgeText = TrimOrNull(card?.BadgeText, 60),
                CtaText = TrimOrNull(card?.CtaText, 80),
                CtaHref = NormalizeHref(card?.CtaHref)
            };
        }

        private static HomepageAdvantageItemDto NormalizeAdvantage(HomepageAdvantageItemDto item)
        {
            return new HomepageAdvantageItemDto
            {
                Title = TrimOrNull(item.Title, 120),
                Description = TrimOrNull(item.Description, 500),
                Icon = TrimOrNull(item.Icon, 8)
            };
        }

        private static HomepageStatItemDto NormalizeStat(HomepageStatItemDto item)
        {
            return new HomepageStatItemDto
            {
                Value = TrimOrNull(item.Value, 40),
                Label = TrimOrNull(item.Label, 120),
                HelpText = TrimOrNull(item.HelpText, 220)
            };
        }

        private static List<string> NormalizeArticleRefs(List<string>? refs)
        {
            return (refs ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(12)
                .ToList();
        }

        private static List<int> NormalizeCatalogueNos(List<int>? catalogueNos)
        {
            return (catalogueNos ?? new List<int>())
                .Where(x => x > 0)
                .Distinct()
                .Take(12)
                .ToList();
        }

        private static string? TrimOrNull(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            var trimmed = value.Trim();
            return trimmed.Length <= maxLength
                ? trimmed
                : trimmed[..maxLength].Trim();
        }

        private static string? NormalizeHref(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            var trimmed = value.Trim();

            if (trimmed.StartsWith("/", StringComparison.Ordinal))
                return trimmed;

            if (Uri.TryCreate(trimmed, UriKind.Absolute, out _))
                return trimmed;

            return null;
        }

        private static class HomepageContentDtoFactory
        {
            public static HomepageContentDto CreateDefault()
            {
                return new HomepageContentDto
                {
                    PageTitle = "Plateforme e-commerce connectée à Sage X3",
                    PageSubtitle = "Une vitrine pilotable par l’administration, compatible avec le catalogue, les images article et les flux B2B/B2C existants.",
                    SectionOrder = HomepageSectionIds.All.ToList(),
                    Hero = new HomepageHeroSectionDto
                    {
                        Enabled = true,
                        Title = "Commandez plus vite, avec des données ERP fiables.",
                        Subtitle = "Catalogue, stocks, clients et documents commerciaux alignés avec Sage X3.",
                        Description = "Configurez cette homepage depuis l’administration sans dupliquer les articles ni casser les parcours existants.",
                        BadgeText = "PFE • Sage X3",
                        PrimaryCtaText = "Voir les articles",
                        PrimaryCtaHref = "/articles",
                        SecondaryCtaText = "Nous contacter",
                        SecondaryCtaHref = "/contact",
                        ReassuranceText = "Catalogue synchronisé • Parcours B2B/B2C • Architecture maintenable"
                    },
                    FeaturedProducts = new HomepageFeaturedProductsSectionDto
                    {
                        Enabled = true,
                        Title = "Produits mis en avant",
                        Subtitle = "Sélectionnés depuis le catalogue existant",
                        Description = "Choisissez des références réelles déjà présentes dans la base locale synchronisée.",
                        ViewAllHref = "/articles",
                        EmptyMessage = "Aucun article mis en avant n’a encore été configuré.",
                        ArticleRefs = new List<string>()
                    },
                    FeaturedCatalogues = new HomepageFeaturedCataloguesSectionDto
                    {
                        Enabled = true,
                        Title = "Univers et catalogues",
                        Subtitle = "Mettez en avant vos familles clés",
                        Description = "Sélectionnez des catalogues existants pour guider rapidement la navigation.",
                        ViewAllHref = "/articles",
                        CatalogueNos = new List<int>()
                    },
                    Audiences = new HomepageAudiencesSectionDto
                    {
                        Enabled = true,
                        Title = "Deux parcours, une plateforme",
                        Subtitle = "B2C et B2B sur la même base métier",
                        Description = "Adaptez vos appels à l’action selon les cibles sans créer de logique parallèle.",
                        B2B = new HomepageAudienceCardDto
                        {
                            Title = "Professionnels / B2B",
                            Description = "Mettez en avant vos conditions, vos remises et vos parcours dédiés aux clients société.",
                            BadgeText = "B2B",
                            CtaText = "Découvrir le catalogue pro",
                            CtaHref = "/articles"
                        },
                        B2C = new HomepageAudienceCardDto
                        {
                            Title = "Particuliers / B2C",
                            Description = "Présentez une expérience claire pour les commandes en ligne et le retrait dépôt.",
                            BadgeText = "B2C",
                            CtaText = "Parcourir les nouveautés",
                            CtaHref = "/articles"
                        }
                    },
                    Advantages = new HomepageAdvantagesSectionDto
                    {
                        Enabled = true,
                        Title = "Pourquoi nous choisir ?",
                        Subtitle = "Des avantages éditables par l’administration",
                        Description = "Cette zone peut être ajustée sans retoucher le catalogue ou le checkout.",
                        Items = new List<HomepageAdvantageItemDto>
                        {
                            new() { Title = "Catalogue synchronisé", Description = "Les références et familles viennent du référentiel existant.", Icon = "📦" },
                            new() { Title = "Stocks visibles", Description = "Les produits mis en avant restent cohérents avec les données disponibles.", Icon = "📊" },
                            new() { Title = "Parcours maintenable", Description = "La homepage reste découplée du tunnel de commande et du workflow confirmateur.", Icon = "🛡️" }
                        }
                    },
                    Stats = new HomepageStatsSectionDto
                    {
                        Enabled = true,
                        Title = "Quelques chiffres",
                        Subtitle = "Version initiale pilotée manuellement",
                        Description = "Les KPI sont éditables dans un premier temps pour éviter tout risque sur les flux critiques.",
                        Items = new List<HomepageStatItemDto>
                        {
                            new() { Value = "+100", Label = "Références synchronisées", HelpText = "À personnaliser depuis l’admin" },
                            new() { Value = "24/7", Label = "Consultation catalogue", HelpText = "Sans accès direct à Sage côté front" },
                            new() { Value = "B2B / B2C", Label = "Parcours supportés", HelpText = "Même socle applicatif" }
                        }
                    },
                    FinalCta = new HomepageFinalCtaSectionDto
                    {
                        Enabled = true,
                        Title = "Prêt à activer votre vitrine ?",
                        Subtitle = "Publiez la homepage et guidez vos utilisateurs vers le catalogue.",
                        Description = "Le contenu public affichera uniquement la version publiée.",
                        PrimaryCtaText = "Accéder au catalogue",
                        PrimaryCtaHref = "/articles",
                        SecondaryCtaText = "Contacter l’équipe",
                        SecondaryCtaHref = "/contact"
                    }
                };
            }
        }
    }
}