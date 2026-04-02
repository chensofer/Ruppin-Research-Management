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

        public async Task<List<ProjectResponseDto>> GetAll()
        {
            return await _db.ResearchProjects
                .Select(p => ToDto(p))
                .ToListAsync();
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
            List<TeamMemberDetailDto> teamMembers;
            try
            {
                teamMembers = await (
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

        public async Task<ProjectResponseDto> Create(CreateProjectDto dto)
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

                foreach (var member in dto.TeamMembers)
                {
                    _db.ResearchUsersProjects.Add(new ResearchUsersProject
                    {
                        UserId = member.UserId,
                        ProjectId = project.ProjectId,
                        ProjectRole = member.ProjectRole,
                    });
                }

                foreach (var ast in dto.Assistants)
                {
                    if (ast.IsNewUser)
                    {
                        var newUser = new ResearchUser
                        {
                            UserId = ast.AssistantUserId!,
                            FirstName = ast.FirstName,
                            LastName = ast.LastName,
                            Email = ast.Email,
                            SystemAuthorization = "עוזר מחקר",
                            Password = BCrypt.Net.BCrypt.HashPassword("Temp1234!"),
                        };
                        _db.ResearchUsers.Add(newUser);
                        await _db.SaveChangesAsync();
                    }

                    _db.ResearchAssistants.Add(new ResearchAssistant
                    {
                        AssistantUserId = ast.AssistantUserId!,
                        ProjectId = project.ProjectId,
                        Role = ast.Role,
                        SalaryPerHour = ast.SalaryPerHour,
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
                    });
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return ToDto(project);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
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
            return await (
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
        }

        public async Task<TeamMemberDetailDto?> AddTeamMember(int projectId, string userId, string projectRole)
        {
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

            var user = await _db.ResearchUsers.FindAsync(userId);
            return new TeamMemberDetailDto
            {
                UserId = userId,
                FirstName = user?.FirstName,
                LastName = user?.LastName,
                ProjectRole = projectRole,
                SystemAuthorization = user?.SystemAuthorization
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

        public async Task<bool> RemoveAssistant(int projectId, string assistantUserId)
        {
            var entry = await _db.ResearchAssistants
                .FirstOrDefaultAsync(a => a.ProjectId == projectId && a.AssistantUserId == assistantUserId);
            if (entry == null) return false;

            _db.ResearchAssistants.Remove(entry);
            await _db.SaveChangesAsync();
            return true;
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

        // ── Helpers ───────────────────────────────────────────────────────────

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
