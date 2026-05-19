using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Web_Api.DTO.Articles
{
    public class ArticleImageAdminResponseDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = "";
        public bool IsMain { get; set; }
        public int SortOrder { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class CreateArticleImageRequestDto
    {
        [Required]
        [MaxLength(500)]
        public string Url { get; set; } = "";

        public bool IsMain { get; set; }

        public int SortOrder { get; set; }
    }

    public class UpdateArticleImageRequestDto
    {
        [Required]
        [MaxLength(500)]
        public string Url { get; set; } = "";

        public bool IsMain { get; set; }

        public int SortOrder { get; set; }
    }

    public class UploadArticleImageRequestDto
    {
        [Required]
        public IFormFile? File { get; set; }

        public bool IsMain { get; set; }

        public int SortOrder { get; set; }
    }
}