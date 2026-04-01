using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Models;

namespace RupResearchAPI.Services
{
    public class PaymentRequestService : IPaymentRequestService
    {
        private readonly AppDbContext _db;

        public PaymentRequestService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<PaymentRequestResponseDto>> GetByProject(int projectId)
        {
            return await _db.ResearchPaymentRequests
                .Where(r => r.ProjectId == projectId)
                .OrderByDescending(r => r.RequestDate)
                .Select(r => ToDto(r))
                .ToListAsync();
        }

        public async Task<PaymentRequestResponseDto> Create(int projectId, CreatePaymentRequestDto dto)
        {
            var request = new ResearchPaymentRequest
            {
                ProjectId = projectId,
                RequestedByUserId = dto.RequestedByUserId,
                ProviderId = dto.ProviderId,
                CategoryName = dto.CategoryName,
                RequestTitle = dto.RequestTitle,
                RequestDescription = dto.RequestDescription,
                RequestedAmount = dto.RequestedAmount,
                RequestDate = dto.RequestDate ?? DateOnly.FromDateTime(DateTime.Today),
                DueDate = dto.DueDate,
                Status = dto.Status ?? "ממתין",
                Comments = dto.Comments,
            };

            _db.ResearchPaymentRequests.Add(request);
            await _db.SaveChangesAsync();
            return ToDto(request);
        }

        public async Task<PaymentRequestResponseDto?> UpdateStatus(int id, UpdatePaymentRequestStatusDto dto)
        {
            var request = await _db.ResearchPaymentRequests.FindAsync(id);
            if (request == null) return null;

            request.Status = dto.Status;
            request.ApprovedByUserId = dto.ApprovedByUserId;
            request.RejectionReason = dto.RejectionReason;
            request.DecisionDate = DateOnly.FromDateTime(DateTime.Today);

            await _db.SaveChangesAsync();
            return ToDto(request);
        }

        private static PaymentRequestResponseDto ToDto(ResearchPaymentRequest r) => new()
        {
            PaymentRequestId = r.PaymentRequestId,
            ProjectId = r.ProjectId,
            RequestedByUserId = r.RequestedByUserId,
            ProviderId = r.ProviderId,
            CategoryName = r.CategoryName,
            RequestTitle = r.RequestTitle,
            RequestDescription = r.RequestDescription,
            RequestedAmount = r.RequestedAmount,
            RequestDate = r.RequestDate,
            DueDate = r.DueDate,
            Status = r.Status,
            ApprovedByUserId = r.ApprovedByUserId,
            DecisionDate = r.DecisionDate,
            RejectionReason = r.RejectionReason,
            Comments = r.Comments,
        };
    }
}
