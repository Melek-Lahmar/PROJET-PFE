using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace Web_Api.Services.Admin.Chat
{
    /// <summary>
    /// Section 1.5 — Provider de la KB hybride utilisée par le chatbot admin.
    /// Concatène un KB statique (rédigé à la main par l'équipe métier) et un
    /// KB auto-généré (KbGeneratorService) au boot. Cache en mémoire, peut
    /// être invalidé par un endpoint admin.
    /// </summary>
    public class KbProvider
    {
        private readonly IHostEnvironment _env;
        private readonly object _lock = new();
        private string? _cached;

        public KbProvider(IHostEnvironment env)
        {
            _env = env;
        }

        public async Task<string> GetFullKbAsync()
        {
            if (_cached != null) return _cached;

            var staticPath = Path.Combine(_env.ContentRootPath, "wwwroot", "kb", "kb_statique.md");
            var generatedPath = Path.Combine(_env.ContentRootPath, "wwwroot", "kb", "kb_auto_generated.md");

            string statique = File.Exists(staticPath)
                ? await File.ReadAllTextAsync(staticPath)
                : DefaultStaticKb;
            string generee = File.Exists(generatedPath)
                ? await File.ReadAllTextAsync(generatedPath)
                : "<!-- KB auto-générée non encore initialisée -->";

            var full = $"{statique}\n\n---\n\n{generee}";
            lock (_lock) _cached = full;
            return full;
        }

        public void InvalidateCache()
        {
            lock (_lock) _cached = null;
        }

        private const string DefaultStaticKb = @"# Plateforme PFE livraison COD Tunisie — KB métier

## Rôles
- CLIENT : passe des commandes et suit les livraisons
- LIVREUR : prend les commandes du pool gouvernorat, livre
- CONFIRMATEUR (confirmatrice) : valide les commandes, traite réclamations & demandes
- ADMIN : pilotage, configuration, dashboard

## Flux principal
1. Le client passe commande COD → DO_Valide=EN_ATTENTE
2. La confirmatrice valide → DO_Valide=CONFIRME, BL généré
3. Le livreur prend depuis le pool → F_LIVRAISON.LI_Statut=DEPOT, DepotPassageNumber=0
4. Livreur lance livraison → LI_Statut=EN_LIVRAISON
5. Livreur démarre vers ce client → F_DOCENTETE.IsActiveDelivery=true (UN SEUL)
6. Livraison réussie → LI_Statut=LIVRE + encaissement COD

## Frais
- Livraison HOME : 8 DT (réductions fidélité Section 3.10)
- Timbre fiscal : 1 DT

## Réclamations / Demandes
- 4 statuts : ENVOYEE / EN_COURS_DE_TRAITEMENT / CLOTUREE / REFUSEE
- Demande créée à la 3e tentative livreur (compteur continue sans plafond)
- Cas urgents traités en priorité (motifs hors-livraison, photos)
";
    }
}
