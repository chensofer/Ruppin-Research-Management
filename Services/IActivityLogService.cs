namespace RupResearchAPI.Services
{
    public interface IActivityLogService
    {
        Task LogAsync(int projectId, string actionType, string? description, string? userId, string? userName);
        Task<List<ActivityLogDto>> GetByProjectAsync(int projectId);
    }

    public class ActivityLogDto
    {
        public int LogId { get; set; }
        public string ActionType { get; set; } = null!;
        public string? ActionDescription { get; set; }
        public string? PerformedByUserId { get; set; }
        public string? PerformedByName { get; set; }
        public DateTime PerformedAt { get; set; }
    }
}
