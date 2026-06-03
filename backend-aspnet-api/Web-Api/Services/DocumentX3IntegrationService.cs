using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Web_Api.data;
using Web_Api.DTO;
using Web_Api.Helpers;

namespace Web_Api.Services
{
    public class DocumentX3IntegrationService
    {
        private const string DocumentEndpointUrl = "http://localhost/WEB_API_STAGE_X3/api/v1/document";

        private readonly AppDbContext _db;
        private readonly ILogger<DocumentX3IntegrationService> _logger;

        public DocumentX3IntegrationService(
            AppDbContext db,
            ILogger<DocumentX3IntegrationService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<Result<Message>> SendDocumentAsync(DOCUMENT document, CancellationToken ct = default)
        {
            if (document == null)
                return Result<Message>.Failure("Document X3 manquant.");

            var configuration = await _db.PARAM_CONNEXION_X3
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == 1, ct);

            if (configuration == null)
            {
                const string message = "Configuration PARAM_CONNEXION_X3 introuvable pour Id = 1.";
                _logger.LogError(message);
                return Result<Message>.Failure(message);
            }

            var paramConnexionX3 = new
            {
                configuration.Http,
                configuration.AdresseIP_X3,
                configuration.Login,
                configuration.Password,
                configuration.Dossier,
                configuration.Service_Web_BC,
                configuration.Type_BC
            };

            var documentPayload = new
            {
                document.DO_NumDocument,
                document.DO_Date,
                document.CT_Num,
                document.DE_No,
                document.DO_Ref,
                document.DO_TotalTTC,
                LIGNEDOCUMENTs = document.LIGNEDOCUMENTs?.Select(line => new
                {
                    line.AR_Ref,
                    line.LP_QteMvt,
                    line.LP_PrixUnitaire,
                    line.LP_ValeurRemise,
                    line.LP_PUTTC,
                    line.LP_MontantTTC
                }).ToList()
            };

            var request = new JObject
            {
                ["Param_Connexion_X3"] = JsonConvert.SerializeObject(paramConnexionX3),
                ["Document"] = JsonConvert.SerializeObject(documentPayload)
            };

            try
            {
                ct.ThrowIfCancellationRequested();

                var response = await DataService.SetObjects("", DocumentEndpointUrl, request);

                if (string.IsNullOrWhiteSpace(response))
                {
                    var message = $"WEB_API_STAGE_X3 n'a retourné aucune réponse sur {DocumentEndpointUrl}.";
                    _logger.LogWarning(message);
                    return Result<Message>.Failure(message);
                }

                var result = JsonConvert.DeserializeObject<Result<Message>>(response);

                if (result == null)
                {
                    var message = "Réponse WEB_API_STAGE_X3 impossible à désérialiser en Result<Message>.";
                    _logger.LogError("{Message} Réponse brute: {Response}", message, response);
                    return Result<Message>.Failure(message);
                }

                return result;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Envoi document Sage X3 annulé. DO_NumDocument={DocumentNumber}", document.DO_NumDocument);
                throw;
            }
            catch (Exception ex)
            {
                var message = $"Erreur lors de l'envoi du document {document.DO_NumDocument} vers WEB_API_STAGE_X3 : {ex.Message}";
                _logger.LogError(ex, message);
                return Result<Message>.Failure(message);
            }
        }
    }
}
