namespace Web_Api.DTO
{
    public class DOCUMENT
    {
        public string DO_NumDocument { get; set; }//Numero document web

        public DateTime DO_Date { get; set; }

        public int DE_No { get; set; }

        public string CT_Num { get; set; }//Code client

        public string DO_Ref { get; set; }//Reference document web

        public decimal? DO_TotalTTC { get; set; }

        public List<LIGNE_DOCUMENT> LIGNEDOCUMENTs { get; set; }
    }
}
