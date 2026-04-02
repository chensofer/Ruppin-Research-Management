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
                // 1. Create the project
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
                await _db.SaveChangesAsync(); // need ProjectId for FK relations

                // 2. Budget categories
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

                // 3. Team members
                foreach (var member in dto.TeamMembers)
                {
                    _db.ResearchUsersProjects.Add(new ResearchUsersProject
                    {
                        UserId = member.UserId,
                        ProjectId = project.ProjectId,
                        ProjectRole = member.ProjectRole,
                    });
                }

                // 4. Assistants
                foreach (var ast in dto.Assistants)
                {
                    if (ast.IsNewUser)
                    {
                        // Create a minimal user record for the new assistant
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

                // 5. Already-paid expenses → payment requests with status "שולם"
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
    }
}
