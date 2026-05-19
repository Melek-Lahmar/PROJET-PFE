using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Admin;
using Web_Api.Services.Admin;

namespace Web_Api.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/orders")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminOrdersController : ControllerBase
    {
        private readonly AdminOrdersService _service;

        public AdminOrdersController(AdminOrdersService service)
        {
            _service = service;
        }

        /// <summary>
        /// Liste paginée des commandes avec KPIs globaux.
        /// Filtres : période, gouvernorat, statut commande/livraison, recherche.
        /// Tri : date_desc (défaut), date_asc, amount_desc.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<AdminOrdersPageDto>> GetPage(
            [FromQuery] AdminOrdersQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetPageAsync(query, ct);
            return Ok(result);
        }

        /// <summary>
        /// Détail d'une commande pour le drawer admin :
        /// entête, lignes article, livraison + livreur affecté.
        /// </summary>
        [HttpGet("{piece}")]
        public async Task<ActionResult<AdminOrdersDetailDto>> GetDetail(
            string piece, CancellationToken ct)
        {
            var result = await _service.GetDetailAsync(piece, ct);
            if (result == null) return NotFound(new { message = "Commande introuvable." });
            return Ok(result);
        }
    }
}
