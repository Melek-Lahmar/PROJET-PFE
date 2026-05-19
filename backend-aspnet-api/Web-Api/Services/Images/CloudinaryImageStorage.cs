using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using Web_Api.Options;

namespace Web_Api.Services.Images
{
    public class CloudinaryImageStorage : IImageStorage
    {
        private readonly Cloudinary _cloudinary;
        private readonly CloudinaryOptions _options;
        private readonly ILogger<CloudinaryImageStorage> _logger;
        private readonly HashSet<string> _allowedMimeTypes;

        public CloudinaryImageStorage(
            IOptions<CloudinaryOptions> options,
            ILogger<CloudinaryImageStorage> logger)
        {
            _options = options.Value;
            _logger = logger;
            _allowedMimeTypes = new HashSet<string>(
                _options.AllowedMimeTypes ?? Array.Empty<string>(),
                StringComparer.OrdinalIgnoreCase);

            if (string.IsNullOrWhiteSpace(_options.CloudName) ||
                string.IsNullOrWhiteSpace(_options.ApiKey) ||
                string.IsNullOrWhiteSpace(_options.ApiSecret))
            {
                throw new InvalidOperationException(
                    "La configuration Cloudinary est incomplète. Renseigne Cloudinary:CloudName, Cloudinary:ApiKey et Cloudinary:ApiSecret.");
            }

            var account = new Account(_options.CloudName, _options.ApiKey, _options.ApiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<ImageUploadResult> UploadImageAsync(ImageUploadRequest request, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            ValidateRequest(request);

            if (request.FileStream.CanSeek)
                request.FileStream.Position = 0;

            try
            {
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(request.FileName, request.FileStream),
                    Folder = NormalizeFolder(request.Folder),
                    PublicId = string.IsNullOrWhiteSpace(request.PublicId) ? null : request.PublicId.Trim(),
                    Overwrite = request.Overwrite,
                    UniqueFilename = !request.Overwrite,
                    UseFilename = true
                };

                var result = await _cloudinary.UploadAsync(uploadParams);

                if (result.Error != null)
                {
                    _logger.LogError("Cloudinary upload error: {Message}", result.Error.Message);
                    throw new ImageStorageException($"Échec de l'upload Cloudinary: {result.Error.Message}");
                }

                var url = result.SecureUrl?.ToString();
                if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(result.PublicId))
                {
                    throw new ImageStorageException("Cloudinary a répondu sans URL sécurisée ou sans public_id.");
                }

                return new ImageUploadResult
                {
                    Url = url,
                    PublicId = result.PublicId,
                    Format = result.Format ?? "",
                    Width = result.Width,
                    Height = result.Height,
                    Bytes = result.Bytes
                };
            }
            catch (ImageValidationException)
            {
                throw;
            }
            catch (ImageStorageException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur inattendue pendant l'upload Cloudinary.");
                throw new ImageStorageException("Erreur inattendue pendant l'upload Cloudinary.", ex);
            }
        }

        public async Task DeleteImageAsync(string publicId, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                throw new ImageValidationException("Le public_id Cloudinary est obligatoire pour la suppression.");

            try
            {
                var result = await _cloudinary.DestroyAsync(new DeletionParams(publicId.Trim()));

                if (result.Error != null)
                {
                    _logger.LogError("Cloudinary delete error: {Message}", result.Error.Message);
                    throw new ImageStorageException($"Échec de la suppression Cloudinary: {result.Error.Message}");
                }
            }
            catch (ImageValidationException)
            {
                throw;
            }
            catch (ImageStorageException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur inattendue pendant la suppression Cloudinary du public_id {PublicId}.", publicId);
                throw new ImageStorageException("Erreur inattendue pendant la suppression Cloudinary.", ex);
            }
        }

        private void ValidateRequest(ImageUploadRequest request)
        {
            if (request.FileStream == null)
                throw new ImageValidationException("Le flux fichier est obligatoire.");

            if (string.IsNullOrWhiteSpace(request.FileName))
                throw new ImageValidationException("Le nom du fichier est obligatoire.");

            if (string.IsNullOrWhiteSpace(request.ContentType))
                throw new ImageValidationException("Le type MIME du fichier est obligatoire.");

            if (!_allowedMimeTypes.Contains(request.ContentType.Trim()))
                throw new ImageValidationException($"Type de fichier non autorisé: {request.ContentType}.");

            if (request.Length <= 0)
                throw new ImageValidationException("Le fichier image est vide.");

            if (_options.MaxFileSizeBytes > 0 && request.Length > _options.MaxFileSizeBytes)
            {
                throw new ImageValidationException(
                    $"La taille du fichier dépasse la limite autorisée de {_options.MaxFileSizeBytes} octets.");
            }
        }

        private static string NormalizeFolder(string folder)
        {
            if (string.IsNullOrWhiteSpace(folder))
                return string.Empty;

            return folder.Trim().Trim('/');
        }
    }
}