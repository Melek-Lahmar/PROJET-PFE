using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.Geo;

namespace Web_Api.Services.Refonte
{
    /// <summary>
    /// Lot C — Provisionnement automatique du personnel d'un dépôt.
    /// Quand une mission transit doit partir d'un dépôt qui n'a aucun livreur
    /// transit (ni caisse), on crée à la volée les comptes :
    ///   transit+&lt;gouvernorat&gt;@gmail.com  (LIVREUR, IsTransit = true)
    ///   caisse+&lt;gouvernorat&gt;@gmail.com   (VENDEUR)
    /// Mot de passe par défaut : 123456. Idempotent : si le compte existe déjà,
    /// on ne le recrée pas (on répare juste son rattachement dépôt si besoin).
    /// </summary>
    public interface ITransitAccountProvisioningService
    {
        /// <summary>
        /// Garantit un livreur transit + une caisse rattachés à ce dépôt.
        /// Retourne l'UserId du livreur transit (existant ou créé), ou null si
        /// le gouvernorat du dépôt est introuvable (rien créé).
        /// </summary>
        Task<Guid?> EnsureDepotStaffAsync(int depotNo, CancellationToken ct = default);
    }

    public sealed class TransitAccountProvisioningService : ITransitAccountProvisioningService
    {
        private const string DefaultPassword = "123456";

        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _users;
        private readonly ILogger<TransitAccountProvisioningService> _logger;

        public TransitAccountProvisioningService(
            AppDbContext db,
            UserManager<ApplicationUser> users,
            ILogger<TransitAccountProvisioningService> logger)
        {
            _db = db;
            _users = users;
            _logger = logger;
        }

        public async Task<Guid?> EnsureDepotStaffAsync(int depotNo, CancellationToken ct = default)
        {
            // 1) Gouvernorat principal du dépôt (sinon, première zone connue).
            var gouvName = (await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(z => z.DepotNo == depotNo && z.IsPrimary)
                    .Select(z => z.Gouvernorat)
                    .FirstOrDefaultAsync(ct))
                ?? await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(z => z.DepotNo == depotNo)
                    .Select(z => z.Gouvernorat)
                    .FirstOrDefaultAsync(ct);

            gouvName = gouvName?.Trim();
            if (string.IsNullOrWhiteSpace(gouvName))
            {
                _logger.LogWarning(
                    "ProvisioningTransit: dépôt {Depot} sans gouvernorat — comptes non créés.", depotNo);
                return null;
            }

            var slug = Slug(gouvName);
            if (string.IsNullOrEmpty(slug))
                return null;

            var gouvEnum = ParseGouvernorat(gouvName);

            // 2) Livreur transit (LIVREUR + IsTransit).
            var transitId = await EnsureUserAsync(
                email: $"transit+{slug}@gmail.com",
                role: AppRoles.LIVREUR,
                isTransit: true,
                depotNo: depotNo,
                gouvEnum: gouvEnum,
                gouvName: gouvName,
                nomComplet: $"Transit {gouvName}",
                ct);

            // 3) Caisse / vendeur du dépôt.
            await EnsureUserAsync(
                email: $"caisse+{slug}@gmail.com",
                role: AppRoles.VENDEUR,
                isTransit: false,
                depotNo: depotNo,
                gouvEnum: gouvEnum,
                gouvName: gouvName,
                nomComplet: $"Caisse {gouvName}",
                ct);

            return transitId;
        }

        private async Task<Guid?> EnsureUserAsync(
            string email,
            string role,
            bool isTransit,
            int depotNo,
            GouvernoratTunisie? gouvEnum,
            string gouvName,
            string nomComplet,
            CancellationToken ct)
        {
            var existing = await _users.FindByEmailAsync(email);
            if (existing != null)
            {
                // Réparation douce : garantit le bon rattachement dépôt / flag transit.
                var prof = await _db.ProfilsUtilisateurs
                    .FirstOrDefaultAsync(p => p.UtilisateurId == existing.Id, ct);
                if (prof != null && (prof.DepotRattacheNo != depotNo || prof.IsTransit != isTransit))
                {
                    prof.DepotRattacheNo = depotNo;
                    prof.IsTransit = isTransit;
                    prof.DateModification = DateTime.UtcNow;
                    await _db.SaveChangesAsync(ct);
                }
                return existing.Id;
            }

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true
            };

            var create = await _users.CreateAsync(user, DefaultPassword);
            if (!create.Succeeded)
            {
                _logger.LogError(
                    "ProvisioningTransit: création {Email} échouée: {Errors}",
                    email, string.Join("; ", create.Errors.Select(e => $"{e.Code}={e.Description}")));
                return null;
            }

            await _users.AddToRoleAsync(user, role);

            _db.ProfilsUtilisateurs.Add(new ProfilUtilisateur
            {
                UtilisateurId = user.Id,
                TypeProfil = TypeProfil.Employe,
                NomComplet = nomComplet,
                Gouvernorat = gouvEnum,
                Delegation = gouvName,
                Adresse = $"Dépôt {depotNo}",
                IsTransit = isTransit,
                DepotRattacheNo = depotNo,
                CodeDepot = depotNo.ToString(CultureInfo.InvariantCulture),
                DateCreation = DateTime.UtcNow,
                DateModification = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "ProvisioningTransit: compte {Role} {Email} créé pour le dépôt {Depot} ({Gouv}).",
                role, email, depotNo, gouvName);

            return user.Id;
        }

        // "Ben Arous" -> "benarous" ; "Médenine" -> "medenine".
        private static string Slug(string value)
        {
            var formD = value.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(value.Length);
            foreach (var ch in formD)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                    continue;
                if (char.IsLetterOrDigit(ch))
                    sb.Append(char.ToLowerInvariant(ch));
            }
            return sb.ToString();
        }

        // "Ben Arous" -> GouvernoratTunisie.BenArous (tolérant aux espaces/accents).
        private static GouvernoratTunisie? ParseGouvernorat(string name)
        {
            var formD = name.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(name.Length);
            foreach (var ch in formD)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                    continue;
                if (char.IsLetterOrDigit(ch))
                    sb.Append(ch);
            }
            return Enum.TryParse<GouvernoratTunisie>(sb.ToString(), ignoreCase: true, out var g)
                ? g
                : null;
        }
    }
}
