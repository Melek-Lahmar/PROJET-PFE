using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Favorites;
using Web_Api.Model;

namespace Web_Api.Services.Favorites
{
    public class ClientFavoritesService
    {
        private const decimal DefaultLowStockThreshold = 5m;

        private readonly AppDbContext _db;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;

        public ClientFavoritesService(
            AppDbContext db,
            IHttpContextAccessor httpContextAccessor,
            UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _httpContextAccessor = httpContextAccessor;
            _userManager = userManager;
        }

        public async Task<IReadOnlyList<FavoriteArticleDto>> ListAsync(CancellationToken ct)
        {
            var userId = await ResolveClientUserIdAsync(ct);

            var favorites = await _db.F_CLIENT_FAVORIS
                .AsNoTracking()
                .Where(x => x.ClientUserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);

            if (favorites.Count == 0)
                return Array.Empty<FavoriteArticleDto>();

            var refs = favorites.Select(x => x.AR_Ref).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var articleRows = await BuildFavoriteArticleRowsAsync(refs, ct);
            var rowsByRef = articleRows.ToDictionary(x => NormalizeKey(x.ArRef), x => x);

            return favorites
                .Select(f => rowsByRef.TryGetValue(NormalizeKey(f.AR_Ref), out var row) ? Map(row, f.CreatedAt) : null)
                .Where(x => x != null)
                .Cast<FavoriteArticleDto>()
                .ToList();
        }

        public async Task<FavoriteCountDto> CountAsync(CancellationToken ct)
        {
            var userId = await ResolveClientUserIdAsync(ct);
            var count = await _db.F_CLIENT_FAVORIS.CountAsync(x => x.ClientUserId == userId, ct);
            return new FavoriteCountDto { Count = count };
        }

        public async Task<FavoriteExistsDto> ExistsAsync(string arRef, CancellationToken ct)
        {
            var userId = await ResolveClientUserIdAsync(ct);
            var normalizedRef = NormalizeArticleRef(arRef);
            var exists = await _db.F_CLIENT_FAVORIS
                .AsNoTracking()
                .AnyAsync(x => x.ClientUserId == userId && x.AR_Ref == normalizedRef, ct);

            return new FavoriteExistsDto
            {
                ArRef = normalizedRef,
                IsFavorite = exists
            };
        }

        public async Task<FavoriteActionResultDto> AddAsync(string arRef, CancellationToken ct)
        {
            var userId = await ResolveClientUserIdAsync(ct);
            var normalizedRef = NormalizeArticleRef(arRef);
            await EnsurePublicArticleExistsAsync(normalizedRef, ct);

            var exists = await _db.F_CLIENT_FAVORIS
                .AnyAsync(x => x.ClientUserId == userId && x.AR_Ref == normalizedRef, ct);

            if (exists)
            {
                return new FavoriteActionResultDto
                {
                    ArRef = normalizedRef,
                    IsFavorite = true,
                    Message = "Article déjà présent dans vos favoris."
                };
            }

            _db.F_CLIENT_FAVORIS.Add(new F_CLIENT_FAVORI
            {
                ClientUserId = userId,
                AR_Ref = normalizedRef,
                CreatedAt = DateTime.UtcNow
            });

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                var nowExists = await _db.F_CLIENT_FAVORIS
                    .AsNoTracking()
                    .AnyAsync(x => x.ClientUserId == userId && x.AR_Ref == normalizedRef, ct);

                if (!nowExists)
                    throw;
            }

            return new FavoriteActionResultDto
            {
                ArRef = normalizedRef,
                IsFavorite = true,
                Message = "Article ajouté aux favoris."
            };
        }

        public async Task<FavoriteActionResultDto> RemoveAsync(string arRef, CancellationToken ct)
        {
            var userId = await ResolveClientUserIdAsync(ct);
            var normalizedRef = NormalizeArticleRef(arRef);

            var entity = await _db.F_CLIENT_FAVORIS
                .FirstOrDefaultAsync(x => x.ClientUserId == userId && x.AR_Ref == normalizedRef, ct);

            if (entity == null)
            {
                return new FavoriteActionResultDto
                {
                    ArRef = normalizedRef,
                    IsFavorite = false,
                    Message = "Article absent de vos favoris."
                };
            }

            _db.F_CLIENT_FAVORIS.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return new FavoriteActionResultDto
            {
                ArRef = normalizedRef,
                IsFavorite = false,
                Message = "Article retiré des favoris."
            };
        }

        public async Task<FavoriteActionResultDto> ToggleAsync(string arRef, CancellationToken ct)
        {
            var userId = await ResolveClientUserIdAsync(ct);
            var normalizedRef = NormalizeArticleRef(arRef);
            await EnsurePublicArticleExistsAsync(normalizedRef, ct);

            var entity = await _db.F_CLIENT_FAVORIS
                .FirstOrDefaultAsync(x => x.ClientUserId == userId && x.AR_Ref == normalizedRef, ct);

            if (entity != null)
            {
                _db.F_CLIENT_FAVORIS.Remove(entity);
                await _db.SaveChangesAsync(ct);

                return new FavoriteActionResultDto
                {
                    ArRef = normalizedRef,
                    IsFavorite = false,
                    Message = "Article retiré des favoris."
                };
            }

            return await AddAsync(normalizedRef, ct);
        }

        private async Task<Guid> ResolveClientUserIdAsync(CancellationToken ct)
        {
            var principal = _httpContextAccessor.HttpContext?.User;
            var raw = principal?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(raw, out var userId))
                throw new UnauthorizedAccessException("Utilisateur non authentifié.");

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("Utilisateur introuvable.");

            if (!await _userManager.IsInRoleAsync(user, AppRoles.CLIENT))
                throw new InvalidOperationException("Accès réservé aux clients.");

            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);

            if (profile == null)
                throw new KeyNotFoundException("Profil client introuvable.");

            if (profile.TypeProfil != TypeProfil.Client)
                throw new InvalidOperationException("Profil client requis.");

            if (profile.TypeClient is not (TypeClient.B2C or TypeClient.B2B))
                throw new InvalidOperationException("Type client B2C ou B2B requis.");

            return userId;
        }

        private async Task EnsurePublicArticleExistsAsync(string arRef, CancellationToken ct)
        {
            var exists = await _db.F_ARTICLES
                .AsNoTracking()
                .AnyAsync(x => x.AR_Ref == arRef && x.AR_Publie == 1 && x.AR_Sommeil == 0, ct);

            if (!exists)
                throw new KeyNotFoundException($"Article introuvable ou indisponible: {arRef}");
        }

        private async Task<List<FavoriteArticleRow>> BuildFavoriteArticleRowsAsync(IReadOnlyCollection<string> refs, CancellationToken ct)
        {
            var articles = await _db.F_ARTICLES
                .AsNoTracking()
                .Where(x => refs.Contains(x.AR_Ref) && x.AR_Publie == 1 && x.AR_Sommeil == 0)
                .Select(x => new
                {
                    x.AR_Ref,
                    x.AR_Design,
                    x.FA_CodeFamille,
                    x.AR_PrixVen,
                    x.AR_SuiviStock
                })
                .ToListAsync(ct);

            var stocks = await _db.F_ARTSTOCKS
                .AsNoTracking()
                .Where(x => refs.Contains(x.AR_Ref))
                .GroupBy(x => x.AR_Ref)
                .Select(g => new
                {
                    ArRef = g.Key,
                    AvailableStock = g.Sum(x => x.AS_QteSto - x.AS_QteRes)
                })
                .ToListAsync(ct);

            var images = await _db.F_ARTICLE_IMAGES
                .AsNoTracking()
                .Where(x => refs.Contains(x.AR_Ref) && x.Url != null && x.Url != "")
                .Select(x => new
                {
                    x.AR_Ref,
                    x.Url,
                    x.IsMain,
                    x.SortOrder,
                    x.Id
                })
                .ToListAsync(ct);

            var stocksByRef = stocks.ToDictionary(x => NormalizeKey(x.ArRef), x => x.AvailableStock);
            var imagesByRef = images
                .GroupBy(x => NormalizeKey(x.AR_Ref))
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.IsMain == true)
                        .ThenBy(x => x.SortOrder ?? int.MaxValue)
                        .ThenBy(x => x.Id ?? int.MaxValue)
                        .Select(x => x.Url)
                        .FirstOrDefault());

            return articles
                .Select(x => new FavoriteArticleRow
                {
                    ArRef = x.AR_Ref.Trim(),
                    Designation = x.AR_Design.Trim(),
                    Family = string.IsNullOrWhiteSpace(x.FA_CodeFamille) ? null : x.FA_CodeFamille.Trim(),
                    Price = x.AR_PrixVen,
                    Image = imagesByRef.TryGetValue(NormalizeKey(x.AR_Ref), out var image) ? image : null,
                    AvailableStock = stocksByRef.TryGetValue(NormalizeKey(x.AR_Ref), out var stock) ? stock : 0m,
                    HasTrackedStock = x.AR_SuiviStock == 1 || stocksByRef.ContainsKey(NormalizeKey(x.AR_Ref))
                })
                .ToList();
        }

        private static FavoriteArticleDto Map(FavoriteArticleRow row, DateTime addedAt)
        {
            var stockStatus = !row.HasTrackedStock
                ? "NOT_TRACKED"
                : row.AvailableStock <= 0m
                    ? "OUT_OF_STOCK"
                    : row.AvailableStock <= DefaultLowStockThreshold
                        ? "LOW_STOCK"
                        : "IN_STOCK";

            return new FavoriteArticleDto
            {
                ArRef = row.ArRef,
                Designation = row.Designation,
                Family = row.Family,
                Price = row.Price,
                Image = string.IsNullOrWhiteSpace(row.Image) ? null : row.Image.Trim(),
                AvailableStock = row.AvailableStock,
                StockStatus = stockStatus,
                IsOutOfStock = stockStatus == "OUT_OF_STOCK",
                IsLowStock = stockStatus == "LOW_STOCK",
                IsInStock = stockStatus == "IN_STOCK",
                AddedAt = addedAt
            };
        }

        private static string NormalizeArticleRef(string arRef)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                throw new ArgumentException("Référence article obligatoire.", nameof(arRef));

            var normalized = arRef.Trim();
            if (normalized.Length > 50)
                throw new ArgumentException("Référence article trop longue.", nameof(arRef));

            return normalized;
        }

        private static string NormalizeKey(string? value)
        {
            return (value ?? string.Empty).Trim().ToUpperInvariant();
        }

        private sealed class FavoriteArticleRow
        {
            public string ArRef { get; set; } = string.Empty;
            public string Designation { get; set; } = string.Empty;
            public string? Family { get; set; }
            public decimal Price { get; set; }
            public string? Image { get; set; }
            public decimal AvailableStock { get; set; }
            public bool HasTrackedStock { get; set; }
        }
    }
}
