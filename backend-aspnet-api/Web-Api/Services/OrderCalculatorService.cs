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

            if (client != null && client.TypeClient == TypeClient.B2B)
            {
                if (client.DiscountPercent.HasValue && client.DiscountPercent.Value > 0)
                    rate = client.DiscountPercent.Value;
                else if (client.Remise.HasValue && client.Remise.Value > 0)
                    rate = client.Remise.Value;
            }

            decimal discountAmount = 0m;
            if (rate.HasValue)
            {
                discountAmount = decimal.Round(subtotal * (rate.Value / 100m), 3);
            }

            return new OrderTotals
            {
                Subtotal = subtotal,
                DiscountRate = rate,
                DiscountAmount = discountAmount,
                Total = subtotal - discountAmount,
            };
        }

        public sealed class OrderTotals
        {
            public decimal Subtotal { get; init; }
            public decimal? DiscountRate { get; init; }
            public decimal DiscountAmount { get; init; }
            public decimal Total { get; init; }
        }
    }
}
