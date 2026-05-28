using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DEVIS_EVENT")]
    public class F_DEVIS_EVENT
    {
        public const string TYPE_COMMENT = "COMMENT";
        public const string TYPE_STATUS_CHANGE = "STATUS_CHANGE";
        public const string TYPE_REQUEST_INFO = "REQUEST_INFO";
        public const string TYPE_CLIENT_REPLY = "CLIENT_REPLY";
        public const string TYPE_PRICE_UPDATED = "PRICE_UPDATED";
        public const string TYPE_SENT_TO_CLIENT = "SENT_TO_CLIENT";
        public const string TYPE_ACCEPTED = "ACCEPTED";
        public const string TYPE_REJECTED = "REJECTED";
        public const string TYPE_CONVERTED_TO_BC = "CONVERTED_TO_BC";
        public const string TYPE_CANCELLED = "CANCELLED";

        public int Id { get; set; }

        public int DevisId { get; set; }

        public F_DEVIS_ENTETE? Devis { get; set; }

        public Guid? AuthorUserId { get; set; }

        [StringLength(30)]
        public string? AuthorRole { get; set; }

        [StringLength(30)]
        public string EventType { get; set; } = TYPE_COMMENT;

        [StringLength(30)]
        public string? OldStatus { get; set; }

        [StringLength(30)]
        public string? NewStatus { get; set; }

        [StringLength(2000)]
        public string? Message { get; set; }

        public bool IsPublic { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
