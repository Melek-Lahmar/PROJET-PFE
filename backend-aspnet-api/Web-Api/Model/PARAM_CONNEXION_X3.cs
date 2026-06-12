using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("PARAM_CONNEXION_X3")]
    public class PARAM_CONNEXION_X3
    {
        [Key]
        public int Id { get; set; } = 1;

        public short Http { get; set; } = 0;

        [Required]
        [StringLength(100)]
        public string AdresseIP_X3 { get; set; } = "localhost:8124";

        [Required]
        [StringLength(100)]
        public string Login { get; set; } = "admin";
        

        [Required]
        [StringLength(100)]
        public string Password { get; set; } = "@Zerty1234";

        [Required]
        [StringLength(50)]
        public string Dossier { get; set; } = "SEED";

        [Required]
        [StringLength(50)]
        public string Service_Web_BC { get; set; } = "SOH";

        [Required]
        [StringLength(50)]
        public string Type_BC { get; set; } = "WEB";
    }
}
