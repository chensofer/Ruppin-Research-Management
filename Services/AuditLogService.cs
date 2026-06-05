using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Models;

namespace RupResearchAPI.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _db;

        public AuditLogService(AppDbContext db)
        {
            _db = db;
        }

        public async Task LogAsync(int projectId, string userId, string actionType, string description,
            string? entityType = null, string? entityId = null)
        {
            try
            {
                _db.ResearchAuditLogs.Add(new ResearchAuditLog
                {
                    ProjectId = projectId,
                    PerformedByUserId = userId,
                    ActionType = actionType,
                    ActionDescription = description,
                    EntityType = entityType,
                    EntityId = entityId,
                    CreatedAt = DateTime.Now,
                });
                await _db.SaveChangesAsync();
            }
            catch
            {
                // Logging must never break core operations — swallow silently
                _db.ChangeTracker.Clear();
            }
        }

        public async Task<List<AuditLogResponseDto>> GetByProjectAsync(int projectId)
        {
            var logs = await _db.ResearchAuditLogs
                .Where(l => l.ProjectId == projectId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            if (logs.Count == 0)
                return new List<AuditLogResponseDto>();

            // Load all users in memory to avoid EF Core translation issues with char-padded UserId columns
            var allUsers = await _db.ResearchUsers.ToListAsync();
            var userDict = allUsers.ToDictionary(
                u => u.UserId.Trim(),
                u => $"{u.FirstName} {u.LastName}".Trim());

            return logs.Select(l => new AuditLogResponseDto
            {
                Id = l.Id,
                ProjectId = l.ProjectId,
                PerformedByUserId = l.PerformedByUserId,
                PerformedByName = userDict.TryGetValue(l.PerformedByUserId.Trim(), out var name) ? name : l.PerformedByUserId,
                ActionType = l.ActionType,
                ActionDescription = l.ActionDescription,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                CreatedAt = l.CreatedAt,
            }).ToList();
        }

        public async Task<List<AuditLogResponseDto>> GetAllAsync()
        {
            var logs = await _db.ResearchAuditLogs
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            if (logs.Count == 0)
                return new List<AuditLogResponseDto>();

            var allUsers = await _db.ResearchUsers.ToListAsync();
            var userDict = allUsers.ToDictionary(
                u => u.UserId.Trim(),
                u => $"{u.FirstName} {u.LastName}".Trim());

            var allProjects = await _db.ResearchProjects.ToListAsync();
            var projectDict = allProjects.ToDictionary(p => p.ProjectId);

            return logs.Select(l =>
            {
                projectDict.TryGetValue(l.ProjectId, out var project);
                return new AuditLogResponseDto
                {
                    Id = l.Id,
                    ProjectId = l.ProjectId,
                    ProjectNameHe = project?.ProjectNameHe,
                    ProjectNameEn = project?.ProjectNameEn,
                    PerformedByUserId = l.PerformedByUserId,
                    PerformedByName = userDict.TryGetValue(l.PerformedByUserId.Trim(), out var name) ? name : l.PerformedByUserId,
                    ActionType = l.ActionType,
                    ActionDescription = l.ActionDescription,
                    EntityType = l.EntityType,
                    EntityId = l.EntityId,
                    CreatedAt = l.CreatedAt,
                };
            }).ToList();
        }
    }
}
