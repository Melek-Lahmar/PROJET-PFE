using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.Services.Images;
using Web_Api.Services.Print;

namespace Web_Api.Controllers.Print
{
    [ApiController]
    [Route("api/admin/print-settings")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class PrintSettingsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly BlPdfService _pdf;
        private readonly IImageStorage _images;

        public PrintSettingsController(AppDbContext db, BlPdfService pdf, IImageStorage images)
        {
            _db = db;
            _pdf = pdf;
            _images = images;
        }

        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            var s = await _pdf.GetSettingsAsync(ct);
            PrintFieldsConfig cfg;
            try { cfg = JsonSerializer.Deserialize<PrintFieldsConfig>(s.FieldsConfig) ?? new(); }
            catch { cfg = new PrintFieldsConfig(); }

            return Ok(new
            {
                s.Id,
                s.CompanyName,
                s.CompanyAddress,
                s.CompanyPhone,
                s.CompanyEmail,
                s.MatriculeFiscal,
                s.RegistreCommerce,
                s.LogoUrl,
                s.FooterText,
                s.UpdatedAt,
                FieldsConfig = cfg
            });
        }

        [HttpPut]
        public async Task<IActionResult> Save([FromBody] PrintSettingsUpdateDto dto, CancellationToken ct)
        {
            var existing = await _db.PrintSettings.FirstOrDefaultAsync(x => x.Id == 1, ct);

            if (existing == null)
            {
                existing = new PrintSettings { Id = 1 };
                _db.PrintSettings.Add(existing);
            }

            existing.CompanyName = dto.CompanyName;
            existing.CompanyAddress = dto.CompanyAddress;
            existing.CompanyPhone = dto.CompanyPhone;
            existing.CompanyEmail = dto.CompanyEmail;
            existing.MatriculeFiscal = dto.MatriculeFiscal;
            existing.RegistreCommerce = dto.RegistreCommerce;
            existing.FooterText = dto.FooterText;
            existing.FieldsConfig = JsonSerializer.Serialize(dto.FieldsConfig ?? new PrintFieldsConfig());
            existing.UpdatedAt = DateTime.UtcNow;

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userId, out var uid))
                existing.UpdatedByUserId = uid;

            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "Paramètres d'impression sauvegardés." });
        }

        [HttpPost("logo")]
        public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken ct)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Fichier manquant." });

            const long MaxLogoSize = 2 * 1024 * 1024; // 2 Mo
            if (file.Length > MaxLogoSize)
                return BadRequest(new { message = "Le logo ne doit pas dépasser 2 Mo." });

            var allowed = new[] { "image/png", "image/jpeg", "image/svg+xml", "image/webp" };
            if (!allowed.Contains(file.ContentType.ToLower()))
                return BadRequest(new { message = "Format non supporté. Utilisez PNG, JPG ou SVG." });

            using var stream = file.OpenReadStream();
            var result = await _images.UploadImageAsync(new ImageUploadRequest
            {
                FileStream = stream,
                FileName = file.FileName,
                ContentType = file.ContentType,
                Length = file.Length,
                Folder = "print-settings"
            }, ct);
            var url = result.Url;

            var existing = await _db.PrintSettings.FirstOrDefaultAsync(x => x.Id == 1, ct);
            if (existing == null)
            {
                existing = new PrintSettings { Id = 1 };
                _db.PrintSettings.Add(existing);
            }

            existing.LogoUrl = url;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(new { logoUrl = url });
        }

        [HttpGet("preview")]
        public async Task<IActionResult> Preview(CancellationToken ct)
        {
            var settings = await _pdf.GetSettingsAsync(ct);
            var cfg = await _pdf.GetFieldsConfigAsync(ct);
            var logoBytes = await _pdf.FetchLogoBytesAsync(settings, ct);

            var sampleBl = new DTO.BL.BonLivraisonResponseDto
            {
                Piece = "BL-PREVIEW",
                Date = DateTime.Now,
                SourceBcPiece = "BC-PREVIEW",
                ClientCode = "CL001",
                DepotNo = 1,
                Status = "CONFIRME",
                TotalHT = 450.000m,
                TotalTTC = 531.000m,
                FraisLivraison = 5.000m,
                TimbreFiscal = 0.600m,
                NetAPayer = 536.600m,
                Address = "Rue Habib Bourguiba",
                City = "Sfax",
                ClientPhone = "20123456",
                Lines = new()
                {
                    new() { ArticleRef = "ART001", Designation = "Article exemple A", Qty = 2, UnitPrice = 100m, AmountHT = 200m, AmountTTC = 236m },
                    new() { ArticleRef = "ART002", Designation = "Article exemple B", Qty = 1, UnitPrice = 250m, AmountHT = 250m, AmountTTC = 295m },
                }
            };

            var bytes = _pdf.GenerateBLPdf(sampleBl, settings, cfg, logoBytes: logoBytes);
            return File(bytes, "application/pdf", "preview-bl.pdf");
        }
    }

    public class PrintSettingsUpdateDto
    {
        public string? CompanyName { get; set; }
        public string? CompanyAddress { get; set; }
        public string? CompanyPhone { get; set; }
        public string? CompanyEmail { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? RegistreCommerce { get; set; }
        public string? FooterText { get; set; }
        public PrintFieldsConfig? FieldsConfig { get; set; }
    }
}
