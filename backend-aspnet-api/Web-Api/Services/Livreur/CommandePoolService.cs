using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.Services.Sms;

namespace Web_Api.Services.Livreur
{
    public class CommandePoolService
    {
        private readonly AppDbContext _db;
        private readonly SmsNotificationService _sms;
        private const int AbandonWarningThreshold = 3;
        private const int AbandonBlockThreshold = 5;

        public CommandePoolService(AppDbContext db, SmsNotificationService sms)
        {
            _db = db;
            _sms = sms;
        }

        /// <summary>
        /// Retourne les BL disponibles dans le pool pour le livreur classique.
        /// Règle superviseur : un BL n'est visible que si sa zone de livraison
        /// correspond exactement à une zone affectée au livreur dans F_LIVREUR_ZONE
        /// (gouvernorat + délégation). Aucun fallback global n'est appliqué :
        /// sans zone affectée, le livreur ne voit aucun BL.
        /// </summary>
        public async Task<List<PoolCommandeDto>> GetPoolForLivreurAsync(Guid livreurUserId, CancellationToken ct = default)
        {
            var livreurProfile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == livreurUserId, ct);

            // Un livreur-transit ne livre jamais au client final.
            if (livreurProfile == null || livreurProfile.IsTransit)
                return new List<PoolCommandeDto>();

            var zones = await _db.F_LIVREUR_ZONES.AsNoTracking()
                .Where(z => z.LivreurUserId == livreurUserId)
                .Select(z => new { z.Gouvernorat, z.Delegation })
                .ToListAsync(ct);

            if (zones.Count == 0)
                return new List<PoolCommandeDto>();

            var normalizedZones = zones
                .Select(z => $"{NormalizeZoneKey(z.Gouvernorat)}|{NormalizeZoneKey(z.Delegation)}")
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var raw = await (
                from o in _db.F_DOCENTETES.AsNoTracking()
                join p in _db.ProfilsUtilisateurs.AsNoTracking() on o.DO_Tiers equals p.CodeClientSage into clientJoin
                from p in clientJoin.DefaultIfEmpty()
                where o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME
                    && o.AssignedLivreurId == null
                orderby o.TypeCommande descending, o.DO_Date
                select new
                {
                    Order = o,
                    Client = p,
                    ClientGouvernorat = p != null ? p.Gouvernorat : null,
                    ClientDelegation = p != null ? p.Delegation : null
                }).ToListAsync(ct);

            var commandes = raw
                .Where(x => IsOrderInsideLivreurZones(
                    x.Order.DO_PassagerGouvernorat ?? x.ClientGouvernorat?.ToString(),
                    x.Order.DO_PassagerDelegation ?? x.ClientDelegation,
                    normalizedZones))
                .Select(x => new PoolCommandeDto
                {
                    DoPiece = x.Order.DO_Piece ?? string.Empty,
                    TypeCommande = x.Order.TypeCommande,
                    CommandeOriginalePiece = x.Order.CommandeOriginalePiece,
                    EchangeArticleRetour = x.Order.EchangeArticleRetour,
                    EchangeArticleLivraison = x.Order.EchangeArticleLivraison,
                    DoDate = x.Order.DO_Date,
                    NetAPayer = x.Order.DO_NetAPayer ?? 0m,
                    ClientDisplay = x.Client?.NomComplet ?? x.Client?.NomSociete ?? x.Order.DO_PassagerNomComplet ?? x.Order.DO_Tiers,
                    ClientPhone = x.Order.DO_TelephoneLivraison ?? x.Client?.Telephone ?? x.Order.DO_PassagerTelephone,
                    AdresseLivraison = x.Order.DO_AdresseLivraison,
                    VilleLivraison = x.Order.DO_VilleLivraison
                })
                .ToList();

            return commandes;
        }

        /// <summary>
        /// Atomique : prendre une commande du pool. Renvoie false si déjà prise.
        ///
        /// Section 1.1 — À la prise, on crée la F_LIVRAISON avec
        /// LI_Statut=DEPOT et DepotPassageNumber=0. La transition vers
        /// EN_LIVRAISON se fait ensuite via "Lancer la livraison" côté livreur
        /// (UI 2.2). Log F_LIVRAISON_HISTORIQUE pour traçabilité.
        /// </summary>
        public async Task<bool> TakeCommandeAsync(Guid livreurUserId, string doPiece, CancellationToken ct = default)
        {
            var piece = (doPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("Référence commande obligatoire.");

            if (!await CanLivreurAccessOrderAsync(livreurUserId, piece, ct))
                throw new UnauthorizedAccessException("Ce BL n'appartient pas aux zones affectées à ce livreur.");

            // Mise à jour conditionnelle : seulement si AssignedLivreurId est NULL et statut CONFIRME.
            // La vérification de zone est effectuée juste avant pour sécuriser l'API.
            var affected = await _db.F_DOCENTETES
                .Where(o => o.DO_Piece == piece
                    && o.AssignedLivreurId == null
                    && o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.AssignedLivreurId, livreurUserId)
                    .SetProperty(o => o.cbModification, DateTime.UtcNow), ct);

            if (affected == 0) return false;

            // Récupère le profil livreur pour avoir cbMarq (clé F_LIVRAISON.LivreurId)
            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == livreurUserId, ct);

            // Crée la F_LIVRAISON si elle n'existe pas (par sécurité)
            var existing = await _db.F_LIVRAISONS
                .AsNoTracking()
                .AnyAsync(x => x.DO_Piece == piece, ct);

            if (!existing)
            {
                var entete = await _db.F_DOCENTETES.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.DO_Piece == piece, ct);

                _db.F_LIVRAISONS.Add(new F_LIVRAISON
                {
                    DO_Piece = piece,
                    LivreurId = profile?.cbMarq,
                    LI_Adresse = entete?.DO_AdresseLivraison ?? string.Empty,
                    LI_Ville = entete?.DO_VilleLivraison ?? string.Empty,
                    LI_CodePostal = entete?.DO_CodePostalLivraison,
                    LI_Latitude = entete?.DO_LatitudeLivraison,
                    LI_Longitude = entete?.DO_LongitudeLivraison,
                    LI_Statut = DeliveryStatusCodes.Depot,
                    DepotPassageNumber = 0,
                    LI_DateCreation = DateTime.UtcNow,
                });
            }

            _db.F_LIVRAISON_HISTORIQUES.Add(new F_LIVRAISON_HISTORIQUE
            {
                DoPiece = piece,
                LivreurUserId = livreurUserId,
                LivreurProfileId = profile?.cbMarq,
                Type = "ASSIGN",
                DepotPassageNumber = 0,
                Note = "Prise en charge depuis le pool zones superviseur.",
                CreatedAt = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync(ct);

            // Section 1.3 — hook SMS CONFIRME → DEPOT
            await _sms.NotifyAsync(SmsTrigger.ConfirmeToDepot, piece, ct);

            return true;
        }

        /// <summary>
        /// Abandonner une commande prise — retour au pool.
        /// </summary>
        public async Task<AbandonResult> AbandonCommandeAsync(Guid livreurUserId, string doPiece, string? note, CancellationToken ct = default)
        {
            var piece = (doPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("Référence commande obligatoire.");

            // Vérifier garde-fou abandons du jour
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var countToday = await _db.F_LIVREUR_ABANDON_LOGS.AsNoTracking()
                .CountAsync(a => a.LivreurUserId == livreurUserId
                    && a.CreatedAt >= today && a.CreatedAt < tomorrow, ct);

            if (countToday >= AbandonBlockThreshold)
                throw new InvalidOperationException("Limite d'abandons atteinte pour aujourd'hui. Contacte le support.");

            var order = await _db.F_DOCENTETES
                .FirstOrDefaultAsync(o => o.DO_Piece == piece, ct)
                ?? throw new InvalidOperationException("Commande introuvable.");

            if (order.AssignedLivreurId != livreurUserId)
                throw new UnauthorizedAccessException("Cette commande ne t'est pas assignée.");

            // Règle : abandon autorisé uniquement avant EN_LIVRAISON
            // Status commande LIVRE/REFUSE/RETOUR → non applicable
            // Pour la v1, on empêche l'abandon si status != CONFIRME (pas de flag EN_LIVRAISON séparé pour l'instant)
            // On se base sur DO_Valide : CONFIRME (1) = encore OK, autres = blocage
            if (order.DO_Valide != F_DOCENTETE.STATUS_CONFIRME)
                throw new InvalidOperationException("Abandon impossible : la commande est dans un statut qui ne le permet pas.");

            order.AssignedLivreurId = null;
            order.cbModification = DateTime.UtcNow;

            _db.F_LIVREUR_ABANDON_LOGS.Add(new F_LIVREUR_ABANDON_LOG
            {
                LivreurUserId = livreurUserId,
                CommandePiece = piece,
                Note = note,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync(ct);

            return new AbandonResult
            {
                Success = true,
                AbandonsTodayCount = countToday + 1,
                WarningTriggered = countToday + 1 >= AbandonWarningThreshold
            };
        }

        public async Task<CommandeDetailDto> GetCommandeDetailAsync(Guid livreurUserId, string doPiece, CancellationToken ct = default)
        {
            var piece = (doPiece ?? string.Empty).Trim();
            var order = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(o => o.DO_Piece == piece, ct)
                ?? throw new InvalidOperationException("Commande introuvable.");

            var clientProfile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.CodeClientSage == order.DO_Tiers, ct);

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Piece == piece)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            return new CommandeDetailDto
            {
                DoPiece = piece,
                TypeCommande = order.TypeCommande,
                CommandeOriginalePiece = order.CommandeOriginalePiece,
                NetAPayer = order.DO_NetAPayer ?? 0m,
                ClientDisplay = clientProfile?.NomComplet ?? clientProfile?.NomSociete,
                ClientPhone = clientProfile?.Telephone,
                AdresseLivraison = order.DO_AdresseLivraison,
                VilleLivraison = order.DO_VilleLivraison,
                LignesStandard = lignes.Where(l => l.LigneType == LigneTypes.STANDARD || l.LigneType == null)
                    .Select(MapLigne).ToList(),
                LignesRetour = lignes.Where(l => l.LigneType == LigneTypes.RETOUR).Select(MapLigne).ToList(),
                LignesLivraison = lignes.Where(l => l.LigneType == LigneTypes.LIVRAISON).Select(MapLigne).ToList()
            };
        }

        private async Task<bool> CanLivreurAccessOrderAsync(Guid livreurUserId, string doPiece, CancellationToken ct)
        {
            var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == livreurUserId, ct);
            if (profile == null || profile.IsTransit)
                return false;

            var zones = await _db.F_LIVREUR_ZONES.AsNoTracking()
                .Where(z => z.LivreurUserId == livreurUserId)
                .Select(z => new { z.Gouvernorat, z.Delegation })
                .ToListAsync(ct);
            if (zones.Count == 0)
                return false;

            var normalizedZones = zones
                .Select(z => $"{NormalizeZoneKey(z.Gouvernorat)}|{NormalizeZoneKey(z.Delegation)}")
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var info = await (
                from o in _db.F_DOCENTETES.AsNoTracking()
                join p in _db.ProfilsUtilisateurs.AsNoTracking() on o.DO_Tiers equals p.CodeClientSage into clientJoin
                from p in clientJoin.DefaultIfEmpty()
                where o.DO_Piece == doPiece
                select new
                {
                    OrderGouvernorat = o.DO_PassagerGouvernorat,
                    ClientGouvernorat = p != null ? p.Gouvernorat : null,
                    Delegation = o.DO_PassagerDelegation ?? (p != null ? p.Delegation : null)
                }).FirstOrDefaultAsync(ct);

            return info != null && IsOrderInsideLivreurZones(info.OrderGouvernorat ?? info.ClientGouvernorat?.ToString(), info.Delegation, normalizedZones);
        }

        private static bool IsOrderInsideLivreurZones(string? gouvernorat, string? delegation, HashSet<string> normalizedZones)
        {
            if (string.IsNullOrWhiteSpace(gouvernorat) || string.IsNullOrWhiteSpace(delegation))
                return false;

            var key = $"{NormalizeZoneKey(gouvernorat)}|{NormalizeZoneKey(delegation)}";
            return normalizedZones.Contains(key);
        }

        private static string NormalizeZoneKey(string? value)
        {
            var text = (value ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;

            text = text.Replace('–', '-').Replace('—', '-').Replace('’', '\'');
            var normalized = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(normalized.Length);
            foreach (var c in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(c);
                if (category == UnicodeCategory.NonSpacingMark) continue;

                if (char.IsLetterOrDigit(c)) sb.Append(c);
                else if (c == '-' || char.IsWhiteSpace(c)) sb.Append(' ');
            }
            return string.Join(' ', sb.ToString().Normalize(NormalizationForm.FormC)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        private static CommandeLigneDto MapLigne(F_DOCLIGNE l) => new()
        {
            ArRef = l.AR_Ref ?? string.Empty,
            Designation = l.DL_Design,
            Quantite = l.DL_Qte ?? 0m,
            PrixUnitaire = l.DL_PrixUnitaire ?? 0m,
            LigneType = l.LigneType
        };

        /// <summary>
        /// Retourne les commandes assignées au livreur (à livrer).
        /// </summary>
        public async Task<List<PoolCommandeDto>> GetMyLivraisonsAsync(Guid livreurUserId, CancellationToken ct = default)
        {
            var commandes = await (
                from o in _db.F_DOCENTETES.AsNoTracking()
                join p in _db.ProfilsUtilisateurs.AsNoTracking() on o.DO_Tiers equals p.CodeClientSage
                where o.AssignedLivreurId == livreurUserId
                    && o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME
                orderby o.TypeCommande descending, o.DO_Date
                select new PoolCommandeDto
                {
                    DoPiece = o.DO_Piece ?? string.Empty,
                    TypeCommande = o.TypeCommande,
                    CommandeOriginalePiece = o.CommandeOriginalePiece,
                    EchangeArticleRetour = o.EchangeArticleRetour,
                    EchangeArticleLivraison = o.EchangeArticleLivraison,
                    DoDate = o.DO_Date,
                    NetAPayer = o.DO_NetAPayer ?? 0m,
                    ClientDisplay = p.NomComplet ?? p.NomSociete,
                    ClientPhone = p.Telephone,
                    AdresseLivraison = o.DO_AdresseLivraison,
                    VilleLivraison = o.DO_VilleLivraison
                }).ToListAsync(ct);

            return commandes;
        }
    }

    public class PoolCommandeDto
    {
        public string DoPiece { get; set; } = string.Empty;
        public string TypeCommande { get; set; } = "NORMALE";
        public string? CommandeOriginalePiece { get; set; }
        public string? EchangeArticleRetour { get; set; }
        public string? EchangeArticleLivraison { get; set; }
        public DateTime? DoDate { get; set; }
        public decimal NetAPayer { get; set; }
        public string? ClientDisplay { get; set; }
        public string? ClientPhone { get; set; }
        public string? AdresseLivraison { get; set; }
        public string? VilleLivraison { get; set; }
    }

    public class AbandonResult
    {
        public bool Success { get; set; }
        public int AbandonsTodayCount { get; set; }
        public bool WarningTriggered { get; set; }
    }

    public class CommandeDetailDto
    {
        public string DoPiece { get; set; } = string.Empty;
        public string TypeCommande { get; set; } = "NORMALE";
        public string? CommandeOriginalePiece { get; set; }
        public decimal NetAPayer { get; set; }
        public string? ClientDisplay { get; set; }
        public string? ClientPhone { get; set; }
        public string? AdresseLivraison { get; set; }
        public string? VilleLivraison { get; set; }
        public List<CommandeLigneDto> LignesStandard { get; set; } = new();
        public List<CommandeLigneDto> LignesRetour { get; set; } = new();
        public List<CommandeLigneDto> LignesLivraison { get; set; } = new();
    }

    public class CommandeLigneDto
    {
        public string ArRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal Quantite { get; set; }
        public decimal PrixUnitaire { get; set; }
        public string? LigneType { get; set; }
    }
}
