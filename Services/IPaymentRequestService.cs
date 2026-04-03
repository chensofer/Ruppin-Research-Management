using Microsoft.AspNetCore.Http;
using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IPaymentRequestService
    {
        Task<List<PaymentRequestResponseDto>> GetByProject(int projectId);
        Task<PaymentRequestResponseDto> Create(int projectId, CreatePaymentRequestDto dto);
        Task<PaymentRequestResponseDto?> UpdateStatus(int id, UpdatePaymentRequestStatusDto dto);
        Task<List<PendingPaymentRequestDto>> GetPendingForUser(string userId);
        Task<string?> AppendQuotationFile(int id, IFormFile file, string uploadsRoot);
    }
}
