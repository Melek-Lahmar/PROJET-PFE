using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_ARTSTOCK")]
        public class F_ARTSTOCK
        {
            public int cbMarq { get; set; }

            public string AR_Ref { get; set; } = null!;

            public int DE_No { get; set; }

            public decimal AS_QteSto { get; set; }

            public decimal AS_QteRes { get; set; }

            public decimal? AS_QteMini { get; set; }

            public decimal? AS_QteMaxi { get; set; }

            public short AS_Principal { get; set; }
        }
    }