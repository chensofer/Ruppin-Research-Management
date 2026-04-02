using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IPaymentRequestService
    {
        Task<List<PaymentRequestResponseDto>> GetByProject(int projectId);
        Task<PaymentRequestResponseDto> Create(int projectId, CreatePaymentRequestDto dto);
        Task<PaymentRequestResponseDto?> UpdateStatus(int id, UpdatePaymentRequestStatusDto dto);
    }
}
