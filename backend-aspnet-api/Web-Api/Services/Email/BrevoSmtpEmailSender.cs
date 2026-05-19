using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;
using Web_Api.Options;

namespace Web_Api.Services.Email
{
    public sealed class BrevoSmtpEmailSender : IEmailSenderService
    {
        private readonly EmailOptions _options;
        private readonly ILogger<BrevoSmtpEmailSender> _logger;

        public BrevoSmtpEmailSender(
            IOptions<EmailOptions> options,
            ILogger<BrevoSmtpEmailSender> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetUrl)
        {
            ValidateOptions();

            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromEmail, _options.FromName, Encoding.UTF8),
                Subject = "Réinitialisation de votre mot de passe",
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true,
                Body = BuildResetPasswordHtml(resetUrl)
            };

            message.To.Add(new MailAddress(toEmail));

            using var smtp = new SmtpClient(_options.Host, _options.Port)
            {
                Credentials = new NetworkCredential(_options.Username, _options.Password),
                EnableSsl = _options.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Timeout = 30000
            };

            _logger.LogInformation("Envoi email reset password vers {Email}", toEmail);
            await smtp.SendMailAsync(message);
        }

        private void ValidateOptions()
        {
            if (string.IsNullOrWhiteSpace(_options.Host))
                throw new InvalidOperationException("Email:Host manquant.");

            if (_options.Port <= 0)
                throw new InvalidOperationException("Email:Port invalide.");

            if (string.IsNullOrWhiteSpace(_options.Username))
                throw new InvalidOperationException("Email:Username manquant.");

            if (string.IsNullOrWhiteSpace(_options.Password))
                throw new InvalidOperationException("Email:Password manquant.");

            if (string.IsNullOrWhiteSpace(_options.FromEmail))
                throw new InvalidOperationException("Email:FromEmail manquant.");

            if (string.IsNullOrWhiteSpace(_options.FromName))
                throw new InvalidOperationException("Email:FromName manquant.");
        }

        private static string BuildResetPasswordHtml(string resetUrl)
        {
            return $@"
<!doctype html>
<html lang=""fr"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Réinitialisation du mot de passe</title>
</head>
<body style=""margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"">
  <div style=""max-width:640px;margin:40px auto;padding:0 16px;"">
    <div style=""background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.08);"">
      <div style=""height:6px;background:linear-gradient(90deg,#3b82f6 0%,#8b5cf6 100%);""></div>

      <div style=""padding:32px 28px;"">
        <div style=""width:56px;height:56px;line-height:56px;text-align:center;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:#fff;font-size:22px;font-weight:700;margin:0 auto 20px auto;"">
          E
        </div>

        <p style=""text-transform:uppercase;letter-spacing:0.16em;font-size:12px;color:#64748b;text-align:center;margin:0 0 8px 0;"">
          Récupération d'accès
        </p>

        <h1 style=""font-size:30px;line-height:1.2;text-align:center;margin:0 0 12px 0;color:#0f172a;"">
          Réinitialiser votre mot de passe
        </h1>

        <p style=""font-size:15px;line-height:1.7;color:#475569;text-align:center;margin:0 0 28px 0;"">
          Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.
          Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
        </p>

        <div style=""text-align:center;margin:0 0 28px 0;"">
          <a href=""{resetUrl}""
             style=""display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 24px;border-radius:14px;"">
            Réinitialiser mon mot de passe
          </a>
        </div>

        <p style=""font-size:14px;line-height:1.7;color:#64748b;margin:0 0 10px 0;"">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
        </p>

        <p style=""word-break:break-all;font-size:13px;line-height:1.7;color:#2563eb;margin:0 0 24px 0;"">
          {resetUrl}
        </p>

        <p style=""font-size:13px;line-height:1.7;color:#64748b;margin:0;"">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>";
        }
    }
}