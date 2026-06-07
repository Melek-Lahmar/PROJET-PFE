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
            if (dto == null)
                return BadRequest(new { message = "Body manquant." });

            var role = dto.Role?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(role) || !AppRoles.All.Contains(role))
                return BadRequest(new { message = "Role invalide." });

            var email = dto.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email obligatoire." });

            var existingUser = await _userManager.FindByEmailAsync(email);
            if (existingUser != null)
                return BadRequest(new { message = "Un utilisateur avec cet email existe déjà." });

            var isClient = role == AppRoles.CLIENT;
            var typeProfil = isClient ? TypeProfil.Client : TypeProfil.Employe;
            var typeClient = isClient ? dto.TypeClient : null;

            if (isClient && typeClient == null)
                return BadRequest(new { message = "TypeClient est obligatoire pour un client." });

            if (typeClient == Web_Api.Auth.Entities.TypeClient.B2B)
            {
                if (string.IsNullOrWhiteSpace(dto.NomSociete))
                    return BadRequest(new { message = "NomSociete est obligatoire pour un client B2B." });
                if (string.IsNullOrWhiteSpace(dto.MatriculeFiscal))
                    return BadRequest(new { message = "MatriculeFiscal est obligatoire pour un client B2B." });
            }

            if (isClient && typeClient == Web_Api.Auth.Entities.TypeClient.B2C)
            {
                if (string.IsNullOrWhiteSpace(dto.NomComplet))
                    return BadRequest(new { message = "NomComplet est obligatoire pour un client B2C." });
                if (string.IsNullOrWhiteSpace(dto.Telephone))
                    return BadRequest(new { message = "Telephone est obligatoire pour un client B2C." });
                if (string.IsNullOrWhiteSpace(dto.Adresse))
                    return BadRequest(new { message = "Adresse est obligatoire pour un client B2C." });
                if (string.IsNullOrWhiteSpace(dto.CodePostal))
                    return BadRequest(new { message = "CodePostal est obligatoire pour un client B2C." });
            }

            if (dto.IsTransit && role != AppRoles.LIVREUR)
                return BadRequest(new { message = "IsTransit=true est autorisé uniquement pour le rôle LIVREUR." });

            if (dto.IsTransit && (!dto.DepotRattacheNo.HasValue || dto.DepotRattacheNo.Value <= 0))
                return BadRequest(new { message = "DepotRattacheNo est obligatoire pour un livreur de transit." });

            // ✅ validation gouvernorat/délégation
            if (!TunisieDecoupage.IsDelegationValide(dto.Gouvernorat, dto.Delegation))
            {
                ModelState.AddModelError("Delegation", "La délégation ne correspond pas au gouvernorat choisi.");
                return ValidationProblem(ModelState);
            }

            // ✅ create identity user
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true
            };

            var created = await _userManager.CreateAsync(user, dto.Password);
            if (!created.Succeeded)
                return BadRequest(new { message = "Création user échouée.", errors = created.Errors });

            var roleResult = await _userManager.AddToRoleAsync(user, role);
            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return BadRequest(new { message = "Assign role échoué.", errors = roleResult.Errors });
            }

            try
            {
                var now = DateTime.UtcNow;
                var normalizedDelegation = TunisieDecoupage.NormalizeDelegation(dto.Delegation);
                var isTransit = role == AppRoles.LIVREUR && dto.IsTransit;
                var depotRattacheNo = dto.DepotRattacheNo.HasValue && dto.DepotRattacheNo.Value > 0
                    ? dto.DepotRattacheNo.Value
                    : (int?)null;

                // ✅ create profile
                var profile = new ProfilUtilisateur
                {
                    UtilisateurId = user.Id,

                    TypeProfil = typeProfil,
                    TypeClient = typeClient,

                    NomComplet = TrimOrNull(dto.NomComplet),
                    Telephone = TrimOrNull(dto.Telephone),

                    CIN = TrimOrNull(dto.CIN),
                    DateNaissance = dto.DateNaissance,

                    Gouvernorat = dto.Gouvernorat,
                    Delegation = normalizedDelegation,

                    Adresse = TrimOrNull(dto.Adresse) ?? "Non renseignée",
                    AdresseComplementaire = TrimOrNull(dto.AdresseComplementaire),
                    CodePostal = TrimOrNull(dto.CodePostal),
                    Pays = TrimOrNull(dto.Pays) ?? "Tunisie",

                    NomSociete = isClient ? TrimOrNull(dto.NomSociete) : null,
                    MatriculeFiscal = isClient ? TrimOrNull(dto.MatriculeFiscal) : null,
                    RegistreCommerce = isClient ? TrimOrNull(dto.RegistreCommerce) : null,
                    NumeroTVA = isClient ? TrimOrNull(dto.NumeroTVA) : null,
                    PlafondCredit = isClient ? dto.PlafondCredit : null,
                    DiscountPercent = typeClient == Web_Api.Auth.Entities.TypeClient.B2B ? dto.DiscountPercent : null,

                    Poste = ResolvePoste(role, isTransit, dto.Poste),
                    Departement = ResolveDepartement(role, dto.Departement),
                    CodeEmploye = TrimOrNull(dto.CodeEmploye),
                    CodeDepot = isTransit && depotRattacheNo.HasValue
                        ? depotRattacheNo.Value.ToString()
                        : TrimOrNull(dto.CodeDepot) ?? depotRattacheNo?.ToString(),
                    ZoneLivraison = role == AppRoles.LIVREUR
                        ? (isTransit ? "TRANSIT" : TrimOrNull(dto.ZoneLivraison) ?? "ZONE")
                        : TrimOrNull(dto.ZoneLivraison),
                    IsTransit = isTransit,
                    DepotRattacheNo = depotRattacheNo,

                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude,

                    DateCreation = now,
                    DateModification = now
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
            catch
            {
                await _userManager.DeleteAsync(user);
                throw;
            }
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

        private static string? TrimOrNull(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        private static string? ResolvePoste(string role, bool isTransit, string? supplied)
        {
            var explicitValue = TrimOrNull(supplied);
            if (explicitValue != null) return explicitValue;

            return role switch
            {
                AppRoles.VENDEUR => "Vendeur",
                AppRoles.CONFIRMATEUR => "Confirmateur",
                AppRoles.LIVREUR => isTransit ? "Livreur Transit" : "Livreur",
                AppRoles.SUPERVISEUR => "Superviseur",
                AppRoles.ADMIN => "Administrateur",
                _ => null
            };
        }

        private static string? ResolveDepartement(string role, string? supplied)
        {
            var explicitValue = TrimOrNull(supplied);
            if (explicitValue != null) return explicitValue;

            return role switch
            {
                AppRoles.VENDEUR => "Commerce",
                AppRoles.CONFIRMATEUR => "Service commandes",
                AppRoles.LIVREUR => "Logistique",
                AppRoles.SUPERVISEUR => "Logistique",
                AppRoles.ADMIN => "Administration",
                _ => null
            };
        }
    }
}
