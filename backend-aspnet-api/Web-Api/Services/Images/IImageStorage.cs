namespace Web_Api.Services.Images
{
    public interface IImageStorage
    {
        Task<ImageUploadResult> UploadImageAsync(ImageUploadRequest request, CancellationToken ct = default);
        Task DeleteImageAsync(string publicId, CancellationToken ct = default);
    }
}