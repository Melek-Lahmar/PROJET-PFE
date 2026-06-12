using System.Collections.Generic;
using System.IO;
using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Web_Api.Services.Admin.Export
{
    /// <summary>
    /// Section 4.7 — service générique d'export Excel/PDF utilisé par les
    /// endpoints admin. Limite 10 000 lignes (warning au-delà). Les colonnes
    /// sont définies par l'appelant.
    /// </summary>
    public class ExportService
    {
        public const int MaxRows = 10_000;

        public byte[] ExportToExcel(string sheetName, List<string> headers, List<List<object?>> rows)
        {
            using var wb = new XLWorkbook();
            var ws = wb.AddWorksheet(sheetName.Length > 31 ? sheetName.Substring(0, 31) : sheetName);

            for (int c = 0; c < headers.Count; c++)
                ws.Cell(1, c + 1).Value = headers[c];

            var headerRange = ws.Range(1, 1, 1, headers.Count);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            int take = System.Math.Min(rows.Count, MaxRows);
            for (int r = 0; r < take; r++)
            {
                for (int c = 0; c < rows[r].Count && c < headers.Count; c++)
                {
                    var v = rows[r][c];
                    if (v is null) continue;
                    if (v is decimal d) ws.Cell(r + 2, c + 1).Value = d;
                    else if (v is double db) ws.Cell(r + 2, c + 1).Value = db;
                    else if (v is int i) ws.Cell(r + 2, c + 1).Value = i;
                    else if (v is long l) ws.Cell(r + 2, c + 1).Value = l;
                    else if (v is bool b) ws.Cell(r + 2, c + 1).Value = b;
                    else if (v is System.DateTime dt) ws.Cell(r + 2, c + 1).Value = dt;
                    else ws.Cell(r + 2, c + 1).Value = v.ToString();
                }
            }

            ws.Columns().AdjustToContents();
            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public byte[] ExportToPdf(string title, string period, List<string> headers, List<List<object?>> rows)
        {
            int take = System.Math.Min(rows.Count, MaxRows);

            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(20);
                    page.Header().Column(col =>
                    {
                        col.Item().Text(title).FontSize(18).Bold();
                        col.Item().Text($"Période : {period}").FontSize(10);
                        if (rows.Count > take)
                            col.Item().Text($"Lignes affichées : {take} / {rows.Count} (limite {MaxRows})").FontSize(10).FontColor(Colors.Orange.Darken2);
                        else
                            col.Item().Text($"Total lignes : {rows.Count}").FontSize(10);
                    });
                    page.Content().PaddingVertical(10).Column(col =>
                    {
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                for (int i = 0; i < headers.Count; i++) c.RelativeColumn();
                            });
                            table.Header(h =>
                            {
                                foreach (var head in headers)
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text(head).Bold();
                            });
                            for (int r = 0; r < take; r++)
                            {
                                for (int c = 0; c < rows[r].Count && c < headers.Count; c++)
                                {
                                    var v = rows[r][c]?.ToString() ?? string.Empty;
                                    table.Cell().Padding(4).Text(v).FontSize(9);
                                }
                            }
                        });
                    });
                    page.Footer().AlignCenter().Text(t =>
                    {
                        t.Span("Page ");
                        t.CurrentPageNumber();
                        t.Span(" / ");
                        t.TotalPages();
                    });
                });
            });

            using var ms = new MemoryStream();
            pdf.GeneratePdf(ms);
            return ms.ToArray();
        }
    }
}
