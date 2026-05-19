using System.ComponentModel.DataAnnotations;

namespace Web_Api.Options
{
    public class CloudinaryOptions
    {
        [MaxLength(200)]
        public string CloudName { get; set; } = "";

        [MaxLength(200)]
        public string ApiKey { get; set; } = "";

        [MaxLength(200)]
        public string ApiSecret { get; set; } = "";

        [MaxLength(200)]
        public string ArticleImagesFolder { get; set; } = "pfe/articles";

        [MaxLength(200)]
        public string HomepageImagesFolder { get; set; } = "pfe/homepage";

        public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

        public string[] AllowedMimeTypes { get; set; } =
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        };
    }
}