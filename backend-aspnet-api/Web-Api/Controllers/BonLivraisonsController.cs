using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.DTO.BL;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/bl")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR + "," + AppRoles.LIVREUR)]
    public class BonLivraisonsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private const short BL_TYPE = 1;

        public BonLivraisonsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var entetes = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BL_TYPE &&
                    x.DO_Piece != null &&
                    x.DO_Piece.StartsWith("BL"))
                .OrderByDescending(x => x.cbMarq)
                .ToListAsync(ct);

            var pieces = entetes
                .Select(e => e.DO_Piece!)
                .Distinct()
                .ToList();

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BL_TYPE && l.DO_Piece != null && pieces.Contains(l.DO_Piece))
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            var byPiece = lignes
                .GroupBy(l => l.DO_Piece ?? string.Empty)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = entetes.Select(e =>
            {
                byPiece.TryGetValue(e.DO_Piece ?? string.Empty, out var ls);
                ls ??= new();

                return new BonLivraisonResponseDto
                {
                    Piece = e.DO_Piece ?? string.Empty,
                    Date = e.DO_Date,
                    SourceBcPiece = BuildSourceBcPiece(e.DO_Piece),

                    ClientCode = e.DO_Tiers ?? string.Empty,
                    DepotNo = e.DE_No ?? 0,
                    Status = e.DocumentStatus,

                    TotalHT = e.DO_TotalHT ?? 0m,
                    TotalTTC = e.DO_TotalTTC ?? 0m,
                    FraisLivraison = e.DO_FraisLivraison ?? 0m,
                    TimbreFiscal = e.DO_TimbreFiscal ?? 0m,
                    NetAPayer = e.DO_NetAPayer ?? 0m,

                    DeliveryType = e.DO_ModeLivraison,
                    PaymentMethod = e.DO_ModePaiement,
                    Address = e.DO_AdresseLivraison,
                    City = e.DO_VilleLivraison,
                    PostalCode = e.DO_CodePostalLivraison,
                    ClientPhone = e.DO_TelephoneLivraison,
                    Latitude = e.DO_LatitudeLivraison,
                    Longitude = e.DO_LongitudeLivraison,

                    Lines = ls.Select(l => new BonLivraisonLineResponseDto
                    {
                        ArticleRef = l.AR_Ref ?? string.Empty,
                        Designation = l.DL_Design,
                        Qty = l.DL_Qte ?? 0m,
                        UnitPrice = l.DL_PrixUnitaire ?? 0m,
                        AmountHT = l.DL_MontantHT ?? 0m,
                        AmountTTC = l.DL_MontantTTC ?? 0m
                    }).ToList()
                };
            });

            return Ok(result);
        }

        [HttpGet("{piece}")]
        public async Task<IActionResult> GetByPiece(string piece, CancellationToken ct)
        {
            var e = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Domaine == 0 && x.DO_Type == BL_TYPE && x.DO_Piece == piece, ct);

            if (e == null)
                return NotFound(new { message = "BL introuvable." });

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BL_TYPE && l.DO_Piece == piece)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            return Ok(new BonLivraisonResponseDto
            {
                Piece = e.DO_Piece ?? string.Empty,
                Date = e.DO_Date,
                SourceBcPiece = BuildSourceBcPiece(e.DO_Piece),

                ClientCode = e.DO_Tiers ?? string.Empty,
                DepotNo = e.DE_No ?? 0,
                Status = e.DocumentStatus,

                TotalHT = e.DO_TotalHT ?? 0m,
                TotalTTC = e.DO_TotalTTC ?? 0m,
                FraisLivraison = e.DO_FraisLivraison ?? 0m,
                TimbreFiscal = e.DO_TimbreFiscal ?? 0m,
                NetAPayer = e.DO_NetAPayer ?? 0m,

                DeliveryType = e.DO_ModeLivraison,
                PaymentMethod = e.DO_ModePaiement,
                Address = e.DO_AdresseLivraison,
                City = e.DO_VilleLivraison,
                PostalCode = e.DO_CodePostalLivraison,
                Latitude = e.DO_LatitudeLivraison,
                Longitude = e.DO_LongitudeLivraison,

                Lines = lignes.Select(l => new BonLivraisonLineResponseDto
                {
                    ArticleRef = l.AR_Ref ?? string.Empty,
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountHT = l.DL_MontantHT ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList()
            });
        }

        private static string BuildSourceBcPiece(string? blPiece)
        {
            var piece = (blPiece ?? string.Empty).Trim();

            if (piece.Length >= 2 && piece.StartsWith("BL", StringComparison.OrdinalIgnoreCase))
                return "BC" + piece.Substring(2);

            return piece;
        }
    }
}