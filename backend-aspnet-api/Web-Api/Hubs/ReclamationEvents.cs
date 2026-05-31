namespace Web_Api.Hubs
{
    /// <summary>
    /// Phase 5 — Noms des 8 événements SignalR figés par le plan V final + 1 événement
    /// additionnel pour la redistribution 3C. Règle de principe : événement = signal,
    /// API = vérité. Une reconnexion déclenche un rechargement complet.
    /// </summary>
    public static class ReclamationEvents
    {
        /// <summary>1. Nouveau cas attribué. Push vers : la confirmatrice attribuée,
        /// + le client si c'est une Demande livreur visible (motif A).</summary>
        public const string NouveauCas = "NouveauCas";

        /// <summary>2. Changement de statut d'un cas (Envoyée → En cours → Clôturée...).
        /// Push vers : le client + la conf assignée.</summary>
        public const string StatutCasChange = "StatutCasChange";

        /// <summary>3. Mécanisme A — une confirmatrice ouvre une commande du pool.
        /// Push vers le groupe confirmateurs (les autres voient la commande grisée).</summary>
        public const string CommandePriseEnCharge = "CommandePriseEnCharge";

        /// <summary>4. Mécanisme A — verrou libéré (unlock, transform, ou stale).
        /// Push vers le groupe confirmateurs.</summary>
        public const string CommandeLiberee = "CommandeLiberee";

        /// <summary>5. Client a répondu sur sa Demande (clic Appliquer).
        /// Push vers la conf attribuée. TODO(phase 5-bis) : à brancher dans
        /// ReclamationsService.ReplyToDemandeAsync ou ApplyCorrectionAsync côté client.</summary>
        public const string ClientARepondu = "ClientARepondu";

        /// <summary>6. 3e tentative d'un motif différé atteinte → création auto de Demande.
        /// TODO(phase 5-bis) : à brancher dans RecordLivreurAttemptAsync après l'escalade.</summary>
        public const string SeuilTentativesAtteint = "SeuilTentativesAtteint";

        /// <summary>7. Statut commande (DO_Valide) change. Push vers client + livreur assigné.
        /// TODO(phase 5-bis) : à brancher dans les controllers confirmatrice/livreur qui
        /// changent DO_Valide (transform-to-bl, delivered, reports).</summary>
        public const string StatutCommandeChange = "StatutCommandeChange";

        /// <summary>8. Correction appliquée par le client sur une Demande A.
        /// TODO(phase 5-bis) : à brancher dans ApplyCorrectionAsync — destinataires
        /// livreur + client.</summary>
        public const string CorrectionAppliquee = "CorrectionAppliquee";

        /// <summary>Additionnel — redistribution 3C (un cas change de conf attribuée).
        /// Push vers l'ancienne conf (retrait) + la nouvelle conf (ajout).</summary>
        public const string CasReattribue = "CasReattribue";

        /// <summary>Section 2.8.2 — un cas est libéré (pause volontaire, déconnexion brutale,
        /// timeout 30 min, abandon volontaire). Push vers le groupe confirmateurs pour leur
        /// permettre de remonter le cas dans la file. Charge utile : { id, motif, releaseReason }.</summary>
        public const string CasLibere = "CasLibere";

        /// <summary>Section 2.8.2 — une nouvelle commande est attribuée à une confirmatrice
        /// (push 1A). Charge utile : { piece, dateDocument, totalTtc, gouvernorat }. Push direct
        /// vers la confirmatrice cible via Clients.User().</summary>
        public const string CommandeAttribuee = "CommandeAttribuee";

        /// <summary>Nouvelle alerte superviseur créée (zone sans livreur, transit bloqué, etc.).
        /// Push vers le groupe superviseurs. Charge : { id, severity, alertType, message }.</summary>
        public const string NouvelleAlerte = "NouvelleAlerte";

        // Noms des groupes SignalR utilisés par le hub.
        public const string GroupConfirmateurs = "confirmateurs";
        public const string GroupLivreurs = "livreurs";
        public const string GroupSuperviseurs = "superviseurs";
    }
}
