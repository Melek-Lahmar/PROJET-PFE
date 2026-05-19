using System.Data;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.BL;
using Web_Api.Model;

namespace Web_Api.Services
{
    public class BcToBlService
    {
        private readonly AppDbContext _db;

        // ✅ Ajuste ici si ton DO_Type BL est différent
        private const short BC_TYPE = 0;
        private const short BL_TYPE = 1;

        public BcToBlService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<(BonLivraisonResponseDto? bl, StockInsufficientResponseDto? stockError, string? errorMessage)>
            ConfirmAndTransformBcToBlAsync(string bcPiece, CancellationToken ct)
        {
            bcPiece = (bcPiece ?? "").Trim();
            if (string.IsNullOrWhiteSpace(bcPiece))
                return (null, null, "Piece invalide.");

            // ✅ Idempotence: si on reçoit déjà un BL => retourner le BL tel quel
            if (bcPiece.StartsWith("BL", StringComparison.OrdinalIgnoreCase))
            {
                var existing = await LoadBlDtoAsync(bcPiece, ct);
                return existing == null ? (null, null, "BL introuvable.") : (existing, null, null);
            }

            // ✅ Charger BC (pré-validation)
            var bc = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Type == BC_TYPE &&
                    x.DO_Piece == bcPiece &&
                    x.DO_Piece != null && x.DO_Piece.StartsWith("BC"), ct);

            if (bc == null)
                return (null, null, "BC introuvable.");

            // Dépôt pour stock
            var depotNo = bc.DE_No ?? 0;
            if (depotNo <= 0)
            {
                depotNo = await _db.F_DEPOTS.AsNoTracking()
                    .OrderBy(d => d.DE_No)
                    .Select(d => d.DE_No)
                    .FirstOrDefaultAsync(ct);
            }

            if (depotNo <= 0)
                return (null, null, "Aucun dépôt disponible pour le stock.");

            // BL piece déterministe
            var blPiece = BuildBlPieceFromBcPiece(bcPiece);

            // Transaction SERIALIZABLE => évite double confirmation / oversell stock
            using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            // Recharger BC tracking sous transaction (et vérifier encore)
            var bcTx = await _db.F_DOCENTETES
                .FirstOrDefaultAsync(x =>
                    x.DO_Domaine == 0 &&
                    x.DO_Piece == bcPiece &&
                    x.DO_Type == BC_TYPE &&
                    x.DO_Piece != null && x.DO_Piece.StartsWith("BC"), ct);

            if (bcTx == null)
            {
                await tx.RollbackAsync(ct);
                return (null, null, "BC introuvable.");
            }

            // ✅ Idempotence: déjà transformée
            if (bcTx.DO_Piece != null && bcTx.DO_Piece.StartsWith("BL"))
            {
                await tx.CommitAsync(ct);
                var dto = await LoadBlDtoAsync(bcTx.DO_Piece, ct);
                return dto == null ? (null, null, "BL introuvable.") : (dto, null, null);
            }

            // Charger lignes BC tracking
            var linesTx = await _db.F_DOCLIGNES
                .Where(l => l.DO_Domaine == 0 && l.DO_Type == BC_TYPE && l.DO_Piece == bcPiece)
                .ToListAsync(ct);

            if (linesTx.Count == 0)
            {
                await tx.RollbackAsync(ct);
                return (null, null, "BC sans lignes.");
            }

            // 1) Vérifier stock
            var insuff = await CheckStockAsync(linesTx, depotNo, ct);
            if (insuff.Items.Count > 0)
            {
                await tx.RollbackAsync(ct);
                return (null, insuff, null);
            }

            // 2) Décrémenter stock
            foreach (var line in linesTx)
            {
                var arRef = (line.AR_Ref ?? "").Trim();
                var qty = GetDecimal(line.DL_Qte);

                if (string.IsNullOrWhiteSpace(arRef) || qty <= 0m)
                    continue;

                var art = await _db.F_ARTICLES.AsNoTracking().FirstOrDefaultAsync(a => a.AR_Ref == arRef, ct);
                if (art == null) continue;

                if (art.AR_SuiviStock != 1) continue;

                var stockRow = await _db.F_ARTSTOCKS
                    .FirstOrDefaultAsync(s => s.AR_Ref == arRef && s.DE_No == depotNo, ct);

                if (stockRow == null)
                {
                    await tx.RollbackAsync(ct);
                    return (null,
                        new StockInsufficientResponseDto
                        {
                            Message = "Stock indisponible",
                            Items = new List<StockInsufficientItemDto>
                            {
                                new StockInsufficientItemDto
                                {
                                    ArticleRef = arRef,
                                    RequestedQty = qty,
                                    AvailableQty = 0m,
                                    DepotNo = depotNo
                                }
                            }
                        },
                        null);
                }

                var qteSto = GetDecimal(stockRow.AS_QteSto);
                var qteRes = GetDecimal(stockRow.AS_QteRes);

                var dispo = qteSto - qteRes;
                if (dispo < qty)
                {
                    await tx.RollbackAsync(ct);
                    return (null,
                        new StockInsufficientResponseDto
                        {
                            Message = "Stock insuffisant",
                            Items = new List<StockInsufficientItemDto>
                            {
                                new StockInsufficientItemDto
                                {
                                    ArticleRef = arRef,
                                    RequestedQty = qty,
                                    AvailableQty = dispo,
                                    DepotNo = depotNo
                                }
                            }
                        },
                        null);
                }

                // ✅ Affectation directe (compatible decimal et decimal?)
                stockRow.AS_QteSto = qteSto - qty;
            }

            // 3) Transformer BC -> BL (même doc)
            var other = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == blPiece, ct);
            if (other != null)
            {
                await tx.RollbackAsync(ct);
                return (null, null, $"Impossible de transformer: DO_Piece {blPiece} existe déjà.");
            }

            // Update entête (même doc)
            bcTx.DO_Piece = blPiece;
            bcTx.DO_Type = BL_TYPE;
            bcTx.DO_Valide = 1;

            if (!string.IsNullOrWhiteSpace(bcTx.DO_Ref))
                bcTx.DO_Ref = bcTx.DO_Ref.Replace("WEB-BC-", "WEB-BL-", StringComparison.OrdinalIgnoreCase);

            bcTx.cbModification = DateTime.UtcNow;

            // Update lignes
            foreach (var l in linesTx)
            {
                l.DO_Piece = blPiece;
                l.DO_Type = BL_TYPE;
                l.cbModification = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            var blDto = await LoadBlDtoAsync(blPiece, ct);
            if (blDto != null)
                blDto.SourceBcPiece = bcPiece;

            return blDto == null ? (null, null, "BL introuvable après transformation.") : (blDto, null, null);
        }

        private static string BuildBlPieceFromBcPiece(string bcPiece)
        {
            if (bcPiece.StartsWith("BC", StringComparison.OrdinalIgnoreCase) && bcPiece.Length >= 3)
                return "BL" + bcPiece.Substring(2);

            return "BL" + bcPiece;
        }

        private async Task<StockInsufficientResponseDto> CheckStockAsync(List<F_DOCLIGNE> lines, int depotNo, CancellationToken ct)
        {
            var res = new StockInsufficientResponseDto { Message = "Stock insuffisant" };

            foreach (var line in lines)
            {
                var arRef = (line.AR_Ref ?? "").Trim();
                var qty = GetDecimal(line.DL_Qte);

                if (string.IsNullOrWhiteSpace(arRef) || qty <= 0m)
                    continue;

                var art = await _db.F_ARTICLES.AsNoTracking().FirstOrDefaultAsync(a => a.AR_Ref == arRef, ct);
                if (art == null) continue;

                if (art.AR_SuiviStock != 1) continue;

                var st = await _db.F_ARTSTOCKS.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.AR_Ref == arRef && s.DE_No == depotNo, ct);

                var qteSto = st == null ? 0m : GetDecimal(st.AS_QteSto);
                var qteRes = st == null ? 0m : GetDecimal(st.AS_QteRes);

                var dispo = qteSto - qteRes;
                if (dispo < qty)
                {
                    res.Items.Add(new StockInsufficientItemDto
                    {
                        ArticleRef = arRef,
                        RequestedQty = qty,
                        AvailableQty = dispo,
                        DepotNo = depotNo
                    });
                }
            }

            return res;
        }

        private async Task<BonLivraisonResponseDto?> LoadBlDtoAsync(string blPiece, CancellationToken ct)
        {
            var e = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == blPiece && x.DO_Domaine == 0 && x.DO_Type == BL_TYPE, ct);

            if (e == null) return null;

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Piece == blPiece && l.DO_Domaine == 0 && l.DO_Type == BL_TYPE)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            return new BonLivraisonResponseDto
            {
                Piece = e.DO_Piece ?? "",
                Date = e.DO_Date,
                SourceBcPiece = null,

                ClientCode = e.DO_Tiers ?? "",
                DepotNo = e.DE_No ?? 0,
                Status = e.DocumentStatus,

                TotalHT = GetDecimal(e.DO_TotalHT),
                TotalTTC = GetDecimal(e.DO_TotalTTC),
                FraisLivraison = GetDecimal(e.DO_FraisLivraison),
                TimbreFiscal = GetDecimal(e.DO_TimbreFiscal),
                NetAPayer = GetDecimal(e.DO_NetAPayer),

                DeliveryType = e.DO_ModeLivraison,
                PaymentMethod = e.DO_ModePaiement,

                Address = e.DO_AdresseLivraison,
                City = e.DO_VilleLivraison,
                PostalCode = e.DO_CodePostalLivraison,
                Latitude = e.DO_LatitudeLivraison,
                Longitude = e.DO_LongitudeLivraison,

                Lines = lignes.Select(l => new BonLivraisonLineResponseDto
                {
                    ArticleRef = l.AR_Ref ?? "",
                    Designation = l.DL_Design,
                    Qty = GetDecimal(l.DL_Qte),
                    UnitPrice = GetDecimal(l.DL_PrixUnitaire),
                    AmountHT = GetDecimal(l.DL_MontantHT),
                    AmountTTC = GetDecimal(l.DL_MontantTTC)
                }).ToList()
            };
        }

        // ✅ Helpers: compat decimal vs decimal?
        private static decimal GetDecimal(decimal value) => value;
        private static decimal GetDecimal(decimal? value) => value ?? 0m;
    }
}