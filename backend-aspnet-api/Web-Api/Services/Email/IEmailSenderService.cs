namespace Web_Api.Services.Email
{
    public interface IEmailSenderService
    {
        Task SendPasswordResetEmailAsync(string toEmail, string resetUrl);
    }
}