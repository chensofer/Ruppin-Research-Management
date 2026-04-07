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
            var trimmedUserId = userId.Trim();

            // Fetch all reports for the project first, then filter by userId in memory
            // to handle char(10) padding in DB columns
            var all = await _db.ResearchHourReports
                .Where(r => r.ProjectId == projectId && r.ReportDate.HasValue)
                .OrderBy(r => r.ReportDate)
                .ToListAsync();

            all = all.Where(r => r.UserId?.Trim() == trimmedUserId).ToList();

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
                var trimmedId = dto.UserId?.Trim();
                var allForUser = await _db.ResearchHourReports
                    .Where(r => r.ProjectId == dto.ProjectId)
                    .ToListAsync();
                allForUser = allForUser.Where(r => r.UserId?.Trim() == trimmedId).ToList();

                var existing = allForUser.FirstOrDefault(r => r.ReportDate == reportDate);

                if (existing != null)
                {
                    existing.FromHour = fromHour;
                    existing.ToHour = toHour;
                    existing.WorkedHours = dto.WorkedHours;
                    existing.Comments = dto.Comments;
                    await _db.SaveChangesAsync();
                    if (dto.ProjectId.HasValue)
                        await UpsertAssistantCommitment(dto.UserId!, dto.ProjectId.Value, reportDate.Value);
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
            if (reportDate.HasValue && dto.ProjectId.HasValue && dto.UserId != null)
                await UpsertAssistantCommitment(dto.UserId, dto.ProjectId.Value, reportDate.Value);
            return ToDto(report);
        }

        public async Task<bool> DeleteReport(int id, string userId)
        {
            var report = await _db.ResearchHourReports.FindAsync(id);
            if (report == null || report.UserId?.Trim() != userId.Trim()) return false;
            var projectId = report.ProjectId;
            var reportDate = report.ReportDate;
            var reportUserId = report.UserId;
            _db.ResearchHourReports.Remove(report);
            await _db.SaveChangesAsync();
            if (projectId.HasValue && reportDate.HasValue && reportUserId != null)
                await UpsertAssistantCommitment(reportUserId, projectId.Value, reportDate.Value);
            return true;
        }

        public async Task<MonthlyApprovalDto?> GetMonthlyApproval(string userId, int projectId, int month, int year)
        {
            var trimmedId = userId.Trim();
            var all = await _db.ResearchMonthlyWorkApprovals
                .Where(a => a.ProjectId == projectId && a.Month == month && a.Year == year)
                .ToListAsync();
            var record = all.FirstOrDefault(a => a.UserId?.Trim() == trimmedId);

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

            decimal paymentAmount = 0;
            decimal salaryPerHour = 0;

            if (dto.ApprovalStatus == "אושר" && record.ProjectId.HasValue && record.UserId != null)
            {
                // Look up assistant's salary (in memory to handle char(10) trimming)
                var allAssistants = await _db.ResearchAssistants.ToListAsync();
                var assistantRecord = allAssistants.FirstOrDefault(a =>
                    a.AssistantUserId?.Trim() == record.UserId.Trim() &&
                    a.ProjectId == record.ProjectId.Value);

                salaryPerHour = assistantRecord?.SalaryPerHour ?? 0;
                var totalHours = record.TotalWorkedHours ?? 0;
                paymentAmount = salaryPerHour * totalHours;

                // Budget validation — only when there is an actual payment
                if (paymentAmount > 0)
                {
                    // The assistant's future commitment already reduces 'available', so add it back
                    var marker = $"assistant:{record.UserId.Trim()}:{record.Month}:{record.Year}";
                    var allCommitmentsForBudget = await _db.ResearchFutureCommitments
                        .Where(c => c.ProjectId == record.ProjectId.Value)
                        .ToListAsync();
                    var reservedByCommitment = allCommitmentsForBudget
                        .Where(c => c.Notes == marker)
                        .Sum(c => c.ExpectedAmount ?? 0);

                    var available = await GetAvailableBudget(record.ProjectId.Value);
                    if (paymentAmount > available + reservedByCommitment)
                        throw new InvalidOperationException(
                            $"אין תקציב זמין מספיק לאישור. עלות השכר: ₪{paymentAmount:N0}. יתרה זמינה (לאחר הוצאות והתחייבויות עתידיות): ₪{available:N0}");
                }
            }

            // ── Step 1: Save the approval decision first ──────────────────────
            record.ApprovalStatus = dto.ApprovalStatus;
            record.ApprovedByUserId = dto.ApprovedByUserId;
            record.ApprovalDate = DateOnly.FromDateTime(DateTime.Today);
            if (dto.Comments != null) record.Comments = dto.Comments;

            await _db.SaveChangesAsync();

            // ── Step 2: Delete future commitment + create executed expense ──
            if (dto.ApprovalStatus == "אושר" && record.ProjectId.HasValue && record.UserId != null)
            {
                // Remove the future commitment (it's now becoming a real payment)
                var markerToDelete = $"assistant:{record.UserId.Trim()}:{record.Month}:{record.Year}";
                var allCommitmentsToDelete = await _db.ResearchFutureCommitments
                    .Where(c => c.ProjectId == record.ProjectId.Value)
                    .ToListAsync();
                var commitmentToDelete = allCommitmentsToDelete.FirstOrDefault(c => c.Notes == markerToDelete);
                if (commitmentToDelete != null)
                {
                    _db.ResearchFutureCommitments.Remove(commitmentToDelete);
                    await _db.SaveChangesAsync();
                }

                try
                {
                    const string wageCategory = "שכר לעוזרי מחקר";

                    // Ensure the category exists (may be FK-constrained in DB)
                    bool catExists = await _db.ResearchCategories
                        .AnyAsync(c => c.CategoryName == wageCategory);
                    if (!catExists)
                    {
                        _db.ResearchCategories.Add(new ResearchCategory
                        {
                            CategoryName = wageCategory,
                            CategoryDescription = "שכר לעוזרי מחקר"
                        });
                        await _db.SaveChangesAsync();
                    }

                    var monthNames = new[] { "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                                             "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר" };
                    var monthName = record.Month.HasValue && record.Month >= 1 && record.Month <= 12
                        ? monthNames[record.Month.Value - 1] : $"חודש {record.Month}";

                    _db.ResearchPaymentRequests.Add(new ResearchPaymentRequest
                    {
                        ProjectId = record.ProjectId,
                        RequestedByUserId = record.UserId?.Trim(),
                        CategoryName = wageCategory,
                        RequestTitle = $"שכר עוזר מחקר — {monthName} {record.Year}",
                        RequestedAmount = paymentAmount > 0 ? paymentAmount : null,
                        RequestDate = DateOnly.FromDateTime(DateTime.Today),
                        Status = "שולם",
                        ApprovedByUserId = dto.ApprovedByUserId?.Trim(),
                        DecisionDate = DateOnly.FromDateTime(DateTime.Today),
                    });
                    await _db.SaveChangesAsync();
                }
                catch
                {
                    // Payment record creation failed — approval is already saved above.
                    // Log if logging is available; don't re-throw so the caller gets 200.
                }
            }

            var project = await _db.ResearchProjects.FindAsync(record.ProjectId);
            var userRecord = record.UserId != null ? await _db.ResearchUsers.FindAsync(record.UserId) : null;
            string? userName = userRecord != null ? $"{userRecord.FirstName} {userRecord.LastName}".Trim() : null;

            return ToApprovalDto(record, project?.ProjectNameHe, userName);
        }

        private async Task UpsertAssistantCommitment(string userId, int projectId, DateOnly reportDate)
        {
            try
            {
                var month = reportDate.Month;
                var year = reportDate.Year;
                var trimmedId = userId.Trim();

                // Total worked hours for this user+project+month
                var startDate = new DateOnly(year, month, 1);
                var endDate = startDate.AddMonths(1);
                var allReports = await _db.ResearchHourReports
                    .Where(r => r.ProjectId == projectId && r.ReportDate.HasValue)
                    .ToListAsync();
                var totalHours = allReports
                    .Where(r => r.UserId?.Trim() == trimmedId && r.ReportDate >= startDate && r.ReportDate < endDate)
                    .Sum(r => r.WorkedHours ?? 0);

                // Salary per hour
                var allAssistants = await _db.ResearchAssistants.ToListAsync();
                var assistant = allAssistants.FirstOrDefault(a =>
                    a.AssistantUserId?.Trim() == trimmedId && a.ProjectId == projectId);
                var salaryPerHour = assistant?.SalaryPerHour ?? 0;
                var expectedAmount = totalHours * salaryPerHour;

                // User display name
                var userRecord = await _db.ResearchUsers.FindAsync(trimmedId);
                var userName = userRecord != null
                    ? $"{userRecord.FirstName} {userRecord.LastName}".Trim()
                    : trimmedId;

                // Find or create/update the commitment using a unique marker in Notes
                var marker = $"assistant:{trimmedId}:{month}:{year}";
                var allCommitments = await _db.ResearchFutureCommitments
                    .Where(c => c.ProjectId == projectId)
                    .ToListAsync();
                var existing = allCommitments.FirstOrDefault(c => c.Notes == marker);

                if (existing != null)
                {
                    if (expectedAmount <= 0)
                        _db.ResearchFutureCommitments.Remove(existing);
                    else
                    {
                        existing.ExpectedAmount = expectedAmount;
                        existing.CommitmentDescription = $"תשלום שכר עוזר מחקר — {userName} — {month}/{year}";
                    }
                }
                else if (expectedAmount > 0)
                {
                    _db.ResearchFutureCommitments.Add(new ResearchFutureCommitment
                    {
                        ProjectId = projectId,
                        CategoryName = "שכר לעוזרי מחקר",
                        CommitmentDescription = $"תשלום שכר עוזר מחקר — {userName} — {month}/{year}",
                        ExpectedDate = endDate,
                        ExpectedAmount = expectedAmount,
                        Status = "מתוכנן",
                        Notes = marker,
                    });
                }

                await _db.SaveChangesAsync();
            }
            catch
            {
                // Non-critical — don't fail the main save operation
            }
        }

        private async Task<decimal> GetAvailableBudget(int projectId)
        {
            var project = await _db.ResearchProjects.FindAsync(projectId);
            var budget = project?.TotalBudget ?? 0;

            var allPayments = await _db.ResearchPaymentRequests
                .Where(r => r.ProjectId == projectId)
                .ToListAsync();

            var totalPaid = allPayments
                .Where(r => r.Status == "אושר" || r.Status == "שולם")
                .Sum(r => r.RequestedAmount ?? 0);

            var totalPending = allPayments
                .Where(r => r.Status == "ממתין")
                .Sum(r => r.RequestedAmount ?? 0);

            var allCommitments = await _db.ResearchFutureCommitments
                .Where(c => c.ProjectId == projectId && c.Status != "בוטל")
                .ToListAsync();
            var totalFuture = allCommitments.Sum(c => c.ExpectedAmount ?? 0);

            return budget - totalPaid - totalPending - totalFuture;
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

            var allAssistants = await _db.ResearchAssistants.ToListAsync();

            return relevant.Select(a =>
            {
                projectDict.TryGetValue(a.ProjectId ?? 0, out var project);
                var uid = a.UserId?.Trim() ?? "";
                userDict.TryGetValue(uid, out var user);
                string? userName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : null;

                var assistantRecord = allAssistants.FirstOrDefault(ast =>
                    ast.AssistantUserId?.Trim() == uid && ast.ProjectId == (a.ProjectId ?? 0));
                var salaryPerHour = assistantRecord?.SalaryPerHour;
                var totalPayment = salaryPerHour.HasValue && a.TotalWorkedHours.HasValue
                    ? salaryPerHour.Value * a.TotalWorkedHours.Value
                    : (decimal?)null;

                return ToApprovalDto(a, project?.ProjectNameHe, userName, salaryPerHour, totalPayment);
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

        private static MonthlyApprovalDto ToApprovalDto(
            ResearchMonthlyWorkApproval a,
            string? projectNameHe = null,
            string? userName = null,
            decimal? salaryPerHour = null,
            decimal? totalPaymentAmount = null) => new()
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
            SalaryPerHour = salaryPerHour,
            TotalPaymentAmount = totalPaymentAmount,
        };
    }
}
