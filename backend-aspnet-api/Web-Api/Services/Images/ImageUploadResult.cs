namespace Web_Api.Services.Images
{
    public sealed class ImageUploadResult
    {
        public string Url { get; init; } = "";
        public string PublicId { get; init; } = "";
        public string Format { get; init; } = "";
        public int? Width { get; init; }
        public int? Height { get; init; }
        public long? Bytes { get; init; }
    }
}