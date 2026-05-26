using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;

namespace Web_Api.Services.Reclamations
{
    public class ReclamationPhotoStorageService
    {
        private static readonly string[] AllowedContentTypes =
        {
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"
        };

        private static readonly HashSet<string> AllowedExtensions =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"
            };

        private static readonly Dictionary<string, string> ExtToMime =
            new(StringComparer.OrdinalIgnoreCase)
            {
                { ".jpg",  "image/jpeg" },
                { ".jpeg", "image/jpeg" },
                { ".png",  "image/png"  },
                { ".webp", "image/webp" },
                { ".heic", "image/heic" },
                { ".heif", "image/heif" },
            };

        private readonly IWebHostEnvironment _env;
        private const long MaxFileSize = 10 * 1024 * 1024;

        public ReclamationPhotoStorageService(IWebHostEnvironment env)
        {
            _env = env;
        }

        public class StoredPhoto
        {
            public string RelativeUrl { get; set; } = string.Empty;
            public string OriginalFileName { get; set; } = string.Empty;
            public string ContentType { get; set; } = string.Empty;
            public long Size { get; set; }
        }

        public async Task<StoredPhoto> StoreAsync(int reclamationId, IFormFile file, CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("Fichier manquant.");

            if (file.Length > MaxFileSize)
                throw new InvalidOperationException("Fichier trop volumineux (max 10 Mo).");

            var contentType = (file.ContentType ?? string.Empty).ToLowerInvariant();
            // iOS image_picker peut envoyer application/octet-stream pour HEIC/HEIF.
            // Dans ce cas, on accepte si l'extension du fichier est une image connue.
            if (contentType == "application/octet-stream")
            {
                var ext2 = Path.GetExtension(file.FileName ?? string.Empty);
                if (ExtToMime.TryGetValue(ext2, out var mapped))
                    contentType = mapped;
            }
            if (!AllowedContentTypes.Contains(contentType))
                throw new InvalidOperationException("Format d'image non supporté.");

            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
            {
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
            }

            var folder = Path.Combine(webRoot, "uploads", "reclamations", reclamationId.ToString());
            Directory.CreateDirectory(folder);

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(folder, safeName);

            using (var stream = File.Create(fullPath))
            {
                await file.CopyToAsync(stream, ct);
            }

            var relative = $"/uploads/reclamations/{reclamationId}/{safeName}";

            return new StoredPhoto
            {
                RelativeUrl = relative,
                OriginalFileName = file.FileName ?? safeName,
                ContentType = contentType,
                Size = file.Length
            };
        }

        public void DeletePhysical(string relativeUrl)
        {
            if (string.IsNullOrWhiteSpace(relativeUrl)) return;

            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");

            var localPath = Path.Combine(webRoot, relativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(localPath))
            {
                try { File.Delete(localPath); } catch { /* best effort */ }
            }
        }
    }
}
