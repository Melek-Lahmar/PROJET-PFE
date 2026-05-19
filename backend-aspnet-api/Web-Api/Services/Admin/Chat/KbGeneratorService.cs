using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Web_Api.Constants;

namespace Web_Api.Services.Admin.Chat
{
    /// <summary>
    /// Section 1.5 — Génère wwwroot/kb/kb_auto_generated.md à partir des enums
    /// et constantes métier au boot du serveur. Le KbProvider concatène ce
    /// fichier avec un KB statique pour fournir le contexte au chatbot.
    ///
    /// Le HostedService s'exécute une fois au démarrage (StartAsync). Pour
    /// régénérer manuellement (ex: après modification d'un enum), appeler
    /// GenerateAsync() depuis un endpoint admin (POST /api/admin/chat/kb/refresh).
    /// </summary>
    public class KbGeneratorService : IHostedService
    {
        private readonly IHostEnvironment _env;
        private readonly KbProvider _kb;
        private readonly ILogger<KbGeneratorService> _logger;

        public KbGeneratorService(
            IHostEnvironment env,
            KbProvider kb,
            ILogger<KbGeneratorService> logger)
        {
            _env = env;
            _kb = kb;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken ct) => GenerateAsync(ct);
        public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

        public async Task GenerateAsync(CancellationToken ct = default)
        {
            try
            {
                var dir = Path.Combine(_env.ContentRootPath, "wwwroot", "kb");
                Directory.CreateDirectory(dir);
                var path = Path.Combine(dir, "kb_auto_generated.md");

                var sb = new StringBuilder();
                sb.AppendLine("# KB Auto-générée");
                sb.AppendLine($"Générée le : {System.DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
                sb.AppendLine();

                // Statuts livraison
                sb.AppendLine("## Statuts livraison (LI_Statut)");
                sb.AppendLine($"- {DeliveryStatusCodes.Confirme} : Confirme — commande validée, en attente livreur");
                sb.AppendLine($"- {DeliveryStatusCodes.EnLivraison} : EnLivraison — livreur en route");
                sb.AppendLine($"- {DeliveryStatusCodes.Livre} : Livre — livraison réussie");
                sb.AppendLine($"- {DeliveryStatusCodes.Retour} : Retour — colis renvoyé");
                sb.AppendLine($"- {DeliveryStatusCodes.Depot} : Depot — au dépôt, à reprogrammer");
                sb.AppendLine($"- {DeliveryStatusCodes.Reporte} : Reporte — replanifié J+x");
                sb.AppendLine();

                // Statuts commande (DO_Valide)
                sb.AppendLine("## Statuts commande (DO_Valide)");
                sb.AppendLine("- 0 : EN_ATTENTE");
                sb.AppendLine("- 1 : CONFIRME");
                sb.AppendLine("- 2 : TENTATIVE");
                sb.AppendLine("- 3 : REFUSE");
                sb.AppendLine();

                // Motifs livreur
                sb.AppendLine("## Motifs report/retour livreur");
                sb.AppendLine("- CLIENT_NON_JOIGNABLE : compteur tentatives, Demande à la 3e");
                sb.AppendLine("- CLIENT_ABSENT : compteur tentatives, Demande à la 3e");
                sb.AppendLine("- ADRESSE_INTROUVABLE : Demande client immédiate (rouge/vert)");
                sb.AppendLine("- ADRESSE_INCOMPLETE : Demande client immédiate");
                sb.AppendLine("- NUMERO_INVALIDE : Demande client immédiate");
                sb.AppendLine("- CLIENT_REFUSE_COMMANDE : escalade confirmatrice");
                sb.AppendLine("- COLIS_ENDOMMAGE_DEPOT : escalade confirmatrice (photo obligatoire)");
                sb.AppendLine("- AUTRE_INCIDENT : escalade confirmatrice");
                sb.AppendLine();

                // Statuts cas
                sb.AppendLine("## Statuts cas (réclamations + demandes)");
                sb.AppendLine("- ENVOYEE — nouveau cas en file");
                sb.AppendLine("- EN_COURS_DE_TRAITEMENT — confirmatrice a pris en charge");
                sb.AppendLine("- CLOTUREE — résolu");
                sb.AppendLine("- REFUSEE — rejeté avec motif");
                sb.AppendLine();

                // Gouvernorats
                sb.AppendLine("## Gouvernorats Tunisiens (24)");
                foreach (var g in TunisianGovernorates)
                    sb.AppendLine($"- {g}");
                sb.AppendLine();

                // Constantes métier
                sb.AppendLine("## Constantes métier");
                sb.AppendLine("- Frais livraison HOME : 8 DT (réductions fidélité Section 3.10)");
                sb.AppendLine("- Timbre fiscal : 1 DT");
                sb.AppendLine("- Seuil tentatives différées : 3 (Demande créée chez confirmatrice)");
                sb.AppendLine("- Verrou confirmation pool : 15 min");
                sb.AppendLine("- Timeout cas inactifs : 30 min");
                sb.AppendLine("- Délai grâce SignalR confirmatrice : 5 secondes");
                sb.AppendLine("- DepotPassageNumber max : 10 (garde-fou Hangfire)");
                sb.AppendLine();

                // Programme fidélité
                sb.AppendLine("## Programme fidélité");
                sb.AppendLine("- Bronze : 0-9 livraisons réussies (aucun avantage)");
                sb.AppendLine("- Argent : 10-29 (-10% frais)");
                sb.AppendLine("- Or : 30-99 (-25% + livraison prioritaire)");
                sb.AppendLine("- Platine : 100+ (frais offerts + assistance prio)");

                await File.WriteAllTextAsync(path, sb.ToString(), ct);
                _kb.InvalidateCache();
                _logger.LogInformation("KB auto-générée écrite : {Path}", path);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "KbGeneratorService.GenerateAsync a échoué");
            }
        }

        private static readonly string[] TunisianGovernorates =
        {
            "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
            "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse",
            "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
            "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kebili",
        };
    }
}
