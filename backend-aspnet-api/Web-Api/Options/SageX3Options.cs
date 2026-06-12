namespace Web_Api.Options
{
    public sealed class SageX3Options
    {
        public const string SectionName = "SageX3";

        /// <summary>Hôte du wrapper WEB_API_STAGE_X3 (IP ou hostname, sans http://). Utilisé pour bâtir l'URL du POST document.</summary>
        public string ApiHost { get; set; } = "localhost";

        /// <summary>Code client générique envoyé à Sage X3 (ex: FR004). Les codes locaux CL+userId n'existent pas dans F_COMPTET Sage.</summary>
        public string DefaultClientCode { get; set; } = "FR004";

        /// <summary>Numéro de dépôt de dernier recours quand F_DEPOTS est vide ET que le BL n'en a pas.</summary>
        public int DefaultDepotNo { get; set; } = 26;
    }
}
