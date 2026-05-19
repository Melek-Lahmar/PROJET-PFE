using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;

namespace Web_Api.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminUsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminUsersController(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // POST /api/admin/users
        [HttpPost]
        public async Task<ActionResult<UserAdminResponseDto>> CreateUser([FromBody] CreateUserRequestDto dto)
        {
            var role = dto.Role?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(role) || !AppRoles.All.Contains(role))
                return BadRequest(new { message = "Role invalide." });

            // ✅ validation gouvernorat/délégation
            if (!TunisieDecoupage.IsDelegationValide(dto.Gouvernorat, dto.Delegation))
            {
                ModelState.AddModelError("Delegation", "La délégation ne correspond pas au gouvernorat choisi.");
                return ValidationProblem(ModelState);
            }

            // ✅ create identity user
            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email
            };

            var created = await _userManager.CreateAsync(user, dto.Password);
            if (!created.Succeeded)
                return BadRequest(new { message = "Création user échouée.", errors = created.Errors });

            var roleResult = await _userManager.AddToRoleAsync(user, role);
            if (!roleResult.Succeeded)
                return BadRequest(new { message = "Assign role échoué.", errors = roleResult.Errors });

            // ✅ create profile
            var profile = new ProfilUtilisateur
            {
                UtilisateurId = user.Id,

                TypeProfil = dto.TypeProfil,
                TypeClient = dto.TypeClient,

                NomComplet = dto.NomComplet,
                Telephone = dto.Telephone,

                CIN = dto.CIN,
                DateNaissance = dto.DateNaissance,

                Gouvernorat = dto.Gouvernorat,
                Delegation = TunisieDecoupage.NormalizeDelegation(dto.Delegation),

                NomSociete = dto.NomSociete,
                MatriculeFiscal = dto.MatriculeFiscal,

                Latitude = dto.Latitude,
                Longitude = dto.Longitude,

                DateCreation = DateTime.UtcNow,
                DateModification = DateTime.UtcNow
            };

            _db.ProfilsUtilisateurs.Add(profile);
            await _db.SaveChangesAsync();

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new UserAdminResponseDto
            {
                UserId = user.Id,
                Email = user.Email ?? "",
                Roles = roles.ToList(),
                Profile = profile
            });
        }

        // GET /api/admin/users?role=CLIENT&skip=0&take=20
        [HttpGet]
        public async Task<ActionResult<object>> ListUsers([FromQuery] string? role, [FromQuery] int skip = 0, [FromQuery] int take = 20)
        {
            skip = Math.Max(0, skip);
            take = Math.Clamp(take, 1, 100);

            var query = _db.Users.AsNoTracking();

            var total = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.Id)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            var userIds = users.Select(u => u.Id).ToList();

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId != null && userIds.Contains(p.UtilisateurId.Value))
                .ToListAsync();

            var items = new List<UserAdminResponseDto>();

            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);

                if (!string.IsNullOrWhiteSpace(role))
                {
                    if (!roles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
                        continue;
                }

                var p = profiles.FirstOrDefault(x => x.UtilisateurId == u.Id);

                items.Add(new UserAdminResponseDto
                {
                    UserId = u.Id,
                    Email = u.Email ?? "",
                    Roles = roles.ToList(),
                    Profile = p
                });
            }

            return Ok(new { total, skip, take, items });
        }

        // GET /api/admin/users/{userId}
        [HttpGet("{userId:guid}")]
        public async Task<ActionResult<UserAdminResponseDto>> GetUser([FromRoute] Guid userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return NotFound();

            var roles = await _userManager.GetRolesAsync(user);
            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == userId);

            return Ok(new UserAdminResponseDto
            {
                UserId = user.Id,
                Email = user.Email ?? "",
                Roles = roles.ToList(),
                Profile = profile
            });
        }

        // PUT /api/admin/users/{userId}/roles
        [HttpPut("{userId:guid}/roles")]
        public async Task<IActionResult> ReplaceRoles([FromRoute] Guid userId, [FromBody] string[] roles)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null) return NotFound();

            var normalized = roles
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim().ToUpperInvariant())
                .Distinct()
                .ToArray();

            if (normalized.Any(r => !AppRoles.All.Contains(r)))
                return BadRequest(new { message = "Un ou plusieurs rôles invalides." });

            var current = await _userManager.GetRolesAsync(user);

            var remove = current.Where(r => !normalized.Contains(r)).ToArray();
            if (remove.Length > 0)
                await _userManager.RemoveFromRolesAsync(user, remove);

            var add = normalized.Where(r => !current.Contains(r)).ToArray();
            if (add.Length > 0)
                await _userManager.AddToRolesAsync(user, add);

            return NoContent();
        }

        // PUT /api/admin/users/{userId}/profile
        [HttpPut("{userId:guid}/profile")]
        public async Task<IActionResult> UpdateProfile([FromRoute] Guid userId, [FromBody] UpdateUserProfileDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null) return NotFound();

            // Si le gouvernorat est fourni ET qu'une délégation est fournie,
            // on vérifie la cohérence. Sinon (PATCH partiel) on passe.
            if (dto.Gouvernorat.HasValue
                && !string.IsNullOrWhiteSpace(dto.Delegation)
                && !TunisieDecoupage.IsDelegationValide(dto.Gouvernorat.Value, dto.Delegation))
            {
                ModelState.AddModelError("Delegation", "La délégation ne correspond pas au gouvernorat choisi.");
                return ValidationProblem(ModelState);
            }

            if (!string.IsNullOrWhiteSpace(dto.Email) && !string.Equals(dto.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                user.Email = dto.Email;
                user.UserName = dto.Email;
                var upd = await _userManager.UpdateAsync(user);
                if (!upd.Succeeded)
                    return BadRequest(new { message = "Mise à jour email échouée.", errors = upd.Errors });
            }

            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == userId);
            if (profile == null)
            {
                profile = new ProfilUtilisateur
                {
                    UtilisateurId = userId,
                    DateCreation = DateTime.UtcNow,
                };
                _db.ProfilsUtilisateurs.Add(profile);
            }

            // PATCH partiel : on n'écrase que les champs fournis (non null).
            profile.NomComplet = dto.NomComplet ?? profile.NomComplet;
            profile.Telephone = dto.Telephone ?? profile.Telephone;
            profile.CIN = dto.CIN ?? profile.CIN;
            if (dto.Gouvernorat.HasValue) profile.Gouvernorat = dto.Gouvernorat.Value;
            if (!string.IsNullOrWhiteSpace(dto.Delegation))
                profile.Delegation = TunisieDecoupage.NormalizeDelegation(dto.Delegation);

            // Champs staff
            profile.CodeEmploye = dto.CodeEmploye ?? profile.CodeEmploye;
            profile.Departement = dto.Departement ?? profile.Departement;
            profile.Poste = dto.Poste ?? profile.Poste;
            profile.CodeDepot = dto.CodeDepot ?? profile.CodeDepot;
            profile.ZoneLivraison = dto.ZoneLivraison ?? profile.ZoneLivraison;

            profile.DateModification = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/admin/users/{userId}
        [HttpDelete("{userId:guid}")]
        public async Task<IActionResult> DeleteUser([FromRoute] Guid userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null) return NotFound();

            // refuser d'effacer les ADMIN par mégarde
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains(AppRoles.ADMIN))
                return BadRequest(new { message = "Impossible de supprimer un compte admin via cette interface." });

            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == userId);
            if (profile != null)
            {
                _db.ProfilsUtilisateurs.Remove(profile);
                await _db.SaveChangesAsync();
            }

            var deleted = await _userManager.DeleteAsync(user);
            if (!deleted.Succeeded)
                return BadRequest(new { message = "Suppression échouée.", errors = deleted.Errors });

            return NoContent();
        }
    }
}
