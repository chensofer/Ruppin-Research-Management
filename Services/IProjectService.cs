using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IProjectService
    {
        Task<List<ProjectResponseDto>> GetAll(string userId);
        Task<ProjectResponseDto?> GetById(int id);
        Task<ProjectDetailDto?> GetDetail(int id);
        Task<ProjectResponseDto> Create(CreateProjectDto dto, string creatorUserId);
        Task<ProjectResponseDto> CreateFull(CreateFullProjectDto dto, string requestedByUserId);
        Task<ProjectResponseDto?> Update(int id, UpdateProjectDto dto);
        Task<bool> Delete(int id);
        Task<FileRecordDto> SaveFileRecord(int projectId, string fileName, string relativePath, string fileType, string? folderName, string? userId);

        // Team
        Task<List<TeamMemberDetailDto>> GetTeam(int projectId);
        Task<TeamMemberDetailDto?> AddTeamMember(int projectId, string userId, string projectRole);
        Task<bool> RemoveTeamMember(int projectId, string userId);

        // Assistants
        Task<List<AssistantDetailDto>> GetAssistants(int projectId);
        Task<AssistantDetailDto?> AddAssistant(int projectId, string assistantUserId, string? role, decimal? salaryPerHour);
        Task<bool> RemoveAssistant(int projectId, string assistantUserId);

        // Future commitments
        Task<List<FutureCommitmentDto>> GetCommitments(int projectId);
        Task<FutureCommitmentDto> AddCommitment(int projectId, CreateFutureCommitmentRequest req);
        Task<bool> DeleteCommitment(int commitmentId);

        // Files
        Task<List<FileRecordDto>> GetFiles(int projectId);
        Task<bool> DeleteFile(int fileId);

        // Providers
        Task<List<ProviderDto>> GetProviders();
        Task<ProviderDto> CreateProvider(CreateProviderRequest req);

    }
}
