using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Services.Sage;

namespace Web_Api.Controllers.Dev
{
    /// <summary>
    /// Endpoints de diagnostic Sage X3 — uniquement en développement.
    /// Permet de valider la connexion et le payload sans passer par une vraie livraison.
    /// </summary>
    [ApiController]
    [Route("api/dev/sage")]
    [AllowAnonymous]
    public class DevSageController : ControllerBase
    {
        private readonly SageX3ConfigService _sageX3Config;
        private readonly ILogger<DevSageController> _logger;
        private readonly IWebHostEnvironment _env;

        public DevSageController(
            SageX3ConfigService sageX3Config,
            ILogger<DevSageController> logger,
            IWebHostEnvironment env)
        {
            _sageX3Config = sageX3Config;
            _logger = logger;
            _env = env;
        }

        /// <summary>
        /// POST /api/dev/sage/test-send
        ///
        /// Envoie un document factice vers Sage X3 avec les valeurs de démonstration
        /// (CT_Num=FR004, DE_No=26, articles DIS007/DIS009) pour valider la connexion.
        /// Utilise exactement le même chemin de code que la transition "Livré" en production.
        /// </summary>
        [HttpPost("test-send")]
        public async Task<IActionResult> TestSend(CancellationToken ct)
        {
            if (!_env.IsDevelopment())
                return NotFound();

            var param = await _sageX3Config.GetAsync(ct);

            var doc = new DOCUMENT
            {
                DO_NumDocument = $"DEV-TEST-{DateTime.Now:yyyyMMddHHmmss}",
                DO_Date = DateTime.Now,
                CT_Num = param.DemoCtNum,
                DE_No = param.DemoDeNo,
                DO_Ref = "TEST-DEV",
                DO_TotalTTC = 520m,
                LIGNEDOCUMENTs = new List<LIGNE_DOCUMENT>
                {
                    new LIGNE_DOCUMENT
                    {
                        AR_Ref = param.DemoArRef1,
                        LP_QteMvt = 2,
                        LP_PrixUnitaire = 200,
                        LP_ValeurRemise = 0,
                        LP_PUTTC = 220,
                        LP_MontantTTC = 440
                    },
                    new LIGNE_DOCUMENT
                    {
                        AR_Ref = param.DemoArRef2,
                        LP_QteMvt = 1,
                        LP_PrixUnitaire = 20,
                        LP_ValeurRemise = 0,
                        LP_PUTTC = 25,
                        LP_MontantTTC = 25
                    }
                }
            };

            _logger.LogInformation(
                "DEV TEST SEND | DO_NumDocument={DocNum} CT_Num={CtNum} DE_No={DeNo} TotalTTC={Total} | AdresseIP_API={Ip} Dossier={Dossier}",
                doc.DO_NumDocument, doc.CT_Num, doc.DE_No, doc.DO_TotalTTC,
                param.AdresseIP_API, param.Dossier);

            DataService.Logger = _logger;

            try
            {
                var result = await INTEGRATION_DOCUMENT_X3.Integration_Document(doc, param);

                return Ok(new
                {
                    IsSuccess = result?.IsSuccess,
                    Error = result?.Error,
                    NumeroSage = result?.Value?.M_NumeroSage,
                    NumeroSite = result?.Value?.M_NumeroSite,
                    Statut = result?.Value?.M_Statut,
                    SentDoc = new
                    {
                        doc.DO_NumDocument,
                        doc.CT_Num,
                        doc.DE_No,
                        doc.DO_TotalTTC,
                        Lignes = doc.LIGNEDOCUMENTs?.Count
                    },
                    Config = new
                    {
                        param.AdresseIP_API,
                        param.AdresseIP_X3,
                        param.Dossier,
                        param.Service_Web_BC,
                        param.Type_BC,
                        param.DemoMode
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DEV TEST SEND exception.");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/dev/sage/config
        /// Retourne la configuration Sage X3 active (sans le mot de passe).
        /// </summary>
        [HttpGet("config")]
        public async Task<IActionResult> GetConfig(CancellationToken ct)
        {
            if (!_env.IsDevelopment())
                return NotFound();

            var param = await _sageX3Config.GetAsync(ct);

            return Ok(new
            {
                param.Http,
                param.AdresseIP_API,
                param.AdresseIP_X3,
                param.Dossier,
                param.Service_Web_BC,
                param.Type_BC,
                param.DefaultDepotNo,
                param.DemoMode,
                param.DemoCtNum,
                param.DemoDeNo,
                param.DemoArRef1,
                param.DemoArRef2,
            });
        }
    }
}
