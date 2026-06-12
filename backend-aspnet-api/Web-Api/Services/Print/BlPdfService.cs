using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SkiaSharp;
using System.Text.Json;
using Web_Api.data;
using Web_Api.DTO.BL;
using Web_Api.Model;
using ZXing;
using ZXing.Common;
using ZXing.SkiaSharp;

namespace Web_Api.Services.Print
{
    public class BlPdfService
    {
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _http;

        // Palette
        private static readonly string PrimaryHex   = "#1E3A5F";
        private static readonly string AccentHex    = "#2563EB";
        private static readonly string AccentLightHex = "#EFF6FF";
        private static readonly string BorderHex    = "#CBD5E1";
        private static readonly string MutedHex     = "#64748B";
        private static readonly string SuccessHex   = "#15803D";

        public BlPdfService(AppDbContext db, IHttpClientFactory http)
        {
            _db = db;
            _http = http;
        }

        // ── Logo ──────────────────────────────────────────────────────────────

        public async Task<byte[]?> FetchLogoBytesAsync(PrintSettings settings, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(settings.LogoUrl)) return null;
            try
            {
                var client = _http.CreateClient();
                return await client.GetByteArrayAsync(settings.LogoUrl, ct);
            }
            catch { return null; }
        }

        // ── Settings ──────────────────────────────────────────────────────────

        public async Task<PrintSettings> GetSettingsAsync(CancellationToken ct = default)
        {
            return await _db.PrintSettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == 1, ct)
                ?? new PrintSettings { Id = 1, CompanyName = "Mon Entreprise" };
        }

        public async Task<PrintFieldsConfig> GetFieldsConfigAsync(CancellationToken ct = default)
        {
            var s = await GetSettingsAsync(ct);
            try { return JsonSerializer.Deserialize<PrintFieldsConfig>(s.FieldsConfig) ?? new(); }
            catch { return new PrintFieldsConfig(); }
        }

        // ── Barcode ───────────────────────────────────────────────────────────

        private static byte[]? GenerateBarcode(string text, int width = 320, int height = 56)
        {
            try
            {
                var writer = new BarcodeWriter
                {
                    Format = BarcodeFormat.CODE_128,
                    Options = new EncodingOptions
                    {
                        Width = width,
                        Height = height,
                        Margin = 4,
                        PureBarcode = false
                    }
                };
                using var bitmap = writer.Write(text);
                using var image  = SKImage.FromBitmap(bitmap);
                using var data   = image.Encode(SKEncodedImageFormat.Png, 100);
                return data.ToArray();
            }
            catch { return null; }
        }

        // ── BL PDF ────────────────────────────────────────────────────────────

        public byte[] GenerateBLPdf(
            BonLivraisonResponseDto bl,
            PrintSettings settings,
            PrintFieldsConfig cfg,
            string docTitle = "BON DE LIVRAISON",
            byte[]? logoBytes = null)
        {
            var barcodeBytes = GenerateBarcode(bl.Piece);

            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(0);

                    page.Header().Element(c => BuildBlHeader(c, settings, docTitle, logoBytes, bl));
                    page.Content().PaddingHorizontal(24).PaddingTop(12).Column(col =>
                    {
                        // ── Bande N° BL + Barcode ──────────────────────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                if (cfg.ShowBlNumber)
                                {
                                    left.Item().Text(bl.Piece)
                                        .FontSize(20).Bold()
                                        .FontColor(PrimaryHex);
                                }
                                if (cfg.ShowDate && bl.Date.HasValue)
                                    left.Item().Text($"Date : {bl.Date.Value:dd/MM/yyyy  HH:mm}")
                                        .FontSize(9).FontColor(MutedHex);
                                if (cfg.ShowDepot)
                                    left.Item().Text($"Dépôt N° {bl.DepotNo}")
                                        .FontSize(9).FontColor(MutedHex);
                                if (cfg.ShowSourceBc && !string.IsNullOrWhiteSpace(bl.SourceBcPiece))
                                    left.Item().Text($"Réf. BC : {bl.SourceBcPiece}")
                                        .FontSize(9).FontColor(MutedHex);
                                if (cfg.ShowLivreur)
                                    left.Item().PaddingTop(4).Text("Livreur : ___________________________")
                                        .FontSize(9).FontColor(MutedHex);
                            });

                            // Barcode à droite
                            if (barcodeBytes != null)
                            {
                                row.ConstantItem(160).AlignRight().AlignMiddle()
                                    .MaxHeight(56).Image(barcodeBytes).FitWidth();
                            }
                        });

                        // ── Bandeau TRANSIT inter-dépôt (uniquement BL transit) ──
                        if (string.Equals(bl.RouteType, "TRANSIT", StringComparison.OrdinalIgnoreCase))
                        {
                            col.Item().PaddingTop(8)
                                .Background(TransitAccentLightHex)
                                .Border(1).BorderColor(TransitAccentHex)
                                .Padding(8).Row(r =>
                            {
                                r.AutoItem().Background(TransitAccentHex)
                                    .PaddingHorizontal(8).PaddingVertical(4).AlignMiddle()
                                    .Text("TRANSIT INTER-DÉPÔT")
                                    .FontColor(Colors.White).Bold().FontSize(8);
                                r.AutoItem().PaddingHorizontal(8).AlignMiddle()
                                    .Text("▶").FontColor(TransitAccentHex).Bold().FontSize(11);
                                r.RelativeItem().AlignMiddle().Column(c =>
                                {
                                    var dest = !string.IsNullOrWhiteSpace(bl.DestinationDepotName)
                                        ? bl.DestinationDepotName!
                                        : (!string.IsNullOrWhiteSpace(bl.DestinationGouvernorat)
                                            ? $"Dépôt {bl.DestinationGouvernorat}" : "Dépôt destination");
                                    c.Item().Text(dest).Bold().FontSize(10).FontColor(PrimaryHex);
                                    if (!string.IsNullOrWhiteSpace(bl.DestinationGouvernorat))
                                        c.Item().Text($"Gouvernorat de destination : {bl.DestinationGouvernorat}")
                                            .FontSize(8).FontColor(TransitMutedHex);
                                });
                            });
                        }

                        col.Item().PaddingVertical(10)
                            .BorderBottom(1).BorderColor(BorderHex);

                        // ── Infos client ───────────────────────────────────
                        col.Item().PaddingTop(10).Row(row =>
                        {
                            // Bloc client
                            row.RelativeItem(3)
                                .Border(1).BorderColor(AccentHex)
                                .Background(AccentLightHex)
                                .Padding(10).Column(c =>
                            {
                                c.Item().Text("DESTINATAIRE").FontSize(7)
                                    .Bold().FontColor(AccentHex)
                                    .LetterSpacing(0.08f);
                                c.Item().PaddingTop(4);
                                if (cfg.ShowClientCode)
                                    c.Item().Text(bl.ClientCode).FontSize(11).Bold()
                                        .FontColor(PrimaryHex);
                                if (!string.IsNullOrWhiteSpace(bl.Address))
                                    c.Item().PaddingTop(2).Text(bl.Address).FontSize(9);
                                if (!string.IsNullOrWhiteSpace(bl.City))
                                {
                                    var cityLine = string.IsNullOrWhiteSpace(bl.PostalCode)
                                        ? bl.City
                                        : $"{bl.PostalCode}  {bl.City}";
                                    c.Item().Text(cityLine).FontSize(9);
                                }
                                if (!string.IsNullOrWhiteSpace(bl.DestinationGouvernorat))
                                    c.Item().PaddingTop(1).Text($"Gouvernorat : {bl.DestinationGouvernorat}")
                                        .FontSize(8.5f).FontColor(MutedHex);
                                if (cfg.ShowClientPhone && !string.IsNullOrWhiteSpace(bl.ClientPhone))
                                    c.Item().PaddingTop(3).Row(r =>
                                    {
                                        r.AutoItem().Text("✆ ").FontSize(9).FontColor(AccentHex);
                                        r.RelativeItem().Text(bl.ClientPhone).FontSize(9).Bold();
                                    });
                            });

                            row.ConstantItem(12);

                            // Récapitulatif financier
                            row.RelativeItem(2).Column(right =>
                            {
                                void Kv(string label, string value, bool highlight = false)
                                {
                                    right.Item()
                                        .Background(highlight ? PrimaryHex : "#FFFFFF")
                                        .BorderBottom(1).BorderColor(BorderHex)
                                        .Padding(5).Row(r =>
                                    {
                                        r.RelativeItem().Text(label).FontSize(9)
                                            .FontColor(highlight ? "#FFFFFF" : MutedHex);
                                        r.AutoItem().Text(value).FontSize(9).Bold()
                                            .FontColor(highlight ? "#FFFFFF" : PrimaryHex);
                                    });
                                }
                                if (cfg.ShowTotalHT)
                                    Kv("Total HT", bl.TotalHT.ToString("N3") + " TND");
                                if (cfg.ShowTVA)
                                    Kv("TVA", (bl.TotalTTC - bl.TotalHT).ToString("N3") + " TND");
                                Kv("Total TTC", bl.TotalTTC.ToString("N3") + " TND");
                                if (cfg.ShowFraisLivraison && bl.FraisLivraison > 0)
                                    Kv("Frais livraison", bl.FraisLivraison.ToString("N3") + " TND");
                                if (cfg.ShowTimbreFiscal && bl.TimbreFiscal > 0)
                                    Kv("Timbre fiscal", bl.TimbreFiscal.ToString("N3") + " TND");
                                if (cfg.ShowNetAPayer)
                                    Kv("NET À PAYER", bl.NetAPayer.ToString("N3") + " TND", highlight: true);
                            });
                        });

                        col.Item().PaddingTop(14);

                        // ── Tableau articles ──────────────────────────────
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(55);   // Réf
                                c.RelativeColumn(3);    // Désignation
                                c.ConstantColumn(42);   // Qté
                                if (cfg.ShowUnitPriceHT) c.ConstantColumn(62);
                                if (cfg.ShowAmountHT)    c.ConstantColumn(62);
                                if (cfg.ShowAmountTTC)   c.ConstantColumn(62);
                            });

                            table.Header(h =>
                            {
                                void Th(string text, bool right = false)
                                {
                                    var cell = h.Cell().Background(PrimaryHex).Padding(6)
                                        .Text(text).FontColor(Colors.White).Bold().FontSize(8);
                                    if (right) cell.AlignRight();
                                }
                                Th("Référence");
                                Th("Désignation");
                                Th("Qté", true);
                                if (cfg.ShowUnitPriceHT) Th("PU HT", true);
                                if (cfg.ShowAmountHT)    Th("Mnt HT", true);
                                if (cfg.ShowAmountTTC)   Th("Mnt TTC", true);
                            });

                            bool alt = false;
                            foreach (var line in bl.Lines ?? new())
                            {
                                var bg = alt ? "#F8FAFC" : "#FFFFFF";
                                alt = !alt;

                                table.Cell().Background(bg).BorderBottom(1).BorderColor("#EEF2FF")
                                    .Padding(5).Text(line.ArticleRef).FontSize(8).FontColor(MutedHex);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor("#EEF2FF")
                                    .Padding(5).Text(line.Designation ?? "").FontSize(8.5f);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor("#EEF2FF")
                                    .Padding(5).AlignRight().Text(line.Qty.ToString("N2")).FontSize(8).Bold();
                                if (cfg.ShowUnitPriceHT)
                                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#EEF2FF")
                                        .Padding(5).AlignRight().Text(line.UnitPrice.ToString("N3")).FontSize(8);
                                if (cfg.ShowAmountHT)
                                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#EEF2FF")
                                        .Padding(5).AlignRight().Text(line.AmountHT.ToString("N3")).FontSize(8);
                                if (cfg.ShowAmountTTC)
                                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#EEF2FF")
                                        .Padding(5).AlignRight().Text(line.AmountTTC.ToString("N3")).FontSize(8);
                            }
                        });

                        // ── Signatures ────────────────────────────────────
                        if (cfg.ShowSignatureClient || cfg.ShowSignatureLivreur)
                        {
                            col.Item().PaddingTop(24).Row(row =>
                            {
                                if (cfg.ShowSignatureLivreur)
                                    row.RelativeItem().Border(1).BorderColor(BorderHex)
                                        .Padding(10).Column(c =>
                                    {
                                        c.Item().Text("Signature du livreur").FontSize(8)
                                            .Bold().FontColor(MutedHex);
                                        c.Item().Height(40);
                                        c.Item().BorderBottom(1).BorderColor(BorderHex);
                                    });

                                row.ConstantItem(20);

                                if (cfg.ShowSignatureClient)
                                    row.RelativeItem().Border(1).BorderColor(BorderHex)
                                        .Padding(10).Column(c =>
                                    {
                                        c.Item().Text("Signature & cachet client").FontSize(8)
                                            .Bold().FontColor(MutedHex);
                                        c.Item().Height(40);
                                        c.Item().BorderBottom(1).BorderColor(BorderHex);
                                    });
                            });
                        }
                    });

                    page.Footer().Element(c => BuildFooter(c, settings));
                });
            });

            using var ms = new MemoryStream();
            pdf.GeneratePdf(ms);
            return ms.ToArray();
        }

        // ── Facture PDF ───────────────────────────────────────────────────────

        public byte[] GenerateFacturePdf(
            FacturePdfDto facture,
            PrintSettings settings,
            byte[]? logoBytes = null)
        {
            var tva = facture.TotalTTC - facture.TotalHT;

            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(0);

                    page.Header().Element(c =>
                    {
                        c.Background(PrimaryHex).PaddingHorizontal(28).PaddingVertical(16).Row(row =>
                        {
                            row.RelativeItem().Column(col =>
                            {
                                if (logoBytes != null)
                                    col.Item().MaxHeight(48).MaxWidth(80).Image(logoBytes).FitWidth();
                                col.Item().PaddingTop(logoBytes != null ? 6 : 0)
                                    .Text(settings.CompanyName ?? "")
                                    .FontColor(Colors.White).Bold().FontSize(15);
                                if (!string.IsNullOrWhiteSpace(settings.CompanyAddress))
                                    col.Item().Text(settings.CompanyAddress).FontColor("#93C5FD").FontSize(8);
                                if (!string.IsNullOrWhiteSpace(settings.CompanyPhone))
                                    col.Item().Text($"Tél : {settings.CompanyPhone}").FontColor("#93C5FD").FontSize(8);
                                if (!string.IsNullOrWhiteSpace(settings.MatriculeFiscal))
                                    col.Item().Text($"MF : {settings.MatriculeFiscal}").FontColor("#93C5FD").FontSize(8);
                                if (!string.IsNullOrWhiteSpace(settings.RegistreCommerce))
                                    col.Item().Text($"RC : {settings.RegistreCommerce}").FontColor("#93C5FD").FontSize(8);
                            });

                            row.AutoItem().AlignRight().AlignMiddle().Column(col =>
                            {
                                col.Item().Background(AccentHex).PaddingHorizontal(18).PaddingVertical(8)
                                    .AlignCenter().Text("FACTURE")
                                    .FontColor(Colors.White).Bold().FontSize(16);
                                col.Item().PaddingTop(6).AlignRight()
                                    .Text($"N° {facture.Piece}")
                                    .FontColor(Colors.White).Bold().FontSize(11);
                                col.Item().AlignRight()
                                    .Text(facture.Date.HasValue ? $"Date : {facture.Date.Value:dd/MM/yyyy}" : "")
                                    .FontColor("#93C5FD").FontSize(8.5f);
                            });
                        });
                    });

                    page.Content().PaddingHorizontal(28).PaddingTop(14).Column(col =>
                    {
                        // Bloc expéditeur / client
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Border(1).BorderColor(BorderHex)
                                .Background("#F8FAFC").Padding(10).Column(c =>
                            {
                                c.Item().Text("EXPÉDITEUR").FontSize(7).Bold()
                                    .FontColor(MutedHex).LetterSpacing(0.1f);
                                c.Item().PaddingTop(4)
                                    .Text(settings.CompanyName ?? "")
                                    .FontSize(10).Bold().FontColor(PrimaryHex);
                                if (!string.IsNullOrWhiteSpace(facture.DepotIntitule))
                                    c.Item().Text($"Dépôt : {facture.DepotIntitule}")
                                        .FontSize(8.5f).FontColor(MutedHex);
                                else
                                    c.Item().Text($"Dépôt N° {facture.DepotNo}")
                                        .FontSize(8.5f).FontColor(MutedHex);
                                if (!string.IsNullOrWhiteSpace(facture.VendeurName))
                                    c.Item().PaddingTop(3)
                                        .Text($"Vendeur : {facture.VendeurName}")
                                        .FontSize(8.5f).FontColor(MutedHex);
                                if (!string.IsNullOrWhiteSpace(facture.PaymentMethod))
                                    c.Item().PaddingTop(3)
                                        .Text($"Règlement : {facture.PaymentMethod}")
                                        .FontSize(8.5f).FontColor(MutedHex);
                            });

                            row.ConstantItem(12);

                            row.RelativeItem().Border(1).BorderColor(AccentHex)
                                .Background(AccentLightHex).Padding(10).Column(c =>
                            {
                                c.Item().Text("CLIENT / DESTINATAIRE").FontSize(7).Bold()
                                    .FontColor(AccentHex).LetterSpacing(0.1f);
                                c.Item().PaddingTop(4)
                                    .Text(!string.IsNullOrWhiteSpace(facture.ClientName)
                                        ? facture.ClientName : facture.ClientCode)
                                    .FontSize(10).Bold().FontColor(PrimaryHex);
                                c.Item().Text($"Code : {facture.ClientCode}")
                                    .FontSize(8.5f).FontColor(MutedHex);
                                if (!string.IsNullOrWhiteSpace(facture.ClientPhone))
                                    c.Item().PaddingTop(3).Row(r =>
                                    {
                                        r.AutoItem().Text("✆ ").FontSize(9).FontColor(AccentHex);
                                        r.RelativeItem().Text(facture.ClientPhone).FontSize(8.5f).Bold();
                                    });
                                if (!string.IsNullOrWhiteSpace(facture.ClientAddress))
                                    c.Item().PaddingTop(2).Text(facture.ClientAddress).FontSize(8.5f);
                                if (!string.IsNullOrWhiteSpace(facture.ClientCity))
                                {
                                    var cityLine = string.IsNullOrWhiteSpace(facture.ClientPostalCode)
                                        ? facture.ClientCity
                                        : $"{facture.ClientPostalCode}  {facture.ClientCity}";
                                    c.Item().Text(cityLine).FontSize(8.5f);
                                }
                                if (!string.IsNullOrWhiteSpace(facture.ClientMatriculeFiscal))
                                    c.Item().PaddingTop(3)
                                        .Text($"MF : {facture.ClientMatriculeFiscal}")
                                        .FontSize(8).FontColor(MutedHex);
                                if (!string.IsNullOrWhiteSpace(facture.ClientRegistreCommerce))
                                    c.Item().Text($"RC : {facture.ClientRegistreCommerce}")
                                        .FontSize(8).FontColor(MutedHex);
                            });
                        });

                        col.Item().PaddingTop(14);

                        // Tableau articles
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(22);
                                c.ConstantColumn(56);
                                c.RelativeColumn(3);
                                c.ConstantColumn(38);
                                c.ConstantColumn(62);
                                c.ConstantColumn(58);
                                c.ConstantColumn(62);
                            });

                            table.Header(h =>
                            {
                                void Th(string text, bool right = false)
                                {
                                    var cell = h.Cell().Background(PrimaryHex).Padding(6)
                                        .Text(text).FontColor(Colors.White).Bold().FontSize(7.5f);
                                    if (right) cell.AlignRight();
                                }
                                Th("#"); Th("Référence"); Th("Désignation");
                                Th("Qté", true); Th("PU HT", true);
                                Th("Mnt HT", true); Th("Mnt TTC", true);
                            });

                            int idx = 1;
                            bool alt = false;
                            foreach (var line in facture.Lines ?? new())
                            {
                                var bg = alt ? "#F1F5F9" : "#FFFFFF";
                                alt = !alt;
                                const string border = "#E2E8F0";

                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(idx.ToString()).FontSize(7.5f).FontColor(MutedHex);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(line.ArticleRef).FontSize(7.5f).FontColor(MutedHex);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(line.Designation ?? "").FontSize(8.5f);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).AlignRight().Text(line.Qty.ToString("N2")).FontSize(8).Bold();
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).AlignRight().Text(line.UnitPrice.ToString("N3")).FontSize(8);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).AlignRight().Text(line.AmountHT.ToString("N3")).FontSize(8);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).AlignRight().Text(line.AmountTTC.ToString("N3")).FontSize(8).Bold();
                                idx++;
                            }
                        });

                        col.Item().PaddingTop(14);

                        // Récapitulatif financier
                        col.Item().AlignRight().Width(230).Column(right =>
                        {
                            void Kv(string label, string value, bool highlight = false, bool sep = false)
                            {
                                right.Item()
                                    .Background(highlight ? PrimaryHex : "#FFFFFF")
                                    .BorderBottom(sep ? 2 : 1)
                                    .BorderColor(highlight ? PrimaryHex : BorderHex)
                                    .PaddingHorizontal(10).PaddingVertical(5)
                                    .Row(r =>
                                    {
                                        r.RelativeItem().Text(label).FontSize(8.5f)
                                            .FontColor(highlight ? "#FFFFFF" : MutedHex);
                                        r.AutoItem().Text(value).FontSize(8.5f).Bold()
                                            .FontColor(highlight ? "#FFFFFF" : PrimaryHex);
                                    });
                            }
                            Kv("Total HT", facture.TotalHT.ToString("N3") + " TND");
                            if (tva > 0)
                                Kv("TVA", tva.ToString("N3") + " TND");
                            Kv("Total TTC", facture.TotalTTC.ToString("N3") + " TND", sep: true);
                            if (facture.FraisLivraison > 0)
                                Kv("Frais de livraison", facture.FraisLivraison.ToString("N3") + " TND");
                            if (facture.TimbreFiscal > 0)
                                Kv("Timbre fiscal", facture.TimbreFiscal.ToString("N3") + " TND");
                            Kv("NET À PAYER", facture.NetAPayer.ToString("N3") + " TND", highlight: true);
                        });

                        col.Item().PaddingTop(18)
                            .Text("Cette facture est établie à titre de preuve de vente. " +
                                  "Tout litige doit être signalé dans les 8 jours suivant réception.")
                            .FontSize(7.5f).FontColor(MutedHex).Italic();
                    });

                    page.Footer().Element(c => BuildFooter(c, settings));
                });
            });

            using var ms = new MemoryStream();
            pdf.GeneratePdf(ms);
            return ms.ToArray();
        }

        // ── Manifeste PDF ─────────────────────────────────────────────────────

        public byte[] GenerateManifestePdf(
            ManifestePrintBloc bloc,
            List<ManifestePrintBlocLine> lines,
            PrintSettings settings,
            byte[]? logoBytes = null)
        {
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(0);

                    page.Header().Element(c => BuildManifestHeader(c, settings, bloc, logoBytes));
                    page.Content().PaddingHorizontal(24).PaddingTop(12).Column(col =>
                    {
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(22);   // #
                                c.ConstantColumn(118);  // BL + code-barres
                                c.ConstantColumn(70);   // Client
                                c.RelativeColumn(2);    // Adresse
                                c.ConstantColumn(68);   // Tél
                                c.ConstantColumn(68);   // Montant
                                c.ConstantColumn(52);   // Signature
                            });

                            table.Header(h =>
                            {
                                foreach (var head in new[] { "#", "N° BL", "Client", "Adresse", "Téléphone", "Montant", "Signature" })
                                    h.Cell().Background(PrimaryHex).Padding(6)
                                        .Text(head).FontColor(Colors.White).Bold().FontSize(8);
                            });

                            int idx = 1;
                            bool alt = false;
                            foreach (var line in lines)
                            {
                                var bg = alt ? "#F8FAFC" : "#FFFFFF";
                                alt = !alt;
                                var border = "#EEF2FF";

                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(idx.ToString()).FontSize(8).FontColor(MutedHex);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Column(blc =>
                                {
                                    blc.Item().Text(line.BLPiece).Bold().FontSize(8).FontColor(PrimaryHex);
                                    var bc = GenerateBarcode(line.BLPiece, 200, 26);
                                    if (bc != null)
                                        blc.Item().PaddingTop(2).MaxHeight(22).Image(bc).FitWidth();
                                });
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(line.ClientCode ?? "").FontSize(8);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(
                                        (line.ClientAddress ?? "") +
                                        (string.IsNullOrEmpty(line.ClientCity) ? "" : $", {line.ClientCity}")
                                    ).FontSize(7.5f).FontColor(MutedHex);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Text(line.ClientPhone ?? "").FontSize(8);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).AlignRight().Text(line.Amount.ToString("N3") + " TND")
                                    .FontSize(8).Bold().FontColor(PrimaryHex);
                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                    .Padding(5).Height(20);
                                idx++;
                            }
                        });

                        // Total manifeste
                        col.Item().PaddingTop(10).AlignRight().Width(260)
                            .Background(PrimaryHex).Padding(8).Row(r =>
                        {
                            r.RelativeItem().Text($"TOTAL MANIFESTE  ({lines.Count} BLs)")
                                .FontColor(Colors.White).Bold().FontSize(10);
                            r.AutoItem().Text(bloc.TotalAmount.ToString("N3") + " TND")
                                .FontColor(Colors.White).Bold().FontSize(10);
                        });
                    });

                    page.Footer().Element(c => BuildFooter(c, settings));
                });
            });

            using var ms = new MemoryStream();
            pdf.GeneratePdf(ms);
            return ms.ToArray();
        }

        // ── Header BL ─────────────────────────────────────────────────────────

        private static void BuildBlHeader(
            IContainer container,
            PrintSettings settings,
            string docTitle,
            byte[]? logoBytes,
            BonLivraisonResponseDto bl)
        {
            container.Background(PrimaryHex).PaddingHorizontal(24).PaddingVertical(14).Row(row =>
            {
                // Logo
                if (logoBytes != null)
                    row.AutoItem().PaddingRight(14).MaxWidth(80).MaxHeight(50).AlignMiddle().Image(logoBytes);

                // Infos société
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text(settings.CompanyName ?? "").FontColor(Colors.White).Bold().FontSize(14);
                    if (!string.IsNullOrWhiteSpace(settings.CompanyAddress))
                        col.Item().Text(settings.CompanyAddress).FontColor("#93C5FD").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(settings.CompanyPhone))
                        col.Item().Text($"Tél : {settings.CompanyPhone}").FontColor("#93C5FD").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(settings.MatriculeFiscal))
                        col.Item().Text($"MF : {settings.MatriculeFiscal}").FontColor("#93C5FD").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(settings.RegistreCommerce))
                        col.Item().Text($"RC : {settings.RegistreCommerce}").FontColor("#93C5FD").FontSize(8);
                });

                // Titre document
                row.AutoItem().AlignRight().AlignMiddle().Column(col =>
                {
                    col.Item().Background(AccentHex).Padding(10).AlignCenter()
                        .Text(docTitle).FontColor(Colors.White).Bold().FontSize(13);
                });
            });
        }

        // ── Header Manifeste ──────────────────────────────────────────────────

        private static void BuildManifestHeader(
            IContainer container,
            PrintSettings settings,
            ManifestePrintBloc bloc,
            byte[]? logoBytes)
        {
            container.Background(PrimaryHex).PaddingHorizontal(24).PaddingVertical(14).Row(row =>
            {
                if (logoBytes != null)
                    row.AutoItem().PaddingRight(14).MaxWidth(80).MaxHeight(50).AlignMiddle().Image(logoBytes);

                row.RelativeItem().Column(col =>
                {
                    col.Item().Text(settings.CompanyName ?? "").FontColor(Colors.White).Bold().FontSize(14);
                    if (!string.IsNullOrWhiteSpace(settings.CompanyAddress))
                        col.Item().Text(settings.CompanyAddress).FontColor("#93C5FD").FontSize(8);
                    col.Item().PaddingTop(4)
                        .Text($"Dépôt N° {bloc.DepotNo}  ·  {bloc.BLCount} bon(s)  ·  {bloc.PrintedAt:dd/MM/yyyy HH:mm}")
                        .FontColor("#93C5FD").FontSize(8);
                });

                row.AutoItem().AlignRight().AlignMiddle().Column(col =>
                {
                    col.Item().Background(AccentHex).Padding(10).AlignCenter()
                        .Text("MANIFESTE D'EXPÉDITION").FontColor(Colors.White).Bold().FontSize(11);
                    col.Item().PaddingTop(4).AlignRight()
                        .Text($"N° {bloc.Id}").FontColor("#93C5FD").FontSize(9);
                });
            });
        }

        // ── Transit Manifeste PDF ─────────────────────────────────────────────

        // Alignées sur la palette bleue commune → même apparence que BL / manifeste domicile.
        private static readonly string TransitAccentHex      = "#2563EB"; // = AccentHex (bleu)
        private static readonly string TransitAccentLightHex = "#EFF6FF"; // = AccentLightHex
        private static readonly string TransitGroupBgHex     = "#DBEAFE"; // blue-100
        private static readonly string TransitGroupBorderHex = "#93C5FD"; // blue-300
        private static readonly string TransitHeaderHex      = "#1E3A5F"; // = PrimaryHex

        public byte[] GenerateTransitManifestePdf(
            TransitManifestDto data,
            PrintSettings settings,
            byte[]? logoBytes = null)
        {
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(0);

                    // ── En-tête ──────────────────────────────────────────────
                    page.Header().Element(c =>
                    {
                        c.Background(TransitHeaderHex).PaddingHorizontal(24).PaddingVertical(14).Column(header =>
                        {
                            header.Item().Row(row =>
                            {
                                // Logo à gauche (même placement/taille que BL & manifeste domicile)
                                if (logoBytes != null)
                                    row.AutoItem().PaddingRight(14).MaxWidth(80).MaxHeight(50).AlignMiddle().Image(logoBytes);

                                // Infos société
                                row.RelativeItem().Column(col =>
                                {
                                    col.Item().Text(settings.CompanyName ?? "")
                                        .FontColor(Colors.White).Bold().FontSize(14);
                                    if (!string.IsNullOrWhiteSpace(settings.CompanyAddress))
                                        col.Item().Text(settings.CompanyAddress).FontColor("#93C5FD").FontSize(8);
                                    if (!string.IsNullOrWhiteSpace(settings.CompanyPhone))
                                        col.Item().Text($"Tél : {settings.CompanyPhone}").FontColor("#93C5FD").FontSize(8);
                                    if (!string.IsNullOrWhiteSpace(settings.MatriculeFiscal))
                                        col.Item().Text($"MF : {settings.MatriculeFiscal}").FontColor("#93C5FD").FontSize(8);
                                });

                                // Badge TRANSIT
                                row.AutoItem().AlignRight().AlignMiddle().Column(badge =>
                                {
                                    badge.Item().Background(TransitAccentHex)
                                        .PaddingHorizontal(16).PaddingVertical(10)
                                        .AlignCenter()
                                        .Text("MANIFESTE TRANSIT")
                                        .FontColor(Colors.White).Bold().FontSize(11);
                                    badge.Item().PaddingTop(5).AlignRight()
                                        .Text($"INTER-DÉPÔT  N° {data.BlocId}")
                                        .FontColor("#BFDBFE").Bold().FontSize(9);
                                    badge.Item().AlignRight()
                                        .Text(data.PrintedAt.ToString("dd/MM/yyyy  HH:mm"))
                                        .FontColor("#93C5FD").FontSize(8);
                                });
                            });

                            // Bande route source
                            header.Item().PaddingTop(8).Row(row =>
                            {
                                row.AutoItem()
                                    .Background(TransitAccentHex)
                                    .PaddingHorizontal(10).PaddingVertical(4)
                                    .Text("DÉPÔT SOURCE")
                                    .FontColor(Colors.White).Bold().FontSize(7.5f);
                                row.AutoItem().PaddingHorizontal(6).AlignMiddle()
                                    .Text("▶").FontColor(TransitAccentHex).FontSize(10);
                                row.AutoItem().AlignMiddle()
                                    .Text(!string.IsNullOrWhiteSpace(data.SourceDepotIntitule)
                                        ? data.SourceDepotIntitule
                                        : "Dépôt")
                                    .FontColor(Colors.White).Bold().FontSize(9);
                                if (!string.IsNullOrWhiteSpace(data.SourceGouvernorat))
                                {
                                    row.AutoItem().PaddingLeft(6).AlignMiddle()
                                        .Text($"({data.SourceGouvernorat})")
                                        .FontColor("#93C5FD").FontSize(8.5f);
                                }
                                row.RelativeItem();
                                row.AutoItem().AlignMiddle()
                                    .Text($"{data.TotalBLs} BL(s)  ·  {data.Groups.Count} destination(s)  ·  {data.TotalAmount:N3} TND")
                                    .FontColor("#BFDBFE").FontSize(8.5f).Bold();
                            });
                        });
                    });

                    // ── Contenu ──────────────────────────────────────────────
                    page.Content().PaddingHorizontal(24).PaddingTop(14).Column(col =>
                    {
                        // Bande récap
                        col.Item()
                            .Background(TransitGroupBgHex)
                            .Border(1).BorderColor(TransitGroupBorderHex)
                            .Padding(10).Row(row =>
                        {
                            void Stat(string label, string value)
                            {
                                row.AutoItem().PaddingRight(24).Column(c =>
                                {
                                    c.Item().Text(label).FontSize(7).Bold().FontColor("#1E3A5F").LetterSpacing(0.08f);
                                    c.Item().PaddingTop(2).Text(value).FontSize(13).Bold().FontColor(TransitAccentHex);
                                });
                            }
                            Stat("TOTAL BLs",        data.TotalBLs.ToString());
                            Stat("DESTINATIONS",     data.Groups.Count.ToString());
                            Stat("MONTANT TOTAL",    data.TotalAmount.ToString("N3") + " TND");
                        });

                        col.Item().PaddingTop(12);

                        // ── Groupes par dépôt destination ─────────────────
                        foreach (var group in data.Groups)
                        {
                            // En-tête groupe
                            col.Item().Background(TransitAccentHex).Padding(8).Row(row =>
                            {
                                row.AutoItem().Text("→").FontColor(Colors.White).Bold().FontSize(13);
                                row.AutoItem().PaddingLeft(8).Column(c =>
                                {
                                    c.Item().Text(
                                        !string.IsNullOrWhiteSpace(group.DestinationDepotName)
                                            ? group.DestinationDepotName.ToUpper()
                                            : (!string.IsNullOrWhiteSpace(group.DestinationGouvernorat)
                                                ? $"DÉPÔT {group.DestinationGouvernorat.ToUpper()}"
                                                : "DÉPÔT INCONNU")
                                    ).FontColor(Colors.White).Bold().FontSize(10);
                                    if (!string.IsNullOrWhiteSpace(group.DestinationGouvernorat))
                                        c.Item().Text($"Gouvernorat : {group.DestinationGouvernorat}")
                                            .FontColor("#BFDBFE").FontSize(7.5f);
                                });
                                row.RelativeItem();
                                row.AutoItem().AlignRight().AlignMiddle().Column(c =>
                                {
                                    c.Item().Text($"{group.Items.Count} BL(s)")
                                        .FontColor("#BFDBFE").FontSize(8.5f).Bold();
                                    c.Item().Text(group.GroupTotal.ToString("N3") + " TND")
                                        .FontColor(Colors.White).Bold().FontSize(11);
                                });
                            });

                            // BLs du groupe
                            foreach (var bl in group.Items)
                            {
                                var barcodeBytes = GenerateBarcode(bl.Piece, 200, 36);

                                col.Item()
                                    .Border(1).BorderColor(TransitGroupBorderHex)
                                    .Background("#FFFFFF")
                                    .Column(blCol =>
                                {
                                    // Ligne entête BL
                                    blCol.Item().Background(TransitAccentLightHex)
                                        .Padding(6).Row(row =>
                                    {
                                        // N° BL + Barcode
                                        row.AutoItem().Column(c =>
                                        {
                                            c.Item().Text(bl.Piece)
                                                .FontSize(11).Bold().FontColor(TransitAccentHex);
                                            if (!string.IsNullOrWhiteSpace(bl.ClientCode))
                                                c.Item().Text($"Code : {bl.ClientCode}")
                                                    .FontSize(7.5f).FontColor(TransitMutedHex);
                                        });

                                        // Infos client (centre)
                                        row.RelativeItem().PaddingHorizontal(10).Column(c =>
                                        {
                                            var displayName = bl.ClientName ?? bl.ClientCode;
                                            if (!string.IsNullOrWhiteSpace(displayName))
                                                c.Item().Text(displayName).FontSize(9).Bold().FontColor(PrimaryHex);
                                            if (!string.IsNullOrWhiteSpace(bl.ClientPhone))
                                                c.Item().Text($"✆ {bl.ClientPhone}").FontSize(8.5f).FontColor(TransitAccentHex);
                                            if (!string.IsNullOrWhiteSpace(bl.Address))
                                                c.Item().Text(bl.Address).FontSize(7.5f).FontColor(TransitMutedHex);
                                            if (!string.IsNullOrWhiteSpace(bl.City))
                                                c.Item().Text(bl.City).FontSize(7.5f).FontColor(TransitMutedHex);
                                        });

                                        // Montant + barcode
                                        row.AutoItem().AlignRight().Column(c =>
                                        {
                                            c.Item().AlignRight().Text("NET À PAYER")
                                                .FontSize(7).FontColor(TransitMutedHex).Bold().LetterSpacing(0.06f);
                                            c.Item().AlignRight()
                                                .Text(bl.NetAPayer.ToString("N3") + " TND")
                                                .FontSize(12).Bold().FontColor(PrimaryHex);
                                            if (barcodeBytes != null)
                                                c.Item().PaddingTop(4).AlignRight()
                                                    .MaxWidth(120).MaxHeight(32)
                                                    .Image(barcodeBytes).FitWidth();
                                        });
                                    });

                                    // Tableau articles
                                    if (bl.Lines != null && bl.Lines.Count > 0)
                                    {
                                        blCol.Item().Padding(6).Table(table =>
                                        {
                                            table.ColumnsDefinition(c =>
                                            {
                                                c.ConstantColumn(60);  // Réf
                                                c.RelativeColumn(3);   // Désignation
                                                c.ConstantColumn(38);  // Qté
                                                c.ConstantColumn(72);  // Mnt TTC
                                            });

                                            table.Header(h =>
                                            {
                                                void Th(string t, bool right = false)
                                                {
                                                    var cell = h.Cell()
                                                        .Background("#F1F5F9")
                                                        .BorderBottom(1).BorderColor(TransitGroupBorderHex)
                                                        .Padding(4)
                                                        .Text(t).FontSize(7).Bold().FontColor(TransitMutedHex);
                                                    if (right) cell.AlignRight();
                                                }
                                                Th("Référence"); Th("Désignation");
                                                Th("Qté", true); Th("Mnt TTC", true);
                                            });

                                            bool alt = false;
                                            foreach (var line in bl.Lines)
                                            {
                                                var bg = alt ? "#EFF6FF" : "#FFFFFF";
                                                alt = !alt;
                                                const string border = "#BFDBFE";

                                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                                    .Padding(3.5f).Text(line.ArticleRef).FontSize(7.5f)
                                                    .FontColor(TransitMutedHex);
                                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                                    .Padding(3.5f).Text(line.Designation ?? "").FontSize(8);
                                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                                    .Padding(3.5f).AlignRight()
                                                    .Text(line.Qty.ToString("N2")).FontSize(8).Bold();
                                                table.Cell().Background(bg).BorderBottom(1).BorderColor(border)
                                                    .Padding(3.5f).AlignRight()
                                                    .Text(line.AmountTTC.ToString("N3") + " TND")
                                                    .FontSize(8).Bold().FontColor(PrimaryHex);
                                            }
                                        });
                                    }
                                });

                                col.Item().Height(4); // espacement inter-BL
                            }

                            // Sous-total groupe
                            col.Item()
                                .Background(TransitGroupBgHex)
                                .BorderBottom(2).BorderColor(TransitAccentHex)
                                .PaddingHorizontal(12).PaddingVertical(5)
                                .AlignRight()
                                .Text($"Sous-total  {group.DestinationGouvernorat}  :  {group.GroupTotal:N3} TND  ({group.Items.Count} BL)")
                                .FontSize(9).Bold().FontColor(TransitAccentHex);

                            col.Item().Height(10);
                        }

                        // ── Total général ──────────────────────────────────
                        col.Item().PaddingTop(4)
                            .Background(TransitHeaderHex)
                            .Padding(10).Row(row =>
                        {
                            row.RelativeItem()
                                .Text($"TOTAL GÉNÉRAL TRANSIT  ·  {data.TotalBLs} BL(s)  ·  {data.Groups.Count} destination(s)")
                                .FontColor(Colors.White).Bold().FontSize(10);
                            row.AutoItem()
                                .Text(data.TotalAmount.ToString("N3") + " TND")
                                .FontColor("#BFDBFE").Bold().FontSize(12);
                        });

                        // ── Zones de signature ─────────────────────────────
                        col.Item().PaddingTop(20).Row(row =>
                        {
                            void SigBox(string title, string subtitle)
                            {
                                row.RelativeItem()
                                    .Border(1).BorderColor(TransitGroupBorderHex)
                                    .Background(TransitAccentLightHex)
                                    .Padding(10).Column(c =>
                                {
                                    c.Item().Background(TransitAccentHex)
                                        .Padding(5).AlignCenter()
                                        .Text(title).FontColor(Colors.White).Bold().FontSize(8);
                                    c.Item().PaddingTop(4)
                                        .Text(subtitle).FontSize(7.5f).FontColor(TransitMutedHex);
                                    c.Item().PaddingTop(4)
                                        .Text("Nom : ________________________________")
                                        .FontSize(8);
                                    c.Item().PaddingTop(3)
                                        .Text("Tél : ________________________________")
                                        .FontSize(8);
                                    c.Item().PaddingTop(10).Text("Signature & Cachet :").FontSize(8).FontColor(TransitMutedHex);
                                    c.Item().Height(36).BorderBottom(1).BorderColor(BorderHex);
                                });
                            }

                            SigBox("LIVREUR TRANSIT", "Responsable du transfert");
                            row.ConstantItem(8);
                            SigBox("CHEF DÉPÔT SOURCE", "Validation départ");
                            row.ConstantItem(8);
                            SigBox("DÉPÔT RÉCEPTEUR", "Accusé de réception");
                        });
                    });

                    page.Footer().Element(c => BuildFooter(c, settings));
                });
            });

            using var ms = new MemoryStream();
            pdf.GeneratePdf(ms);
            return ms.ToArray();
        }

        private static readonly string TransitMutedHex = "#64748B"; // = MutedHex

        // ── Footer ────────────────────────────────────────────────────────────

        private static void BuildFooter(IContainer container, PrintSettings settings)
        {
            container.Background("#F8FAFC").BorderTop(1).BorderColor(BorderHex)
                .PaddingHorizontal(24).PaddingVertical(6).Row(row =>
            {
                row.RelativeItem().Text(settings.FooterText ?? "Merci de votre confiance.")
                    .FontSize(7.5f).FontColor(MutedHex);
                row.AutoItem().Text(t =>
                {
                    t.Span("Page ").FontSize(7.5f).FontColor(MutedHex);
                    t.CurrentPageNumber().FontSize(7.5f).FontColor(MutedHex);
                    t.Span(" / ").FontSize(7.5f).FontColor(MutedHex);
                    t.TotalPages().FontSize(7.5f).FontColor(MutedHex);
                });
            });
        }
    }
}
