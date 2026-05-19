using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Reclamations
{
    public class AssignReclamationRequestDto
    {
        [Required]
        public Guid ConfirmatriceUserId { get; set; }
    }
}
