using System.Threading;
using System.Threading.Tasks;
using Web_Api.DTO.Payments;

namespace Web_Api.Services.Payments
{
    public interface IKonnectClient
    {
        Task<KonnectInitiatePaymentApiResponse> InitiatePaymentAsync(
            KonnectInitiatePaymentApiRequest request,
            CancellationToken ct = default);

        Task<KonnectPaymentDetailsApiResponse> GetPaymentDetailsAsync(
            string paymentId,
            CancellationToken ct = default);
    }
}