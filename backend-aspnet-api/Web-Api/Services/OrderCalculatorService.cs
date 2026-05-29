using Web_Api.Auth.Entities;

namespace Web_Api.Services
{
    /// <summary>
    /// Module 4 (Master Prompt) — Calcule un récapitulatif HT/remise/total pour
    /// une commande, en appliquant la remise B2B (snapshot du taux au moment de
    /// la commande, pas du taux courant — voir IMPLEMENTATION_DECISIONS.md D14/D15).
    /// </summary>
    public sealed class OrderCalculatorService
    {
        public OrderTotals Compute(decimal subtotal, ProfilUtilisateur? client)
        {
            decimal? rate = null;
            string? source = null;

            if (client != null && client.TypeClient == TypeClient.B2B)
            {
                if (client.DiscountPercent.HasValue && client.DiscountPercent.Value > 0)
                {
                    rate = client.DiscountPercent.Value;
                    source = "DiscountPercent";
                }
                else if (client.Remise.HasValue && client.Remise.Value > 0)
                {
                    rate = client.Remise.Value;
                    source = "LegacyRemise";
                }
            }

            decimal discountAmount = 0m;
            if (rate.HasValue)
            {
                rate = Math.Clamp(rate.Value, 0m, 100m);
                discountAmount = decimal.Round(subtotal * (rate.Value / 100m), 3);
            }

            var total = subtotal - discountAmount;
            if (total < 0m)
                total = 0m;

            return new OrderTotals
            {
                Subtotal = subtotal,
                DiscountRate = rate is > 0m ? rate : null,
                DiscountAmount = discountAmount,
                DiscountSource = rate is > 0m ? source : null,
                Total = total,
            };
        }

        public sealed class OrderTotals
        {
            public decimal Subtotal { get; init; }
            public decimal? DiscountRate { get; init; }
            public decimal DiscountAmount { get; init; }
            public string? DiscountSource { get; init; }
            public decimal Total { get; init; }
        }
    }
}
