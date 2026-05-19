using System.Threading.Tasks;

namespace Web_Api.Services.Sms
{
    /// <summary>
    /// Section 1.3 — gateway SMS abstraite. Permet de switcher entre Mock
    /// (démo PFE, pas d'appel HTTP, log F_SMS_LOG) et TunisieTelecom (prod).
    /// </summary>
    public interface ISmsGateway
    {
        Task<SmsResult> SendAsync(string phone, string message);
        string ProviderName { get; }
    }

    public class SmsResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
