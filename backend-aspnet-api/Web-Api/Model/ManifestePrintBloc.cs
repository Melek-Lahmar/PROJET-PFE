using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("ManifestePrintBlocs")]
    public class ManifestePrintBloc
    {
        [Key]
        public int Id { get; set; }

        public DateTime PrintedAt { get; set; }

        public Guid PrintedByUserId { get; set; }

        public int DepotNo { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal TotalAmount { get; set; }

        public int BLCount { get; set; }

        public ICollection<ManifestePrintBlocLine> Lines { get; set; } = new List<ManifestePrintBlocLine>();
    }

    [Table("ManifestePrintBlocLines")]
    public class ManifestePrintBlocLine
    {
        [Key]
        public int Id { get; set; }

        public int BlocId { get; set; }

        [MaxLength(13)]
        public string BLPiece { get; set; } = string.Empty;

        [MaxLength(17)]
        public string? ClientCode { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal Amount { get; set; }

        [MaxLength(300)]
        public string? ClientAddress { get; set; }

        [MaxLength(100)]
        public string? ClientCity { get; set; }

        [MaxLength(20)]
        public string? ClientPhone { get; set; }

        public ManifestePrintBloc? Bloc { get; set; }
    }
}
