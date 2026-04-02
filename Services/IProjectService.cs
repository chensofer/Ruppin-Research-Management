using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IProjectService
    {
        Task<List<ProjectResponseDto>> GetAll();
        Task<ProjectResponseDto?> GetById(int id);
        Task<ProjectResponseDto> Create(CreateProjectDto dto);
        Task<ProjectResponseDto> CreateFull(CreateFullProjectDto dto, string requestedByUserId);
        Task<ProjectResponseDto?> Update(int id, UpdateProjectDto dto);
        Task<bool> Delete(int id);
        Task<FileRecordDto> SaveFileRecord(int projectId, string fileName, string relativePath, string fileType, string? folderName, string? userId);
    }
}
