namespace Web_Api.DTO.Livreur
{
    public class LivreurStatsDto
    {
        public string ScopeLabel { get; set; } = string.Empty;
        public int TotalCommandes { get; set; }
        public int Livrees { get; set; }
        public int EnLivraison { get; set; }
        public int Reportees { get; set; }
        public int Retournees { get; set; }
        public LivreurCashboxDto CashCod { get; set; } = new();
        public List<LivreurStatsTopZoneDto> TopZones { get; set; } = new();
        public LivreurPerformanceDto Performance { get; set; } = new();
        public List<int> Sparkline7Jours { get; set; } = new();
    }

    public class LivreurCashboxDto
    {
        public decimal TotalTnd { get; set; }
        public int NombrePaiements { get; set; }
        public bool RemisAuDepot { get; set; }
        public DateTime? RemisAt { get; set; }
    }

    public class LivreurStatsTopZoneDto
    {
        public string Ville { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class LivreurPerformanceDto
    {
        public double TauxLivraison { get; set; }
        public double TauxRetour { get; set; }
        public double DeltaLivraisonVsJourPrecedent { get; set; }
    }

    public class CashboxRemettreRequestDto
    {
        /// <summary>Date du jour à rendre, format yyyy-MM-dd. Optionnelle (défaut : aujourd'hui).</summary>
        public string? Date { get; set; }
    }

    public class HeatmapCellDto
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public double Weight { get; set; }
    }

    public class HeatmapResponseDto
    {
        public List<HeatmapCellDto> Cells { get; set; } = new();
        public int Days { get; set; }
        public string? Gouvernorat { get; set; }
    }

    public class TourneeStopDto
    {
        public string Piece { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string? Address { get; set; }
        public string? ClientName { get; set; }
        public int OrderIndex { get; set; }
        public double DistanceFromPreviousKm { get; set; }
        public double CumulativeDistanceKm { get; set; }
        public int CumulativeEtaMinutes { get; set; }
    }

    public class TourneeOptimizeResponseDto
    {
        public List<TourneeStopDto> Stops { get; set; } = new();
        public double TotalDistanceKm { get; set; }
        public int TotalEtaMinutes { get; set; }
        public double StartLat { get; set; }
        public double StartLng { get; set; }
    }
}
