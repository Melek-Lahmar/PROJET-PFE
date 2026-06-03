using System.ComponentModel;

namespace Web_Api.Helpers
{
    public class Enumeration
    {
        public enum Http
        {
            [Description("Http")]
            Http = 0,
            [Description("Https")]
            Https = 1,
        }
    }
}
