using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Models;

namespace RupResearchAPI.Services
{
    public class ProjectService : IProjectService
    {
        private readonly AppDbContext _db;

        public ProjectService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<ProjectResponseDto>> GetAll(string userId)
        {
            // Get all projects then filter in memory (avoids OPENJSON issue on older SQL Server)
            var allProjects = await _db.ResearchProjects.ToListAsync();

            var asPrincipal = allProjects
                .Where(p => p.PrincipalResearcherId?.Trim() == userId.Trim())
                .Select(p => p.ProjectId)
                .ToHashSet();

            var asTeamMember = (await _db.ResearchUsersProjects
                .Where(u => u.UserId == userId)
                .Select(u => u.ProjectId)
                .ToListAsync()).ToHashSet();

            var allAssistants = await _db.ResearchAssistants.ToListAsync();
            var asAssistant = allAssistants
                .Where(a => a.AssistantUserId?.Trim() == userId.Trim())
                .Select(a => a.ProjectId)
                .ToHashSet();

            var userProjectIds = asPrincipal
                .Union(asTeamMember)
                .Union(asAssistant)
                .ToHashSet();

            var userProjects = allProjects
                .Where(p => userProjectIds.Contains(p.ProjectId))
                .ToList();

            // Load budget data in memory for all user projects
            var allPayments = await _db.ResearchPaymentRequests.ToListAsync();
            var allCommitments = await _db.ResearchFutureCommitments.ToListAsync();

            return userProjects.Select(p =>
            {
                var payments = allPayments.Where(r => r.ProjectId == p.ProjectId).ToList();
                var totalPaid = payments
                    .Where(r => r.Status == "אושר" || r.Status == "שולם")
                    .Sum(r => r.RequestedAmount ?? 0);
                var pendingCount = payments.Count(r => r.Status == "ממתין");
                var totalFuture = allCommitments
                    .Where(c => c.ProjectId == p.ProjectId && c.Status != "בוטל")
                    .Sum(c => c.ExpectedAmount ?? 0);
                var budget = p.TotalBudget ?? 0;
                var dto = ToDto(p);
                dto.TotalPaid = totalPaid;
                dto.PendingCount = pendingCount;
                dto.TotalFuture = totalFuture;
                dto.RemainingBalance = budget - totalPaid;
                dto.AvailableBalance = budget - totalPaid - totalFuture;
                return dto;
            }).ToList();
        }

        public async Task<ProjectResponseDto?> GetById(int id)
        {
            var project = await _db.ResearchProjects.FindAsync(id);
            return project == null ? null : ToDto(project);
        }

        public async Task<ProjectDetailDto?> GetDetail(int id)
        {
            var project = await _db.ResearchProjects.FindAsync(id);
            if (project == null) return null;

            // Resolve PI name
            string? piName = null;
            if (!string.IsNullOrEmpty(project.PrincipalResearcherId))
            {
                var pi = await _db.ResearchUsers.FindAsync(project.PrincipalResearcherId);
                if (pi != null) piName = $"{pi.FirstName} {pi.LastName}".Trim();
            }

            // Resolve center name
            string? centerName = null;
            if (project.CenterId.HasValue)
            {
                var center = await _db.ResearchCenters.FindAsync(project.CenterId.Value);
                centerName = center?.CenterName;
            }

            // Team members
            var piId = project.PrincipalResearcherId?.Trim() ?? "";
            List<TeamMemberDetailDto> teamMembers;
            try
            {
                var rawMembers = await (
                    from up in _db.ResearchUsersProjects
                    join u in _db.ResearchUsers on up.UserId equals u.UserId
                    where up.ProjectId == id
                    select new TeamMemberDetailDto
                    {
                        UserId = up.UserId,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        ProjectRole = up.ProjectRole,
                        SystemAuthorization = u.SystemAuthorization
                    }).ToListAsync();

                // Resolve IsPrincipalInvestigator in memory so char(10) trimming is safe
                foreach (var m in rawMembers)
                    m.IsPrincipalInvestigator = !string.IsNullOrEmpty(piId) &&
                                                m.UserId?.Trim() == piId;

                teamMembers = rawMembers;
            }
            catch { teamMembers = []; }

            // Assistants
            List<AssistantDetailDto> assistants;
            try
            {
                assistants = await (
                    from a in _db.ResearchAssistants
                    join u in _db.ResearchUsers on a.AssistantUserId equals u.UserId
                    where a.ProjectId == id
                    select new AssistantDetailDto
                    {
                        AssistantUserId = a.AssistantUserId,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        Role = a.Role,
                        SalaryPerHour = a.SalaryPerHour
                    }).ToListAsync();
            }
            catch { assistants = []; }

            // Budget stats
            var payments = await _db.ResearchPaymentRequests
                .Where(r => r.ProjectId == id)
                .ToListAsync();

            var totalPaid = payments
                .Where(r => r.Status == "אושר" || r.Status == "שולם")
                .Sum(r => r.RequestedAmount ?? 0);

            var pendingCount = payments.Count(r => r.Status == "ממתין");
            var approvedTotal = totalPaid;

            var totalFuture = await _db.ResearchFutureCommitments
                .Where(c => c.ProjectId == id && c.Status != "בוטל")
                .SumAsync(c => c.ExpectedAmount) ?? 0;

            var budget = project.TotalBudget ?? 0;

            // FundingSource — from project model
            var detail = new ProjectDetailDto
            {
                ProjectId = project.ProjectId,
                ProjectNameHe = project.ProjectNameHe,
                ProjectNameEn = project.ProjectNameEn,
                ProjectDescription = project.ProjectDescription,
                TotalBudget = project.TotalBudget,
                CenterId = project.CenterId,
                CenterName = centerName,
                PrincipalResearcherId = project.PrincipalResearcherId,
                PrincipalResearcherName = piName,
                FundingSource = project.FundingSource,
                CreatedDate = project.CreatedDate,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                Status = project.Status,
                TotalPaid = totalPaid,
                TotalFuture = totalFuture,
                RemainingBalance = budget - totalPaid,
                AvailableBalance = budget - totalPaid - totalFuture,
                PendingCount = pendingCount,
                ApprovedTotal = approvedTotal,
                TeamMembers = teamMembers,
                Assistants = assistants,
            };

            return detail;
        }

        public async Task<ProjectResponseDto> Create(CreateProjectDto dto, string creatorUserId)
        {
            var project = new ResearchProject
            {
                ProjectNameHe = dto.ProjectNameHe,
                ProjectNameEn = dto.ProjectNameEn,
                ProjectDescription = dto.ProjectDescription,
                TotalBudget = dto.TotalBudget,
                CenterId = dto.CenterId,
                PrincipalResearcherId = dto.PrincipalResearcherId,
                CreatedDate = DateOnly.FromDateTime(DateTime.Today),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status
            };

            _db.ResearchProjects.Add(project);
            await _db.SaveChangesAsync();

            // Auto-add creator to team so they can see this project
            await EnsureUserInTeam(project.ProjectId, creatorUserId, "יוצר");

            return ToDto(project);
        }

        public async Task<ProjectResponseDto?> Update(int id, UpdateProjectDto dto)
        {
            var project = await _db.ResearchProjects.FindAsync(id);
            if (project == null) return null;

            project.ProjectNameHe = dto.ProjectNameHe;
            project.ProjectNameEn = dto.ProjectNameEn;
            project.ProjectDescription = dto.ProjectDescription;
            project.TotalBudget = dto.TotalBudget;
            project.CenterId = dto.CenterId;
            project.PrincipalResearcherId = dto.PrincipalResearcherId;
            project.FundingSource = dto.FundingSource;
            project.StartDate = dto.StartDate;
            project.EndDate = dto.EndDate;
            project.Status = dto.Status;
            project.ResearchExpenses = dto.ResearchExpenses;

            await _db.SaveChangesAsync();
            return ToDto(project);
        }

        public async Task<bool> Delete(int id)
        {
            var project = await _db.ResearchProjects.FindAsync(id);
            if (project == null) return false;

            bool hasPayments = await _db.ResearchPaymentRequests.AnyAsync(r => r.ProjectId == id);
            bool hasHourReports = await _db.ResearchHourReports.AnyAsync(r => r.ProjectId == id);
            bool hasApprovals = await _db.ResearchMonthlyWorkApprovals.AnyAsync(r => r.ProjectId == id);

            if (hasPayments || hasHourReports || hasApprovals)
                throw new InvalidOperationException(
                    "לא ניתן למחוק מחקר שיש לו בקשות תשלום, דוחות שעות או אישורים חודשיים.");

            _db.ResearchProjects.Remove(project);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ProjectResponseDto> CreateFull(CreateFullProjectDto dto, string requestedByUserId)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var project = new ResearchProject
                {
                    ProjectNameHe = dto.ProjectNameHe,
                    ProjectNameEn = dto.ProjectNameEn,
                    ProjectDescription = dto.ProjectDescription,
                    TotalBudget = dto.TotalBudget,
                    Status = dto.Status ?? "פעיל",
                    FundingSource = dto.FundingSource,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    PrincipalResearcherId = dto.PrincipalResearcherId,
                    CenterId = dto.CenterId,
                    CreatedDate = DateOnly.FromDateTime(DateTime.Today),
                };
                _db.ResearchProjects.Add(project);
                await _db.SaveChangesAsync();

                foreach (var cat in dto.BudgetCategories)
                {
                    _db.ResearchBudgetCategories.Add(new ResearchBudgetCategory
                    {
                        ProjectId = project.ProjectId,
                        CategoryName = cat.CategoryName,
                        AllocatedAmount = cat.AllocatedAmount,
                        Notes = cat.Notes,
                    });
                }

                foreach (var exp in dto.Expenses)
                {
                    _db.ResearchPaymentRequests.Add(new ResearchPaymentRequest
                    {
                        ProjectId = project.ProjectId,
                        RequestedByUserId = requestedByUserId,
                        RequestTitle = exp.RequestTitle,
                        RequestDescription = exp.RequestDescription,
                        RequestedAmount = exp.RequestedAmount,
                        RequestDate = exp.RequestDate ?? DateOnly.FromDateTime(DateTime.Today),
                        CategoryName = exp.CategoryName,
                        Status = "שולם",
                        ProviderId = exp.ProviderId,
                    });
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                // Team members and assistants are in separate tables that may not exist yet.
                // Add them outside the main transaction so a missing table doesn't block project creation.
                await TryAddTeamMembersAsync(project.ProjectId, dto.TeamMembers, requestedByUserId);
                await TryAddAssistantsAsync(project.ProjectId, dto.Assistants);

                return ToDto(project);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        private async Task TryAddTeamMembersAsync(int projectId, List<FullTeamMemberDto> members, string requestedByUserId)
        {
            try
            {
                var toAdd = new List<ResearchUsersProject>();
                var alreadyIncluded = new HashSet<string>(members.Select(m => m.UserId));

                foreach (var member in members)
                {
                    toAdd.Add(new ResearchUsersProject
                    {
                        UserId = member.UserId,
                        ProjectId = projectId,
                        ProjectRole = member.ProjectRole,
                    });
                }

                if (!alreadyIncluded.Contains(requestedByUserId) && !string.IsNullOrEmpty(requestedByUserId))
                {
                    toAdd.Add(new ResearchUsersProject
                    {
                        UserId = requestedByUserId,
                        ProjectId = projectId,
                        ProjectRole = "יוצר",
                    });
                }

                _db.ResearchUsersProjects.AddRange(toAdd);
                await _db.SaveChangesAsync();
            }
            catch { /* Table may not exist yet — project was still created */ }
        }

        private async Task TryAddAssistantsAsync(int projectId, List<FullAssistantDto> assistants)
        {
            try
            {
                foreach (var ast in assistants)
                {
                    if (string.IsNullOrWhiteSpace(ast.AssistantUserId)) continue;

                    if (ast.IsNewUser)
                    {
                        // Skip if user already exists
                        bool exists = await _db.ResearchUsers.AnyAsync(u => u.UserId == ast.AssistantUserId);
                        if (!exists)
                        {
                            _db.ResearchUsers.Add(new ResearchUser
                            {
                                UserId = ast.AssistantUserId!,
                                FirstName = ast.FirstName,
                                LastName = ast.LastName,
                                Email = ast.Email,
                                SystemAuthorization = "עוזר מחקר",
                                Password = BCrypt.Net.BCrypt.HashPassword("Temp1234!"),
                            });
                            await _db.SaveChangesAsync();
                        }
                    }

                    _db.ResearchAssistants.Add(new ResearchAssistant
                    {
                        AssistantUserId = ast.AssistantUserId!,
                        ProjectId = projectId,
                        Role = ast.Role,
                        SalaryPerHour = ast.SalaryPerHour,
                    });
                }
                await _db.SaveChangesAsync();
            }
            catch { /* Table may not exist yet — project was still created */ }
        }

        public async Task<FileRecordDto> SaveFileRecord(
            int projectId, string fileName, string relativePath,
            string fileType, string? folderName, string? userId)
        {
            var record = new ResearchFile
            {
                ProjectId = projectId,
                FileName = fileName,
                Path = relativePath,
                FileType = fileType,
                FolderName = folderName,
                UploadedByUserId = userId,
                CreatedDate = DateTime.UtcNow,
            };
            _db.ResearchFiles.Add(record);
            await _db.SaveChangesAsync();

            return new FileRecordDto
            {
                FileId = record.FileId,
                FileName = record.FileName,
                Path = record.Path,
                FolderName = record.FolderName,
                FileType = record.FileType,
            };
        }

        // ── Team ──────────────────────────────────────────────────────────────

        public async Task<List<TeamMemberDetailDto>> GetTeam(int projectId)
        {
            var project = await _db.ResearchProjects.FindAsync(projectId);
            var piId = project?.PrincipalResearcherId?.Trim() ?? "";

            var members = await (
                from up in _db.ResearchUsersProjects
                join u in _db.ResearchUsers on up.UserId equals u.UserId
                where up.ProjectId == projectId
                select new TeamMemberDetailDto
                {
                    UserId = up.UserId,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    ProjectRole = up.ProjectRole,
                    SystemAuthorization = u.SystemAuthorization
                }).ToListAsync();

            foreach (var m in members)
                m.IsPrincipalInvestigator = !string.IsNullOrEmpty(piId) &&
                                            m.UserId?.Trim() == piId;

            return members;
        }

        public async Task<TeamMemberDetailDto?> AddTeamMember(int projectId, string userId, string projectRole)
        {
            var user = await _db.ResearchUsers.FindAsync(userId);
            if (user == null) return null;

            // Research Assistants may not be added as team members
            if (user.SystemAuthorization == "עוזר מחקר")
                throw new InvalidOperationException("לא ניתן להוסיף עוזר מחקר לצוות המחקר");

            var exists = await _db.ResearchUsersProjects
                .AnyAsync(up => up.ProjectId == projectId && up.UserId == userId);
            if (exists) return null;

            _db.ResearchUsersProjects.Add(new ResearchUsersProject
            {
                UserId = userId,
                ProjectId = projectId,
                ProjectRole = projectRole,
            });
            await _db.SaveChangesAsync();

            var project = await _db.ResearchProjects.FindAsync(projectId);
            var piId = project?.PrincipalResearcherId?.Trim() ?? "";

            return new TeamMemberDetailDto
            {
                UserId = userId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                ProjectRole = projectRole,
                SystemAuthorization = user.SystemAuthorization,
                IsPrincipalInvestigator = !string.IsNullOrEmpty(piId) && userId.Trim() == piId,
            };
        }

        public async Task<bool> RemoveTeamMember(int projectId, string userId)
        {
            var entry = await _db.ResearchUsersProjects
                .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == userId);
            if (entry == null) return false;

            _db.ResearchUsersProjects.Remove(entry);
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Assistants ────────────────────────────────────────────────────────

        public async Task<List<AssistantDetailDto>> GetAssistants(int projectId)
        {
            return await (
                from a in _db.ResearchAssistants
                join u in _db.ResearchUsers on a.AssistantUserId equals u.UserId
                where a.ProjectId == projectId
                select new AssistantDetailDto
                {
                    AssistantUserId = a.AssistantUserId,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Role = a.Role,
                    SalaryPerHour = a.SalaryPerHour
                }).ToListAsync();
        }

        public async Task<AssistantDetailDto?> AddAssistant(int projectId, string assistantUserId, string? role, decimal? salaryPerHour)
        {
            var exists = await _db.ResearchAssistants
                .AnyAsync(a => a.ProjectId == projectId && a.AssistantUserId == assistantUserId);
            if (exists) return null;

            _db.ResearchAssistants.Add(new ResearchAssistant
            {
                AssistantUserId = assistantUserId,
                ProjectId = projectId,
                Role = role,
                SalaryPerHour = salaryPerHour,
            });
            await _db.SaveChangesAsync();

            var user = await _db.ResearchUsers.FindAsync(assistantUserId);
            return new AssistantDetailDto
            {
                AssistantUserId = assistantUserId,
                FirstName = user?.FirstName,
                LastName = user?.LastName,
                Role = role,
                SalaryPerHour = salaryPerHour
            };
        }

        public async Task<AssistantDetailDto> CreateAndAddAssistant(int projectId, CreateAndAddAssistantRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.FirstName) ||
                string.IsNullOrWhiteSpace(req.LastName) || string.IsNullOrWhiteSpace(req.Email))
                throw new ArgumentException("כל השדות הם חובה");

            if (req.SalaryPerHour <= 0)
                throw new ArgumentException("שכר לשעה חייב להיות גדול מאפס");

            // Create the user if they don't already exist
            var existingUser = await _db.ResearchUsers.FindAsync(req.UserId);
            if (existingUser == null)
            {
                existingUser = new Models.ResearchUser
                {
                    UserId = req.UserId,
                    FirstName = req.FirstName,
                    LastName = req.LastName,
                    Email = req.Email,
                    SystemAuthorization = "עוזר מחקר",
                    Password = BCrypt.Net.BCrypt.HashPassword(req.UserId),
                };
                _db.ResearchUsers.Add(existingUser);
                await _db.SaveChangesAsync();
            }

            // Guard: user exists but isn't an RA — don't silently change their role
            if (existingUser.SystemAuthorization != "עוזר מחקר")
                throw new InvalidOperationException("המשתמש קיים במערכת עם הרשאה שאינה עוזר מחקר");

            // Guard: already assigned to this project
            var alreadyExists = await _db.ResearchAssistants
                .AnyAsync(a => a.ProjectId == projectId && a.AssistantUserId == req.UserId);
            if (alreadyExists)
                throw new InvalidOperationException("עוזר המחקר כבר משויך למחקר זה");

            _db.ResearchAssistants.Add(new Models.ResearchAssistant
            {
                AssistantUserId = req.UserId,
                ProjectId = projectId,
                Role = "עוזר מחקר",
                SalaryPerHour = req.SalaryPerHour,
            });
            await _db.SaveChangesAsync();

            return new AssistantDetailDto
            {
                AssistantUserId = req.UserId,
                FirstName = existingUser.FirstName,
                LastName = existingUser.LastName,
                Role = "עוזר מחקר",
                SalaryPerHour = req.SalaryPerHour,
            };
        }

        public async Task<bool> RemoveAssistant(int projectId, string assistantUserId)
        {
            var entry = await _db.ResearchAssistants
                .FirstOrDefaultAsync(a => a.ProjectId == projectId && a.AssistantUserId == assistantUserId);
            if (entry == null) return false;

            _db.ResearchAssistants.Remove(entry);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<AssistantDetailDto?> UpdateAssistant(int projectId, string assistantUserId, UpdateAssistantRequest req)
        {
            var trimmedId = assistantUserId.Trim();

            var entry = await _db.ResearchAssistants
                .Where(a => a.ProjectId == projectId)
                .ToListAsync()
                .ContinueWith(t => t.Result.FirstOrDefault(a => a.AssistantUserId.Trim() == trimmedId));

            if (entry == null) return null;

            if (req.SalaryPerHour.HasValue)
                entry.SalaryPerHour = req.SalaryPerHour.Value;

            var user = await _db.ResearchUsers
                .Where(u => u.UserId.Trim() == trimmedId)
                .FirstOrDefaultAsync();

            if (user != null && req.Email != null)
                user.Email = req.Email.Trim();

            await _db.SaveChangesAsync();

            return new AssistantDetailDto
            {
                AssistantUserId = entry.AssistantUserId.Trim(),
                FirstName = user?.FirstName,
                LastName = user?.LastName,
                Role = entry.Role,
                SalaryPerHour = entry.SalaryPerHour,
            };
        }

        public async Task<AssistantTrackingDto?> GetAssistantTracking(int projectId, string assistantUserId)
        {
            var trimmedId = assistantUserId.Trim();

            // Fetch assistant record (char(10) trimming in memory)
            var allAssistants = await _db.ResearchAssistants
                .Where(a => a.ProjectId == projectId)
                .ToListAsync();
            var assistant = allAssistants
                .FirstOrDefault(a => a.AssistantUserId?.Trim() == trimmedId);
            if (assistant == null) return null;

            var user = await _db.ResearchUsers.FindAsync(assistantUserId);
            var salary = assistant.SalaryPerHour ?? 0;

            // Hour reports for this assistant + project
            var allReports = await _db.ResearchHourReports
                .Where(r => r.ProjectId == projectId)
                .OrderByDescending(r => r.ReportDate)
                .ToListAsync();
            var hourReports = allReports
                .Where(r => r.UserId?.Trim() == trimmedId)
                .ToList();

            // Monthly approvals for this assistant + project
            var allApprovals = await _db.ResearchMonthlyWorkApprovals
                .Where(a => a.ProjectId == projectId)
                .ToListAsync();
            var monthlyApprovals = allApprovals
                .Where(a => a.UserId?.Trim() == trimmedId)
                .OrderByDescending(a => a.Year).ThenByDescending(a => a.Month)
                .ToList();

            var totalHours = hourReports.Sum(r => r.WorkedHours ?? 0);
            var totalPaid = monthlyApprovals
                .Where(a => a.ApprovalStatus == "אושר")
                .Sum(a => salary * (a.TotalWorkedHours ?? 0));
            var totalPending = monthlyApprovals
                .Where(a => a.ApprovalStatus == "ממתין")
                .Sum(a => salary * (a.TotalWorkedHours ?? 0));

            // Months that have been submitted and are awaiting or already approved.
            // Daily reports for these months should NOT appear in the "unsent drafts" list.
            // Rejected months ("נדחה") are excluded here so their reports re-appear as drafts.
            var submittedMonths = monthlyApprovals
                .Where(a => a.ApprovalStatus == "ממתין" || a.ApprovalStatus == "אושר")
                .Select(a => (Month: a.Month ?? 0, Year: a.Year ?? 0))
                .ToHashSet();

            // Only daily reports whose month/year has NOT been submitted/approved
            var unsubmittedReports = hourReports
                .Where(r => r.ReportDate.HasValue &&
                            !submittedMonths.Contains((
                                Month: r.ReportDate.Value.Month,
                                Year: r.ReportDate.Value.Year)))
                .ToList();

            return new AssistantTrackingDto
            {
                AssistantUserId = assistantUserId,
                FirstName = user?.FirstName,
                LastName = user?.LastName,
                SalaryPerHour = assistant.SalaryPerHour,
                TotalHours = totalHours,
                TotalPaid = totalPaid,
                TotalPending = totalPending,
                MonthlyApprovals = monthlyApprovals.Select(a => new AssistantMonthlyEntryDto
                {
                    MonthlyApprovalId = a.MonthlyApprovalId,
                    Month = a.Month,
                    Year = a.Year,
                    ApprovalStatus = a.ApprovalStatus,
                    TotalWorkedHours = a.TotalWorkedHours,
                    TotalPaymentAmount = salary > 0 && a.TotalWorkedHours.HasValue
                        ? salary * a.TotalWorkedHours.Value
                        : null,
                    ApprovalDate = a.ApprovalDate?.ToString("yyyy-MM-dd"),
                    Comments = a.Comments,
                }).ToList(),
                // Only returns drafts not yet sent for approval
                HourReports = unsubmittedReports.Select(r => new AssistantHourEntryDto
                {
                    HourReportId = r.HourReportId,
                    ReportDate = r.ReportDate?.ToString("yyyy-MM-dd"),
                    FromHour = r.FromHour?.ToString("HH:mm"),
                    ToHour = r.ToHour?.ToString("HH:mm"),
                    WorkedHours = r.WorkedHours,
                    Comments = r.Comments,
                }).ToList(),
            };
        }

        // ── Future Commitments ────────────────────────────────────────────────

        public async Task<List<FutureCommitmentDto>> GetCommitments(int projectId)
        {
            return await _db.ResearchFutureCommitments
                .Where(c => c.ProjectId == projectId)
                .Select(c => ToCommitmentDto(c))
                .ToListAsync();
        }

        public async Task<FutureCommitmentDto> AddCommitment(int projectId, CreateFutureCommitmentRequest req)
        {
            var commitment = new ResearchFutureCommitment
            {
                ProjectId = projectId,
                CategoryName = req.CategoryName,
                CommitmentDescription = req.CommitmentDescription,
                ExpectedDate = req.ExpectedDate,
                ExpectedAmount = req.ExpectedAmount,
                Status = "מתוכנן",
                Notes = req.Notes,
            };
            _db.ResearchFutureCommitments.Add(commitment);
            await _db.SaveChangesAsync();
            return ToCommitmentDto(commitment);
        }

        public async Task<bool> DeleteCommitment(int commitmentId)
        {
            var entry = await _db.ResearchFutureCommitments.FindAsync(commitmentId);
            if (entry == null) return false;

            _db.ResearchFutureCommitments.Remove(entry);
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Files ─────────────────────────────────────────────────────────────

        public async Task<List<FileRecordDto>> GetFiles(int projectId)
        {
            return await _db.ResearchFiles
                .Where(f => f.ProjectId == projectId)
                .Select(f => new FileRecordDto
                {
                    FileId = f.FileId,
                    FileName = f.FileName,
                    Path = f.Path,
                    FolderName = f.FolderName,
                    FileType = f.FileType,
                }).ToListAsync();
        }

        public async Task<bool> DeleteFile(int fileId)
        {
            var file = await _db.ResearchFiles.FindAsync(fileId);
            if (file == null) return false;

            _db.ResearchFiles.Remove(file);
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Providers ─────────────────────────────────────────────────────────

        public async Task<List<ProviderDto>> GetProviders()
        {
            return await _db.ResearchProviders
                .OrderBy(p => p.ProviderName)
                .Select(p => new ProviderDto
                {
                    ProviderId = p.ProviderId,
                    ProviderName = p.ProviderName,
                    Phone = p.Phone,
                    Email = p.Email,
                    Notes = p.Notes,
                }).ToListAsync();
        }

        public async Task<ProviderDto> CreateProvider(CreateProviderRequest req)
        {
            var provider = new ResearchProvider
            {
                ProviderName = req.ProviderName,
                Phone = req.Phone,
                Email = req.Email,
                Notes = req.Notes,
            };
            _db.ResearchProviders.Add(provider);
            await _db.SaveChangesAsync();
            return new ProviderDto
            {
                ProviderId = provider.ProviderId,
                ProviderName = provider.ProviderName,
                Phone = provider.Phone,
                Email = provider.Email,
                Notes = provider.Notes,
            };
        }

        // ── Budget categories ─────────────────────────────────────────────────

        public async Task<List<BudgetCategoryDto>> GetBudgetCategories(int projectId)
        {
            return await _db.ResearchBudgetCategories
                .Where(c => c.ProjectId == projectId)
                .OrderBy(c => c.ResearchBudgetCategoryId)
                .Select(c => new BudgetCategoryDto
                {
                    ResearchBudgetCategoryId = c.ResearchBudgetCategoryId,
                    CategoryName = c.CategoryName,
                    AllocatedAmount = c.AllocatedAmount,
                })
                .ToListAsync();
        }

        public async Task<List<BudgetCategoryDto>> ReplaceBudgetCategories(int projectId, List<UpdateBudgetCategoryItem> items)
        {
            var existing = await _db.ResearchBudgetCategories
                .Where(c => c.ProjectId == projectId)
                .ToListAsync();
            _db.ResearchBudgetCategories.RemoveRange(existing);

            foreach (var item in items)
            {
                _db.ResearchBudgetCategories.Add(new ResearchBudgetCategory
                {
                    ProjectId = projectId,
                    CategoryName = item.CategoryName,
                    AllocatedAmount = item.AllocatedAmount,
                });
            }

            await _db.SaveChangesAsync();
            return await GetBudgetCategories(projectId);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task EnsureUserInTeam(int projectId, string userId, string role)
        {
            if (string.IsNullOrWhiteSpace(userId)) return;
            var exists = await _db.ResearchUsersProjects
                .AnyAsync(up => up.ProjectId == projectId && up.UserId == userId);
            if (!exists)
            {
                _db.ResearchUsersProjects.Add(new ResearchUsersProject
                {
                    UserId = userId,
                    ProjectId = projectId,
                    ProjectRole = role,
                });
                await _db.SaveChangesAsync();
            }
        }

        private static ProjectResponseDto ToDto(ResearchProject p) => new()
        {
            ProjectId = p.ProjectId,
            ProjectNameHe = p.ProjectNameHe,
            ProjectNameEn = p.ProjectNameEn,
            ProjectDescription = p.ProjectDescription,
            TotalBudget = p.TotalBudget,
            CenterId = p.CenterId,
            PrincipalResearcherId = p.PrincipalResearcherId,
            CreatedDate = p.CreatedDate,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            Status = p.Status,
            ResearchExpenses = p.ResearchExpenses
        };

        private static FutureCommitmentDto ToCommitmentDto(ResearchFutureCommitment c) => new()
        {
            CommitmentId = c.CommitmentId,
            CategoryName = c.CategoryName,
            CommitmentDescription = c.CommitmentDescription,
            ExpectedDate = c.ExpectedDate,
            ExpectedAmount = c.ExpectedAmount,
            Status = c.Status,
            Notes = c.Notes,
        };
    }
}
