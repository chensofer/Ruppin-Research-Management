using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IHourReportService
    {
        Task<List<HourReportDto>> GetReports(string userId, int projectId, int month, int year);
        Task<HourReportDto> CreateReport(CreateHourReportDto dto);
        Task<bool> DeleteReport(int id, string userId);

        Task<MonthlyApprovalDto?> GetMonthlyApproval(string userId, int projectId, int month, int year);
        Task<MonthlyApprovalDto> SubmitMonthly(SubmitMonthlyApprovalDto dto);
        Task<MonthlyApprovalDto?> DecideMonthly(int id, DecideMonthlyApprovalDto dto);
        Task<List<MonthlyApprovalDto>> GetPendingForResearcher(string researcherId);
        Task<List<AssistantProjectDto>> GetProjectsForAssistant(string userId);
    }
}
