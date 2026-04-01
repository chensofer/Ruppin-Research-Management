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
