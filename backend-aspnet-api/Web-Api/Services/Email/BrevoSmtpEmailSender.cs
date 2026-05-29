using System.Net;
using System.Net.Security;
using System.Net.Sockets;
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

            _logger.LogInformation("Envoi email reset password vers {Email}", toEmail);
            await SendSmtpMailAsync(
                toEmail,
                "Réinitialisation de votre mot de passe",
                BuildResetPasswordHtml(resetUrl));
        }

        private async Task SendSmtpMailAsync(string toEmail, string subject, string htmlBody)
        {
            using var tcpClient = new TcpClient();
            await tcpClient.ConnectAsync(_options.Host, _options.Port);

            await using var networkStream = tcpClient.GetStream();

            if (_options.EnableSsl)
            {
                using (var plainReader = CreateReader(networkStream))
                using (var plainWriter = CreateWriter(networkStream))
                {
                    await ExpectResponseAsync(plainReader, "connexion SMTP", 220);
                    await SendCommandAsync(plainWriter, plainReader, $"EHLO {Dns.GetHostName()}", "EHLO initial", 250);
                    await SendCommandAsync(plainWriter, plainReader, "STARTTLS", "STARTTLS", 220);
                }

                await using var sslStream = new SslStream(networkStream, leaveInnerStreamOpen: false);
                await sslStream.AuthenticateAsClientAsync(_options.Host);
                await SendAuthenticatedMessageAsync(sslStream, toEmail, subject, htmlBody);
                return;
            }

            await SendAuthenticatedMessageAsync(networkStream, toEmail, subject, htmlBody, readGreeting: true);
        }

        private async Task SendAuthenticatedMessageAsync(
            Stream stream,
            string toEmail,
            string subject,
            string htmlBody,
            bool readGreeting = false)
        {
            using var reader = CreateReader(stream);
            using var writer = CreateWriter(stream);

            if (readGreeting)
                await ExpectResponseAsync(reader, "connexion SMTP", 220);

            await SendCommandAsync(writer, reader, $"EHLO {Dns.GetHostName()}", "EHLO sécurisé", 250);
            await SendCommandAsync(writer, reader, "AUTH LOGIN", "AUTH LOGIN", 334);
            await SendCommandAsync(writer, reader, ToBase64(_options.Username), "identifiant SMTP", 334);
            await SendCommandAsync(writer, reader, ToBase64(_options.Password), "mot de passe SMTP", 235);
            await SendCommandAsync(writer, reader, $"MAIL FROM:<{_options.FromEmail}>", "MAIL FROM", 250);
            await SendCommandAsync(writer, reader, $"RCPT TO:<{toEmail}>", "RCPT TO", 250, 251);
            await SendCommandAsync(writer, reader, "DATA", "DATA", 354);
            await WriteMessageDataAsync(writer, reader, toEmail, subject, htmlBody);
            await SendCommandAsync(writer, reader, "QUIT", "QUIT", 221);
        }

        private static StreamReader CreateReader(Stream stream)
            => new(stream, Encoding.ASCII, detectEncodingFromByteOrderMarks: false, leaveOpen: true);

        private static StreamWriter CreateWriter(Stream stream)
            => new(stream, Encoding.ASCII, leaveOpen: true)
            {
                AutoFlush = true,
                NewLine = "\r\n"
            };

        private async Task WriteMessageDataAsync(
            StreamWriter writer,
            StreamReader reader,
            string toEmail,
            string subject,
            string htmlBody)
        {
            await writer.WriteLineAsync($"Date: {DateTimeOffset.UtcNow:R}");
            await writer.WriteLineAsync($"From: {EncodeHeader(_options.FromName)} <{_options.FromEmail}>");
            await writer.WriteLineAsync($"To: <{toEmail}>");
            await writer.WriteLineAsync($"Subject: {EncodeHeader(subject)}");
            await writer.WriteLineAsync("MIME-Version: 1.0");
            await writer.WriteLineAsync("Content-Type: text/html; charset=utf-8");
            await writer.WriteLineAsync("Content-Transfer-Encoding: base64");
            await writer.WriteLineAsync();

            foreach (var line in WrapBase64(Convert.ToBase64String(Encoding.UTF8.GetBytes(htmlBody))))
                await writer.WriteLineAsync(line);

            await writer.WriteLineAsync(".");
            await writer.FlushAsync();
            await ExpectResponseAsync(reader, "envoi du contenu email", 250);
        }

        private static async Task SendCommandAsync(
            StreamWriter writer,
            StreamReader reader,
            string command,
            string step,
            params int[] expectedStatuses)
        {
            await writer.WriteLineAsync(command);
            await writer.FlushAsync();
            await ExpectResponseAsync(reader, step, expectedStatuses);
        }

        private static async Task ExpectResponseAsync(
            StreamReader reader,
            string step,
            params int[] expectedStatuses)
        {
            var status = 0;
            var response = new StringBuilder();

            while (true)
            {
                var line = await reader.ReadLineAsync();
                if (line is null)
                    throw new InvalidOperationException($"Réponse SMTP vide pendant l'étape {step}.");

                response.AppendLine(line);

                if (line.Length < 4 || !int.TryParse(line[..3], out status))
                    throw new InvalidOperationException($"Réponse SMTP invalide pendant l'étape {step}: {line}");

                if (line[3] == ' ')
                    break;
            }

            if (!expectedStatuses.Contains(status))
            {
                throw new InvalidOperationException(
                    $"Erreur SMTP pendant l'étape {step}. Code reçu: {status}. Réponse: {response.ToString().Trim()}");
            }
        }

        private static string ToBase64(string value)
            => Convert.ToBase64String(Encoding.UTF8.GetBytes(value));

        private static string EncodeHeader(string value)
            => $"=?UTF-8?B?{ToBase64(value)}?=";

        private static IEnumerable<string> WrapBase64(string value)
        {
            const int lineLength = 76;
            for (var index = 0; index < value.Length; index += lineLength)
                yield return value.Substring(index, Math.Min(lineLength, value.Length - index));
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
