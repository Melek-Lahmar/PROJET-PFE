using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.DTO.Articles;
using Web_Api.Model;
using Web_Api.Options;
using Web_Api.Services.Images;

namespace Web_Api.Controllers.Articles
{
    [ApiController]
    public class ArticleImagesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IImageStorage _imageStorage;
        private readonly CloudinaryOptions _cloudinaryOptions;

        public ArticleImagesController(
            AppDbContext db,
            IImageStorage imageStorage,
            IOptions<CloudinaryOptions> cloudinaryOptions)
        {
            _db = db;
            _imageStorage = imageStorage;
            _cloudinaryOptions = cloudinaryOptions.Value;
        }

        [HttpGet("api/articles/{arRef}/images")]
        public async Task<IActionResult> GetUrls(string arRef, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                return BadRequest(new { message = "arRef est obligatoire." });

            var normalizedRef = arRef.Trim();

            var urls = await _db.F_ARTICLE_IMAGES
                .AsNoTracking()
                .Where(x => (x.AR_Ref ?? string.Empty).Trim() == normalizedRef)
                .OrderByDescending(x => x.IsMain ?? false)
                .ThenBy(x => x.SortOrder ?? 0)
                .ThenBy(x => x.Id)
                .Select(x => x.Url)
                .Where(u => u != null && u != "")
                .ToListAsync(ct);

            return Ok(urls);
        }

        public class MainImagesRequest
        {
            public List<string> ArRefs { get; set; } = new();
        }

        [HttpPost("api/articles/images/main")]
        public async Task<IActionResult> GetMainImages([FromBody] MainImagesRequest req, CancellationToken ct)
        {
            if (req?.ArRefs == null || req.ArRefs.Count == 0)
                return BadRequest(new { message = "ArRefs est obligatoire." });

            var refs = req.ArRefs
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(200)
                .ToList();

            var rows = await _db.F_ARTICLE_IMAGES
                .AsNoTracking()
                .Where(x => refs.Contains((x.AR_Ref ?? string.Empty).Trim()) && x.Url != null && x.Url != "")
                .Select(x => new
                {
                    AR_Ref = (x.AR_Ref ?? string.Empty).Trim(),
                    x.Url,
                    IsMain = (x.IsMain ?? false),
                    SortOrder = (x.SortOrder ?? 0),
                    x.Id
                })
                .ToListAsync(ct);

            var map = rows
                .GroupBy(x => x.AR_Ref, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.IsMain)
                          .ThenBy(x => x.SortOrder)
                          .ThenBy(x => x.Id)
                          .Select(x => x.Url!)
                          .FirstOrDefault(),
                    StringComparer.OrdinalIgnoreCase
                );

            return Ok(map);
        }

        [HttpGet("api/admin/articles/{arRef}/images")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> GetAdminImages(string arRef, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                return BadRequest(new { message = "arRef est obligatoire." });

            var normalizedRef = arRef.Trim();

            var items = await _db.F_ARTICLE_IMAGES
                .AsNoTracking()
                .Where(x => (x.AR_Ref ?? string.Empty).Trim() == normalizedRef)
                .OrderByDescending(x => x.IsMain ?? false)
                .ThenBy(x => x.SortOrder ?? 0)
                .ThenBy(x => x.Id)
                .Select(x => new ArticleImageAdminResponseDto
                {
                    Id = x.Id ?? 0,
                    Url = x.Url ?? "",
                    IsMain = x.IsMain ?? false,
                    SortOrder = x.SortOrder ?? 0,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        [HttpPost("api/articles/{arRef}/images")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> Create(string arRef, [FromBody] CreateArticleImageRequestDto dto, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                return BadRequest(new { message = "arRef est obligatoire." });

            if (dto == null || string.IsNullOrWhiteSpace(dto.Url))
                return BadRequest(new { message = "Url est obligatoire." });

            var normalizedRef = arRef.Trim();
            var normalizedUrl = dto.Url.Trim();

            var articleExists = await _db.F_ARTICLES
                .AsNoTracking()
                .AnyAsync(x => (x.AR_Ref ?? string.Empty).Trim() == normalizedRef, ct);

            if (!articleExists)
                return NotFound(new { message = $"Article introuvable: {normalizedRef}" });

            var entity = new F_ARTICLE_IMAGE
            {
                AR_Ref = normalizedRef,
                Url = normalizedUrl,
                IsMain = dto.IsMain,
                SortOrder = dto.SortOrder < 0 ? 0 : dto.SortOrder,
                CreatedAt = DateTime.UtcNow
            };

            _db.F_ARTICLE_IMAGES.Add(entity);
            await _db.SaveChangesAsync(ct);

            await NormalizeMainImageAsync(normalizedRef, dto.IsMain ? entity.Id : null, ct);
            await _db.SaveChangesAsync(ct);

            return Ok(new ArticleImageAdminResponseDto
            {
                Id = entity.Id ?? 0,
                Url = entity.Url ?? "",
                IsMain = entity.IsMain ?? false,
                SortOrder = entity.SortOrder ?? 0,
                CreatedAt = entity.CreatedAt
            });
        }

        [HttpPost("api/admin/articles/{arRef}/images/upload")]
        [Authorize(Roles = AppRoles.ADMIN)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Upload(
            string arRef,
            [FromForm] UploadArticleImageRequestDto dto,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                return BadRequest(new { message = "arRef est obligatoire." });

            if (dto?.File == null)
                return BadRequest(new { message = "Le fichier image est obligatoire." });

            if (dto.File.Length <= 0)
                return BadRequest(new { message = "Le fichier image est vide." });

            var normalizedRef = arRef.Trim();

            var articleExists = await _db.F_ARTICLES
                .AsNoTracking()
                .AnyAsync(x => (x.AR_Ref ?? string.Empty).Trim() == normalizedRef, ct);

            if (!articleExists)
                return NotFound(new { message = $"Article introuvable: {normalizedRef}" });

            try
            {
                await using var stream = dto.File.OpenReadStream();

                var uploadResult = await _imageStorage.UploadImageAsync(new ImageUploadRequest
                {
                    FileStream = stream,
                    FileName = dto.File.FileName,
                    ContentType = dto.File.ContentType,
                    Length = dto.File.Length,
                    Folder = _cloudinaryOptions.ArticleImagesFolder,
                    PublicId = BuildArticleImagePublicId(normalizedRef),
                    Overwrite = false
                }, ct);

                var entity = new F_ARTICLE_IMAGE
                {
                    AR_Ref = normalizedRef,
                    Url = uploadResult.Url,
                    CloudinaryPublicId = uploadResult.PublicId,
                    IsMain = dto.IsMain,
                    SortOrder = dto.SortOrder < 0 ? 0 : dto.SortOrder,
                    CreatedAt = DateTime.UtcNow
                };

                _db.F_ARTICLE_IMAGES.Add(entity);
                await _db.SaveChangesAsync(ct);

                await NormalizeMainImageAsync(normalizedRef, dto.IsMain ? entity.Id : null, ct);
                await _db.SaveChangesAsync(ct);

                return Ok(new ArticleImageAdminResponseDto
                {
                    Id = entity.Id ?? 0,
                    Url = entity.Url ?? "",
                    IsMain = entity.IsMain ?? false,
                    SortOrder = entity.SortOrder ?? 0,
                    CreatedAt = entity.CreatedAt
                });
            }
            catch (ImageValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ImageStorageException ex)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = ex.Message
                });
            }
        }

        [HttpPut("api/articles/images/{id:int}")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateArticleImageRequestDto dto, CancellationToken ct)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Url))
                return BadRequest(new { message = "Url est obligatoire." });

            var entity = await _db.F_ARTICLE_IMAGES.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity == null)
                return NotFound(new { message = $"Image introuvable: {id}" });

            entity.Url = dto.Url.Trim();
            entity.IsMain = dto.IsMain;
            entity.SortOrder = dto.SortOrder < 0 ? 0 : dto.SortOrder;

            await _db.SaveChangesAsync(ct);

            await NormalizeMainImageAsync((entity.AR_Ref ?? string.Empty).Trim(), dto.IsMain ? entity.Id : null, ct);
            await _db.SaveChangesAsync(ct);

            return Ok(new ArticleImageAdminResponseDto
            {
                Id = entity.Id ?? 0,
                Url = entity.Url ?? "",
                IsMain = entity.IsMain ?? false,
                SortOrder = entity.SortOrder ?? 0,
                CreatedAt = entity.CreatedAt
            });
        }

        [HttpDelete("api/articles/images/{id:int}")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var entity = await _db.F_ARTICLE_IMAGES.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity == null)
                return NotFound(new { message = $"Image introuvable: {id}" });

            var arRef = (entity.AR_Ref ?? string.Empty).Trim();

            _db.F_ARTICLE_IMAGES.Remove(entity);
            await _db.SaveChangesAsync(ct);

            await NormalizeMainImageAsync(arRef, null, ct);
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        private async Task NormalizeMainImageAsync(string arRef, int? preferredImageId, CancellationToken ct)
        {
            var normalizedRef = arRef.Trim();

            var rows = await _db.F_ARTICLE_IMAGES
                .Where(x => (x.AR_Ref ?? string.Empty).Trim() == normalizedRef)
                .ToListAsync(ct);

            if (rows.Count == 0)
                return;

            F_ARTICLE_IMAGE? main = null;

            if (preferredImageId.HasValue)
                main = rows.FirstOrDefault(x => x.Id == preferredImageId.Value);

            main ??= rows
                .Where(x => x.IsMain == true)
                .OrderBy(x => x.SortOrder ?? 0)
                .ThenBy(x => x.Id ?? int.MaxValue)
                .FirstOrDefault();

            main ??= rows
                .OrderBy(x => x.SortOrder ?? 0)
                .ThenBy(x => x.Id ?? int.MaxValue)
                .FirstOrDefault();

            if (main == null)
                return;

            var mainId = main.Id;

            foreach (var row in rows)
                row.IsMain = row.Id == mainId;
        }

        private static string BuildArticleImagePublicId(string arRef)
        {
            var safeRef = new string(
                (arRef ?? string.Empty)
                    .Trim()
                    .Select(ch => char.IsLetterOrDigit(ch) || ch == '-' || ch == '_' ? ch : '-')
                    .ToArray());

            if (string.IsNullOrWhiteSpace(safeRef))
                safeRef = "article";

            return $"{safeRef}-{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}";
        }
    }
}