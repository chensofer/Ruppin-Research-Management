using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Models;

namespace RupResearchAPI.Services
{
    public class HourReportService : IHourReportService
    {
        private readonly AppDbContext _db;

        public HourReportService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<HourReportDto>> GetReports(string userId, int projectId, int month, int year)
        {
            // Use a date range to avoid EF Core translation issues with DateOnly.Month/Year
            var startDate = new DateOnly(year, month, 1);
            var endDate = startDate.AddMonths(1);

            var all = await _db.ResearchHourReports
                .Where(r => r.UserId == userId && r.ProjectId == projectId && r.ReportDate.HasValue)
                .OrderBy(r => r.ReportDate)
                .ToListAsync();

            // Filter in memory to avoid OPENJSON / DateOnly translation issues
            return all
                .Where(r => r.ReportDate!.Value >= startDate && r.ReportDate!.Value < endDate)
                .Select(ToDto)
                .ToList();
        }

        public async Task<HourReportDto> CreateReport(CreateHourReportDto dto)
        {
            // Parse date/time from strings
            DateOnly? reportDate = null;
            TimeOnly? fromHour = null;
            TimeOnly? toHour = null;

            if (!string.IsNullOrWhiteSpace(dto.ReportDate) &&
                DateOnly.TryParse(dto.ReportDate, out var pd))
                reportDate = pd;

            if (!string.IsNullOrWhiteSpace(dto.FromHour) &&
                TimeOnly.TryParse(dto.FromHour, out var pf))
                fromHour = pf;

            if (!string.IsNullOrWhiteSpace(dto.ToHour) &&
                TimeOnly.TryParse(dto.ToHour, out var pt))
                toHour = pt;

            // If a report already exists for this user+project+date, update it
            if (reportDate.HasValue)
            {
                var allForUser = await _db.ResearchHourReports
                    .Where(r => r.UserId == dto.UserId && r.ProjectId == dto.ProjectId)
                    .ToListAsync();

                var existing = allForUser.FirstOrDefault(r => r.ReportDate == reportDate);

                if (existing != null)
                {
                    existing.FromHour = fromHour;
                    existing.ToHour = toHour;
                    existing.WorkedHours = dto.WorkedHours;
                    existing.Comments = dto.Comments;
                    await _db.SaveChangesAsync();
                    return ToDto(existing);
                }
            }

            var report = new ResearchHourReport
            {
                UserId = dto.UserId,
                ProjectId = dto.ProjectId,
                ReportDate = reportDate,
                FromHour = fromHour,
                ToHour = toHour,
                WorkedHours = dto.WorkedHours,
                Comments = dto.Comments,
            };
            _db.ResearchHourReports.Add(report);
            await _db.SaveChangesAsync();
            return ToDto(report);
        }

        public async Task<bool> DeleteReport(int id, string userId)
        {
            var report = await _db.ResearchHourReports.FindAsync(id);
            if (report == null || report.UserId != userId) return false;
            _db.ResearchHourReports.Remove(report);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<MonthlyApprovalDto?> GetMonthlyApproval(string userId, int projectId, int month, int year)
        {
            var record = await _db.ResearchMonthlyWorkApprovals
                .FirstOrDefaultAsync(a =>
                    a.UserId == userId && a.ProjectId == projectId &&
                    a.Month == month && a.Year == year);

            if (record == null) return null;

            var project = await _db.ResearchProjects.FindAsync(projectId);
            var userRecord = await _db.ResearchUsers.FindAsync(userId);
            string? userName = userRecord != null ? $"{userRecord.FirstName} {userRecord.LastName}".Trim() : null;

            return ToApprovalDto(record, project?.ProjectNameHe, userName);
        }

        public async Task<MonthlyApprovalDto> SubmitMonthly(SubmitMonthlyApprovalDto dto)
        {
            var existing = await _db.ResearchMonthlyWorkApprovals
                .FirstOrDefaultAsync(a =>
                    a.UserId == dto.UserId && a.ProjectId == dto.ProjectId &&
                    a.Month == dto.Month && a.Year == dto.Year);

            if (existing != null)
            {
                existing.ApprovalStatus = "ממתין";
                existing.TotalWorkedHours = dto.TotalWorkedHours;
                existing.Comments = dto.Comments;
                existing.ApprovedByUserId = null;
                existing.ApprovalDate = null;
                await _db.SaveChangesAsync();
                return ToApprovalDto(existing);
            }

            var record = new ResearchMonthlyWorkApproval
            {
                UserId = dto.UserId,
                ProjectId = dto.ProjectId,
                Month = dto.Month,
                Year = dto.Year,
                ApprovalStatus = "ממתין",
                TotalWorkedHours = dto.TotalWorkedHours,
                Comments = dto.Comments,
            };
            _db.ResearchMonthlyWorkApprovals.Add(record);
            await _db.SaveChangesAsync();
            return ToApprovalDto(record);
        }

        public async Task<MonthlyApprovalDto?> DecideMonthly(int id, DecideMonthlyApprovalDto dto)
        {
            var record = await _db.ResearchMonthlyWorkApprovals.FindAsync(id);
            if (record == null) return null;

            record.ApprovalStatus = dto.ApprovalStatus;
            record.ApprovedByUserId = dto.ApprovedByUserId;
            record.ApprovalDate = DateOnly.FromDateTime(DateTime.Today);
            if (dto.Comments != null) record.Comments = dto.Comments;

            await _db.SaveChangesAsync();

            var project = await _db.ResearchProjects.FindAsync(record.ProjectId);
            var userRecord = record.UserId != null ? await _db.ResearchUsers.FindAsync(record.UserId) : null;
            string? userName = userRecord != null ? $"{userRecord.FirstName} {userRecord.LastName}".Trim() : null;

            return ToApprovalDto(record, project?.ProjectNameHe, userName);
        }

        public async Task<List<MonthlyApprovalDto>> GetPendingForResearcher(string researcherId)
        {
            // Get all project IDs where this user is the principal researcher
            var projectIds = await _db.ResearchProjects
                .Where(p => p.PrincipalResearcherId == researcherId)
                .Select(p => p.ProjectId)
                .ToListAsync();

            if (projectIds.Count == 0) return [];

            var allPending = await _db.ResearchMonthlyWorkApprovals
                .Where(a => a.ApprovalStatus == "ממתין")
                .ToListAsync();

            var relevant = allPending
                .Where(a => a.ProjectId.HasValue && projectIds.Contains(a.ProjectId.Value))
                .ToList();

            if (relevant.Count == 0) return [];

            var allProjects = await _db.ResearchProjects.ToListAsync();
            var projectDict = allProjects.ToDictionary(p => p.ProjectId);

            var allUsers = await _db.ResearchUsers.ToListAsync();
            var userDict = allUsers.ToDictionary(u => u.UserId.Trim());

            return relevant.Select(a =>
            {
                projectDict.TryGetValue(a.ProjectId ?? 0, out var project);
                var uid = a.UserId?.Trim() ?? "";
                userDict.TryGetValue(uid, out var user);
                string? userName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : null;
                return ToApprovalDto(a, project?.ProjectNameHe, userName);
            }).ToList();
        }

        public async Task<List<AssistantProjectDto>> GetProjectsForAssistant(string userId)
        {
            List<int> projectIds;
            try
            {
                // research_assistants.assistant_user_id is char(10) — trim to handle padding
                projectIds = await _db.ResearchAssistants
                    .Where(a => a.AssistantUserId.Trim() == userId.Trim())
                    .Select(a => a.ProjectId)
                    .ToListAsync();
            }
            catch { projectIds = []; }

            if (projectIds.Count == 0) return [];

            var projects = await _db.ResearchProjects.ToListAsync();
            return projects
                .Where(p => projectIds.Contains(p.ProjectId))
                .Select(p => new AssistantProjectDto
                {
                    ProjectId = p.ProjectId,
                    ProjectNameHe = p.ProjectNameHe,
                    ProjectNameEn = p.ProjectNameEn,
                })
                .ToList();
        }

        private static HourReportDto ToDto(ResearchHourReport r) => new()
        {
            HourReportId = r.HourReportId,
            UserId = r.UserId,
            ProjectId = r.ProjectId,
            ReportDate = r.ReportDate?.ToString("yyyy-MM-dd"),
            FromHour = r.FromHour?.ToString("HH:mm:ss"),
            ToHour = r.ToHour?.ToString("HH:mm:ss"),
            WorkedHours = r.WorkedHours,
            Comments = r.Comments,
        };

        private static MonthlyApprovalDto ToApprovalDto(ResearchMonthlyWorkApproval a, string? projectNameHe = null, string? userName = null) => new()
        {
            MonthlyApprovalId = a.MonthlyApprovalId,
            UserId = a.UserId,
            UserName = userName,
            ProjectId = a.ProjectId,
            ProjectNameHe = projectNameHe,
            Month = a.Month,
            Year = a.Year,
            ApprovalStatus = a.ApprovalStatus,
            ApprovedByUserId = a.ApprovedByUserId,
            ApprovalDate = a.ApprovalDate?.ToString("yyyy-MM-dd"),
            TotalWorkedHours = a.TotalWorkedHours,
            Comments = a.Comments,
        };
    }
}
