using System.Text.Json.Serialization;
using System.Text.Json.Serialization;
namespace Web_Api.DTO.Homepage
{
    public static class HomepageSectionIds
    {
        public const string Hero = "hero";
        public const string FeaturedProducts = "featuredProducts";
        public const string FeaturedCatalogues = "featuredCatalogues";
        public const string Audiences = "audiences";
        public const string Advantages = "advantages";
        public const string Stats = "stats";
        public const string FinalCta = "finalCta";

        public static readonly string[] All =
        {
            Hero,
            FeaturedProducts,
            FeaturedCatalogues,
            Audiences,
            Advantages,
            Stats,
            FinalCta
        };
    }

    public class HomepageContentDto
    {
        public string? PageTitle { get; set; }
        public string? PageSubtitle { get; set; }
        public List<string> SectionOrder { get; set; } = HomepageSectionIds.All.ToList();
        public HomepageHeroSectionDto Hero { get; set; } = new();
        public HomepageFeaturedProductsSectionDto FeaturedProducts { get; set; } = new();
        public HomepageFeaturedCataloguesSectionDto FeaturedCatalogues { get; set; } = new();
        public HomepageAudiencesSectionDto Audiences { get; set; } = new();
        public HomepageAdvantagesSectionDto Advantages { get; set; } = new();
        public HomepageStatsSectionDto Stats { get; set; } = new();
        public HomepageFinalCtaSectionDto FinalCta { get; set; } = new();
    }

    public abstract class HomepageSectionBaseDto
    {
        public bool Enabled { get; set; } = true;
        public string? Title { get; set; }
        public string? Subtitle { get; set; }
        public string? Description { get; set; }
    }

    public class HomepageHeroSectionDto : HomepageSectionBaseDto
    {
        public string? BadgeText { get; set; }
        public string? ImageUrl { get; set; }
        public string? PrimaryCtaText { get; set; }
        public string? PrimaryCtaHref { get; set; }
        public string? SecondaryCtaText { get; set; }
        public string? SecondaryCtaHref { get; set; }
        public string? ReassuranceText { get; set; }
    }

    public class HomepageFeaturedProductsSectionDto : HomepageSectionBaseDto
    {
        public List<string> ArticleRefs { get; set; } = new();
        public string? ViewAllHref { get; set; }
        public string? EmptyMessage { get; set; }
    }

    public class HomepageFeaturedCataloguesSectionDto : HomepageSectionBaseDto
    {
        public List<int> CatalogueNos { get; set; } = new();
        public string? ViewAllHref { get; set; }
    }

    public class HomepageAudienceCardDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? CtaText { get; set; }
        public string? CtaHref { get; set; }
        public string? BadgeText { get; set; }
    }

    public class HomepageAudiencesSectionDto : HomepageSectionBaseDto
    {
        [JsonPropertyName("b2b")]
        public HomepageAudienceCardDto B2B { get; set; } = new();

        [JsonPropertyName("b2c")]
        public HomepageAudienceCardDto B2C { get; set; } = new();
    }

    public class HomepageAdvantageItemDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Icon { get; set; }
    }

    public class HomepageAdvantagesSectionDto : HomepageSectionBaseDto
    {
        public List<HomepageAdvantageItemDto> Items { get; set; } = new();
    }

    public class HomepageStatItemDto
    {
        public string? Value { get; set; }
        public string? Label { get; set; }
        public string? HelpText { get; set; }
    }

    public class HomepageStatsSectionDto : HomepageSectionBaseDto
    {
        public List<HomepageStatItemDto> Items { get; set; } = new();
    }

    public class HomepageFinalCtaSectionDto : HomepageSectionBaseDto
    {
        public string? BackgroundImageUrl { get; set; }
        public string? PrimaryCtaText { get; set; }
        public string? PrimaryCtaHref { get; set; }
        public string? SecondaryCtaText { get; set; }
        public string? SecondaryCtaHref { get; set; }
    }

    public class HomepageResolvedArticleDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal PriceTtc { get; set; }
        public decimal AvailableStock { get; set; }
        public string StockStatus { get; set; } = "OUT_OF_STOCK";
        public string? ImageUrl { get; set; }
        public short IsPublished { get; set; }
        public short IsSleeping { get; set; }
    }

    public class HomepageResolvedCatalogueDto
    {
        public int CatalogueNo { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public short Level { get; set; }
        public int ParentNo { get; set; }
    }

    public class HomepageViewDto
    {
        public bool IsPublished { get; set; }
        public DateTime? PublishedAt { get; set; }
        public HomepageContentDto Content { get; set; } = new();
        public List<HomepageResolvedArticleDto> FeaturedProducts { get; set; } = new();
        public List<HomepageResolvedCatalogueDto> FeaturedCatalogues { get; set; } = new();
    }

    public class HomepageAdminDocumentDto
    {
        public HomepageContentDto Draft { get; set; } = new();
        public HomepageContentDto? Published { get; set; }
        public bool HasPublishedVersion { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
    }

    public class SaveHomepageDraftRequestDto
    {
        public HomepageContentDto Content { get; set; } = new();
    }
}