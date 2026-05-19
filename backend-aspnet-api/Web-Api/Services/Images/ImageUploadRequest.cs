namespace Web_Api.Services.Images
{
    public sealed class ImageUploadRequest
    {
        public required Stream FileStream { get; init; }
        public required string FileName { get; init; }
        public required string ContentType { get; init; }
        public long Length { get; init; }
        public string Folder { get; init; } = "";
        public string? PublicId { get; init; }
        public bool Overwrite { get; init; }
    }
}