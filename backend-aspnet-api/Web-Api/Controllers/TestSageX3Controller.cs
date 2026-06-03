using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.DTO;
using Web_Api.Services;

namespace Web_Api.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/test-sage-x3")]
    public class TestSageX3Controller : ControllerBase
    {
        private readonly DocumentX3IntegrationService _documentX3Service;

        public TestSageX3Controller(DocumentX3IntegrationService documentX3Service)
        {
            _documentX3Service = documentX3Service;
        }

        [HttpPost("document")]
        public async Task<IActionResult> SendDocument(CancellationToken ct)
        {
            var document = new DOCUMENT
            {
                DO_NumDocument = "BC2400009",
                DO_Date = DateTime.Now,
                CT_Num = "FR004",
                DE_No = 26,
                DO_Ref = "",
                DO_TotalTTC = 520,
                LIGNEDOCUMENTs = new List<LIGNE_DOCUMENT>
                {
                    new LIGNE_DOCUMENT
                    {
                        AR_Ref = "DIS009",
                        LP_QteMvt = 1,
                        LP_PrixUnitaire = 20,
                        LP_ValeurRemise = 0,
                        LP_PUTTC = 25,
                        LP_MontantTTC = 25
                    },
                    new LIGNE_DOCUMENT
                    {
                        AR_Ref = "DIS007",
                        LP_QteMvt = 2,
                        LP_PrixUnitaire = 200,
                        LP_ValeurRemise = 0,
                        LP_PUTTC = 220,
                        LP_MontantTTC = 440
                    }
                }
            };

            var result = await _documentX3Service.SendDocumentAsync(document, ct);

            return Ok(result);
        }
    }
}
