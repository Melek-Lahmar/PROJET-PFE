namespace Web_Api.Auth.Constants
{
    /// <summary>
    /// Motifs client (créés depuis le tracking).
    /// Réclamation = toujours lancée par le client.
    /// </summary>
    public static class ClientMotifs
    {
        // Commande non livrée (5 motifs)
        public const string CHANGEMENT_ADRESSE = "CHANGEMENT_ADRESSE";
        public const string CHANGEMENT_NUMERO = "CHANGEMENT_NUMERO";
        public const string REPROGRAMMATION = "REPROGRAMMATION";
        public const string ANNULATION = "ANNULATION";
        public const string COLIS_NON_RECU = "COLIS_NON_RECU";

        // Commande livrée (2 motifs, photo obligatoire)
        public const string COLIS_ENDOMMAGE = "COLIS_ENDOMMAGE";
        public const string COLIS_NON_CORRESPONDANT = "COLIS_NON_CORRESPONDANT";

        public static readonly string[] All =
        {
            CHANGEMENT_ADRESSE,
            CHANGEMENT_NUMERO,
            REPROGRAMMATION,
            ANNULATION,
            COLIS_NON_RECU,
            COLIS_ENDOMMAGE,
            COLIS_NON_CORRESPONDANT
        };

        /// <summary>Motifs où la photo est obligatoire côté client.</summary>
        public static readonly string[] PhotoObligatoire =
        {
            COLIS_ENDOMMAGE,
            COLIS_NON_CORRESPONDANT
        };

        /// <summary>Motifs qui exigent une correction proposée (nouvelle adresse/numéro).</summary>
        public static readonly string[] RequiresCorrection =
        {
            CHANGEMENT_ADRESSE,
            CHANGEMENT_NUMERO
        };

        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return All.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool NeedsPhoto(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return PhotoObligatoire.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool NeedsCorrection(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return RequiresCorrection.Contains(value.Trim().ToUpperInvariant());
        }
    }

    /// <summary>
    /// Catégories de motifs client filtrées par statut commande.
    /// </summary>
    public static class ClientMotifsByOrderStatus
    {
        /// <summary>Motifs disponibles quand la commande n'est PAS encore livrée.</summary>
        public static readonly string[] BeforeDelivery =
        {
            ClientMotifs.CHANGEMENT_ADRESSE,
            ClientMotifs.CHANGEMENT_NUMERO,
            ClientMotifs.ANNULATION,
            ClientMotifs.REPROGRAMMATION,
            ClientMotifs.COLIS_NON_RECU
        };

        /// <summary>Motifs disponibles quand la commande est livrée.</summary>
        public static readonly string[] AfterDelivery =
        {
            ClientMotifs.COLIS_ENDOMMAGE,
            ClientMotifs.COLIS_NON_CORRESPONDANT
        };

        public static bool IsAllowed(string motif, bool delivered)
        {
            var m = (motif ?? string.Empty).Trim().ToUpperInvariant();
            var allowed = delivered ? AfterDelivery : BeforeDelivery;
            return allowed.Contains(m);
        }
    }

    /// <summary>
    /// Motifs livreur (détectés depuis un changement de statut commande).
    /// Demande = toujours lancée par le livreur.
    /// </summary>
    public static class LivreurMotifs
    {
        // Groupe C — escalation après 3 tentatives (non urgent)
        public const string CLIENT_INJOIGNABLE = "CLIENT_INJOIGNABLE";   // Label UI: "Client non joignable"
        public const string TELEPHONE_ETEINT = "TELEPHONE_ETEINT";       // Label UI: "Téléphone fermé"
        public const string CLIENT_ABSENT = "CLIENT_ABSENT";             // Label UI: "Client absent"

        // Groupe A — escalation immédiate, demande visible côté client
        public const string NUMERO_INCORRECT = "NUMERO_INCORRECT";
        public const string ADRESSE_INCORRECTE = "ADRESSE_INCORRECTE";

        // Groupe B — escalation immédiate, directement à la confirmatrice
        public const string CLIENT_REFUSE = "CLIENT_REFUSE";             // Label UI: "Refus client"
        public const string AUTRE = "AUTRE";                             // Label UI: "Autre incident" — description min 10 car
        // C.1 — Retour au dépôt pour colis endommagé sur le terrain.
        // Escalation immédiate confirmatrice + photo OBLIGATOIRE.
        public const string COLIS_ENDOMMAGE_DEPOT = "COLIS_ENDOMMAGE_DEPOT";

        public static readonly string[] All =
        {
            CLIENT_INJOIGNABLE, TELEPHONE_ETEINT, CLIENT_ABSENT,
            NUMERO_INCORRECT, ADRESSE_INCORRECTE,
            CLIENT_REFUSE, AUTRE,
            COLIS_ENDOMMAGE_DEPOT
        };

        /// <summary>Motifs à escalation différée (3 tentatives avant demande).</summary>
        public static readonly string[] Deferred =
        {
            CLIENT_INJOIGNABLE,
            TELEPHONE_ETEINT,
            CLIENT_ABSENT
        };

        /// <summary>Motifs à escalation immédiate.</summary>
        public static readonly string[] Immediate =
        {
            NUMERO_INCORRECT,
            ADRESSE_INCORRECTE,
            CLIENT_REFUSE,
            AUTRE,
            COLIS_ENDOMMAGE_DEPOT
        };

        /// <summary>Motifs livreur où une photo est obligatoire côté livreur.</summary>
        public static readonly string[] PhotoObligatoire =
        {
            COLIS_ENDOMMAGE_DEPOT
        };

        /// <summary>Motifs livreur qui créent une DEMANDE visible côté client (le client doit agir).</summary>
        public static readonly string[] ProducesClientDemande =
        {
            NUMERO_INCORRECT,
            ADRESSE_INCORRECTE
        };

        /// <summary>Motifs livreur qui escaladent DIRECTEMENT à la confirmatrice (pas de demande client).</summary>
        public static readonly string[] EscaladeDirecte =
        {
            CLIENT_REFUSE,
            AUTRE,
            COLIS_ENDOMMAGE_DEPOT
        };

        /// <summary>Motifs livreur pour lesquels une description est obligatoire (min 10 caractères).</summary>
        public static readonly string[] DescriptionObligatoire =
        {
            AUTRE
        };

        /// <summary>Longueur minimale de la description quand elle est obligatoire.</summary>
        public const int DescriptionMinLength = 10;

        public static bool ProducesDemande(string? motif)
        {
            if (string.IsNullOrWhiteSpace(motif)) return false;
            return ProducesClientDemande.Contains(motif.Trim().ToUpperInvariant());
        }

        /// <summary>
        /// Alias sémantique de ProducesDemande : true si la Demande livreur doit apparaître
        /// dans l'espace client (motifs A). Utilisé pour affecter le flag VisibleClient.
        /// </summary>
        public static bool IsVisibleClient(string? motif) => ProducesDemande(motif);

        public static bool IsEscaladeDirecte(string? motif)
        {
            if (string.IsNullOrWhiteSpace(motif)) return false;
            return EscaladeDirecte.Contains(motif.Trim().ToUpperInvariant());
        }

        public static bool NeedsDescription(string? motif)
        {
            if (string.IsNullOrWhiteSpace(motif)) return false;
            return DescriptionObligatoire.Contains(motif.Trim().ToUpperInvariant());
        }

        /// <summary>Seuil d'escalation pour les motifs différés (3 tentatives).</summary>
        public const int DeferredThreshold = 3;

        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return All.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool IsDeferred(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return Deferred.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool IsImmediate(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return Immediate.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool NeedsPhoto(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return PhotoObligatoire.Contains(value.Trim().ToUpperInvariant());
        }
    }
}
