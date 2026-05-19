using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Web_Api.Services.Sms
{
    /// <summary>
    /// Section 1.3 — gateway mock pour démo PFE. Loggue le SMS sans appel HTTP.
    /// Le SmsNotificationService écrira aussi une ligne F_SMS_LOG côté DB pour
    /// montrer la traçabilité au jury.
    /// </summary>
    public class MockSmsGateway : ISmsGateway
    {
        private readonly ILogger<MockSmsGateway> _logger;

        public MockSmsGateway(ILogger<MockSmsGateway> logger)
        {
            _logger = logger;
        }

        public string ProviderName => "Mock";

        public Task<SmsResult> SendAsync(string phone, string message)
        {
            _logger.LogInformation("[MockSMS] → {Phone} : {Message}", phone, message);
            return Task.FromResult(new SmsResult { Success = true });
        }
    }
}
