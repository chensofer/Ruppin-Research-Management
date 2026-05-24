using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IAuditLogService
    {
        Task LogAsync(int projectId, string userId, string actionType, string description,
            string? entityType = null, string? entityId = null);

        Task<List<AuditLogResponseDto>> GetByProjectAsync(int projectId);
    }
}
