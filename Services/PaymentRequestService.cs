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
            var requests = await _db.ResearchPaymentRequests
                .Where(r => r.ProjectId == projectId)
                .OrderByDescending(r => r.RequestDate)
                .ToListAsync();

            if (requests.Count == 0)
                return new List<PaymentRequestResponseDto>();

            var allProviders = await _db.ResearchProviders.ToListAsync();
            var providerDict = allProviders.ToDictionary(p => p.ProviderId);

            var allUsers = await _db.ResearchUsers.ToListAsync();
            var userDict = allUsers.ToDictionary(u => u.UserId.Trim());

            return requests.Select(r =>
            {
                providerDict.TryGetValue(r.ProviderId ?? -1, out var provider);
                var userId = r.RequestedByUserId?.Trim() ?? "";
                userDict.TryGetValue(userId, out var user);
                return ToDto(r, provider?.ProviderName, user != null ? $"{user.FirstName} {user.LastName}".Trim() : null);
            }).ToList();
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

        public async Task<List<PendingPaymentRequestDto>> GetPendingForUser(string userId)
        {
            var projectIds = await GetUserProjectIds(userId);
            if (projectIds.Count == 0)
                return new List<PendingPaymentRequestDto>();

            // Fetch all pending, filter in memory to avoid OPENJSON issue on older SQL Server
            var allPending = await _db.ResearchPaymentRequests
                .Where(r => r.Status == "ממתין")
                .OrderByDescending(r => r.RequestDate)
                .ToListAsync();

            var requests = allPending
                .Where(r => r.ProjectId.HasValue && projectIds.Contains(r.ProjectId.Value))
                .ToList();

            if (requests.Count == 0)
                return new List<PendingPaymentRequestDto>();

            // Fetch all projects in memory — avoids Contains SQL translation issue
            var allProjects = await _db.ResearchProjects.ToListAsync();
            var projectDict = allProjects.ToDictionary(p => p.ProjectId);

            return requests.Select(r =>
            {
                projectDict.TryGetValue(r.ProjectId ?? 0, out var project);
                return ToPendingDto(r, project);
            }).ToList();
        }

        private async Task<List<int>> GetUserProjectIds(string userId)
        {
            var asPrincipal = await _db.ResearchProjects
                .Where(p => p.PrincipalResearcherId == userId)
                .Select(p => p.ProjectId)
                .ToListAsync();

            var asTeamMember = await _db.ResearchUsersProjects
                .Where(u => u.UserId == userId)
                .Select(u => u.ProjectId)
                .ToListAsync();

            var asAssistant = await _db.ResearchAssistants
                .Where(a => a.AssistantUserId == userId)
                .Select(a => a.ProjectId)
                .ToListAsync();

            return asPrincipal.Union(asTeamMember).Union(asAssistant).Distinct().ToList();
        }

        public async Task<string?> AppendQuotationFile(int id, IFormFile file, string uploadsRoot)
        {
            var request = await _db.ResearchPaymentRequests.FindAsync(id);
            if (request == null) return null;

            var dir = Path.Combine(uploadsRoot, "payment-requests", id.ToString());
            Directory.CreateDirectory(dir);

            var safeName = Path.GetFileName(file.FileName);
            var filePath = Path.Combine(dir, safeName);
            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var relPath = $"/uploads/payment-requests/{id}/{safeName}";
            request.QuotationFilePath = string.IsNullOrEmpty(request.QuotationFilePath)
                ? relPath
                : request.QuotationFilePath + ";" + relPath;

            await _db.SaveChangesAsync();
            return request.QuotationFilePath;
        }

        private static PaymentRequestResponseDto ToDto(ResearchPaymentRequest r, string? providerName = null, string? requestedByUserName = null) => new()
        {
            PaymentRequestId = r.PaymentRequestId,
            ProjectId = r.ProjectId,
            RequestedByUserId = r.RequestedByUserId,
            RequestedByUserName = requestedByUserName,
            ProviderId = r.ProviderId,
            ProviderName = providerName,
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
            QuotationFilePath = r.QuotationFilePath,
            Comments = r.Comments,
        };

        private static PendingPaymentRequestDto ToPendingDto(ResearchPaymentRequest r, ResearchProject? project) => new()
        {
            PaymentRequestId = r.PaymentRequestId,
            ProjectId = r.ProjectId,
            ProjectNameHe = project?.ProjectNameHe,
            ProjectNameEn = project?.ProjectNameEn,
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
            QuotationFilePath = r.QuotationFilePath,
            Comments = r.Comments,
        };
    }
}
