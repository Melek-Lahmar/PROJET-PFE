using System;
using System.Collections.Generic;

namespace Web_Api.Services.Admin.Prediction
{
    /// <summary>
    /// Génère un dataset synthétique reproductible pour entraîner les modèles
    /// quand la base réelle est vide ou trop petite (cas démo PFE).
    /// Patterns intégrés (réalistes pour COD Tunisie) :
    ///   - Sfax / Tunis ont un taux de retour plus bas (zones urbaines)
    ///   - Gabès / Médenine plus haut (zones rurales)
    ///   - Montants élevés (>200 DT) augmentent le risque de retour
    ///   - B2B retourne moins que B2C
    ///   - Weekend (samedi/dimanche) légèrement moins bon en livraison
    ///   - Plus le client a déjà retourné dans le passé, plus il risque de retourner
    /// </summary>
    public static class SyntheticDataGenerator
    {
        private static readonly string[] Governorates =
        {
            "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Bizerte",
            "Sfax", "Sousse", "Monastir", "Mahdia", "Kairouan", "Gafsa",
            "Gabes", "Medenine", "Tataouine", "Kasserine", "Sidi Bouzid",
            "Beja", "Jendouba", "Kef", "Siliana", "Zaghouan", "Tozeur", "Kebili"
        };

        private static readonly string[] PaymentModes = { "CASH", "CARD" };
        private static readonly string[] ClientTypes = { "B2C", "B2B" };
        private static readonly string[] DeliveryModes = { "HOME", "PICKUP" };

        // Probabilités de retour par gouvernorat (réalistes — basé sur urbanité/distance)
        private static readonly Dictionary<string, double> ReturnRateByGov = new()
        {
            { "Tunis", 0.06 }, { "Ariana", 0.07 }, { "Ben Arous", 0.08 },
            { "Manouba", 0.09 }, { "Sfax", 0.07 }, { "Sousse", 0.08 },
            { "Monastir", 0.09 }, { "Bizerte", 0.10 }, { "Nabeul", 0.10 },
            { "Mahdia", 0.12 }, { "Kairouan", 0.14 }, { "Gabes", 0.16 },
            { "Medenine", 0.18 }, { "Tataouine", 0.20 }, { "Kasserine", 0.18 },
            { "Sidi Bouzid", 0.17 }, { "Gafsa", 0.15 }, { "Beja", 0.13 },
            { "Jendouba", 0.14 }, { "Kef", 0.13 }, { "Siliana", 0.13 },
            { "Zaghouan", 0.11 }, { "Tozeur", 0.16 }, { "Kebili", 0.17 }
        };

        public static List<ReturnRiskInput> GenerateReturnRiskDataset(int n = 500, int seed = 42)
        {
            var rng = new Random(seed);
            var result = new List<ReturnRiskInput>(n);

            for (var i = 0; i < n; i++)
            {
                var gov = Governorates[rng.Next(Governorates.Length)];
                var amount = (float)Math.Round(rng.NextDouble() * 380 + 20, 2); // 20..400 DT
                var payment = PaymentModes[rng.Next(PaymentModes.Length)];
                var clientType = rng.NextDouble() < 0.85 ? "B2C" : "B2B";
                var dayOfWeek = (float)rng.Next(0, 7);
                var priorReturns = WeightedRandomInt(rng, new[] { 0.70, 0.20, 0.07, 0.03 });

                // Calcul de la proba de retour à partir des features.
                var baseProb = ReturnRateByGov[gov];
                if (amount > 200) baseProb += 0.08;
                if (amount > 300) baseProb += 0.05;
                if (clientType == "B2B") baseProb -= 0.04;
                if (priorReturns >= 2) baseProb += 0.15;
                else if (priorReturns == 1) baseProb += 0.05;
                if (dayOfWeek >= 5) baseProb += 0.02; // weekend

                // Bornage et jitter aléatoire.
                baseProb = Math.Clamp(baseProb + (rng.NextDouble() - 0.5) * 0.05, 0.01, 0.95);
                var wasReturned = rng.NextDouble() < baseProb;

                result.Add(new ReturnRiskInput
                {
                    Governorate = gov,
                    Amount = amount,
                    PaymentMode = payment,
                    ClientType = clientType,
                    DayOfWeek = dayOfWeek,
                    PriorReturns = priorReturns,
                    WasReturned = wasReturned
                });
            }

            return result;
        }

        public static List<DeliveryFirstAttemptInput> GenerateDeliveryDataset(int n = 500, int seed = 43)
        {
            var rng = new Random(seed);
            var result = new List<DeliveryFirstAttemptInput>(n);

            for (var i = 0; i < n; i++)
            {
                var gov = Governorates[rng.Next(Governorates.Length)];
                var amount = (float)Math.Round(rng.NextDouble() * 380 + 20, 2);
                var payment = PaymentModes[rng.Next(PaymentModes.Length)];
                var deliveryMode = rng.NextDouble() < 0.92 ? "HOME" : "PICKUP";
                var dayOfWeek = (float)rng.Next(0, 7);

                // Taux de succès du premier coup : ~70-80% urbain, ~50-60% rural.
                var baseSuccess = 1.0 - (ReturnRateByGov[gov] * 2.5);
                if (deliveryMode == "PICKUP") baseSuccess += 0.15;
                if (dayOfWeek >= 5) baseSuccess -= 0.05;
                if (amount > 250) baseSuccess -= 0.03;

                baseSuccess = Math.Clamp(baseSuccess + (rng.NextDouble() - 0.5) * 0.05, 0.05, 0.95);
                var success = rng.NextDouble() < baseSuccess;

                result.Add(new DeliveryFirstAttemptInput
                {
                    Governorate = gov,
                    Amount = amount,
                    PaymentMode = payment,
                    DeliveryMode = deliveryMode,
                    DayOfWeek = dayOfWeek,
                    DeliveredFirstAttempt = success
                });
            }

            return result;
        }

        /// <summary>
        /// Série journalière de volume sur N jours avec saisonnalité hebdomadaire
        /// (pic mardi/mercredi, creux dimanche) + tendance haussière + bruit.
        /// </summary>
        public static List<VolumeInput> GenerateVolumeSeries(int days = 120, int seed = 44)
        {
            var rng = new Random(seed);
            var result = new List<VolumeInput>(days);
            var baseLevel = 30.0; // commandes/jour

            for (var i = 0; i < days; i++)
            {
                // Tendance : croissance linéaire douce.
                var trend = i * 0.1;

                // Saisonnalité hebdomadaire (cycle 7 jours).
                var dow = i % 7;
                var seasonal = dow switch
                {
                    0 => -8, // dimanche
                    1 => 4, // lundi
                    2 => 8, // mardi
                    3 => 7, // mercredi
                    4 => 5, // jeudi
                    5 => 2, // vendredi
                    _ => -3 // samedi
                };

                // Bruit normal.
                var noise = (rng.NextDouble() - 0.5) * 6;

                var value = baseLevel + trend + seasonal + noise;
                value = Math.Max(0, value);
                result.Add(new VolumeInput { Orders = (float)Math.Round(value, 0) });
            }

            return result;
        }

        private static int WeightedRandomInt(Random rng, double[] weights)
        {
            var roll = rng.NextDouble();
            var cum = 0.0;
            for (var i = 0; i < weights.Length; i++)
            {
                cum += weights[i];
                if (roll < cum) return i;
            }
            return weights.Length - 1;
        }
    }
}
