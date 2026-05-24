using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.Models;

namespace RupResearchAPI.Services
{
    public class ActivityLogService : IActivityLogService
    {
        private readonly AppDbContext _db;

        public ActivityLogService(AppDbContext db)
        {
            _db = db;
        }

        public async Task LogAsync(int projectId, string actionType, string? description, string? userId, string? userName)
        {
            try
            {
                _db.ResearchActivityLogs.Add(new ResearchActivityLog
                {
                    ProjectId           = projectId,
                    ActionType          = actionType,
                    ActionDescription   = description,
                    PerformedByUserId   = userId?.Trim(),
                    PerformedByName     = userName,
                    PerformedAt         = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync();
            }
            catch { /* logging should never crash the main flow */ }
        }

        public async Task<List<ActivityLogDto>> GetByProjectAsync(int projectId)
        {
            var logs = await _db.ResearchActivityLogs
                .Where(l => l.ProjectId == projectId)
                .OrderByDescending(l => l.PerformedAt)
                .Take(100)
                .ToListAsync();

            return logs.Select(l => new ActivityLogDto
            {
                LogId               = l.LogId,
                ActionType          = l.ActionType,
                ActionDescription   = l.ActionDescription,
                PerformedByUserId   = l.PerformedByUserId,
                PerformedByName     = l.PerformedByName,
                PerformedAt         = l.PerformedAt,
            }).ToList();
        }
    }
}
