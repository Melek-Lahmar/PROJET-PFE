using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.Services.Favorites;

namespace Web_Api.Controllers.Client
{
    [ApiController]
    [Route("api/client/favorites")]
    [Authorize(Roles = AppRoles.CLIENT)]
    public class ClientFavoritesController : ControllerBase
    {
        private readonly ClientFavoritesService _favorites;

        public ClientFavoritesController(ClientFavoritesService favorites)
        {
            _favorites = favorites;
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            return Ok(await _favorites.ListAsync(ct));
        }

        [HttpGet("count")]
        public async Task<IActionResult> Count(CancellationToken ct)
        {
            return Ok(await _favorites.CountAsync(ct));
        }

        [HttpGet("{arRef}/exists")]
        public async Task<IActionResult> Exists(string arRef, CancellationToken ct)
        {
            return Ok(await _favorites.ExistsAsync(arRef, ct));
        }

        [HttpPost("{arRef}")]
        public async Task<IActionResult> Add(string arRef, CancellationToken ct)
        {
            return Ok(await _favorites.AddAsync(arRef, ct));
        }

        [HttpDelete("{arRef}")]
        public async Task<IActionResult> Remove(string arRef, CancellationToken ct)
        {
            return Ok(await _favorites.RemoveAsync(arRef, ct));
        }

        [HttpPost("{arRef}/toggle")]
        public async Task<IActionResult> Toggle(string arRef, CancellationToken ct)
        {
            return Ok(await _favorites.ToggleAsync(arRef, ct));
        }
    }
}
