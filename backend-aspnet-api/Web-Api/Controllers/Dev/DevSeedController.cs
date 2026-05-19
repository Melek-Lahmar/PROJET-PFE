using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Services.DevTest;
using Web_Api.Services.Reclamations;

namespace Web_Api.Controllers.Dev
{
    /// <summary>
    /// Endpoints d'administration pour le seed du jeu de données de test.
    /// Tous les endpoints sont disponibles UNIQUEMENT en environnement Development.
    /// En Production/Staging ils renvoient 404.
    /// </summary>
    [ApiController]
    [Route("api/dev")]
    [AllowAnonymous]
    public class DevSeedController : ControllerBase
    {
        private readonly DevTestDataSeeder _seeder;
        private readonly ReclamationsService _reclamations;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<DevSeedController> _logger;

        public DevSeedController(
            DevTestDataSeeder seeder,
            ReclamationsService reclamations,
            IWebHostEnvironment env,
            ILogger<DevSeedController> logger)
        {
            _seeder = seeder;
            _reclamations = reclamations;
            _env = env;
            _logger = logger;
        }

        /// <summary>
        /// Efface toutes les données de test (commandes BCTEST* + réclamations / demandes / tentatives liées)
        /// puis regénère un jeu de données propre : 3 comptes (client / livreur / confirmatrice Sfax),
        /// 12 commandes test et 10 cas répartis sur les 4 statuts métier.
        /// Idempotent : peut être rejoué autant de fois que nécessaire.
        /// </summary>
        [HttpPost("reset-seed")]
        public async Task<IActionResult> ResetAndSeed(CancellationToken ct)
        {
            if (!_env.IsDevelopment())
                return NotFound();

            try
            {
                var report = await _seeder.RunAsync(ct);
                return Ok(report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DevTest reset-seed failed");
                return StatusCode(500, new
                {
                    message = "Erreur pendant le seed : " + ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        /// <summary>
        /// Déclenche manuellement un cycle de redistribution phase 3C (libération des cas
        /// inactifs + reprise des orphelins). Paramètre <c>thresholdMinutes</c> optionnel
        /// (défaut 30) pour tester avec un seuil différent en intégration.
        /// Dev-only.
        /// </summary>
        [HttpPost("3c/scan")]
        public async Task<IActionResult> TriggerRedistributionScan(
            [FromQuery] int thresholdMinutes = 30,
            CancellationToken ct = default)
        {
            if (!_env.IsDevelopment()) return NotFound();

            try
            {
                var releasedIds = await _reclamations.ReleaseStaleCasesAsync(
                    TimeSpan.FromMinutes(thresholdMinutes), ct);
                var orphansReassigned = await _reclamations.RedistributeUnassignedCasesAsync(
                    releasedIds, ct);
                return Ok(new
                {
                    thresholdMinutes,
                    staleReleased = releasedIds.Count,
                    orphansReassigned
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DevTest 3c/scan failed");
                return StatusCode(500, new { message = "Erreur : " + ex.Message });
            }
        }
    }
}
