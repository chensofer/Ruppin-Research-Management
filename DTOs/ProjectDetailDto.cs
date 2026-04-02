namespace RupResearchAPI.DTOs
{
    public class TeamMemberDetailDto
    {
        public string UserId { get; set; } = null!;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? ProjectRole { get; set; }
        public string? SystemAuthorization { get; set; }
    }

    public class AssistantDetailDto
    {
        public string AssistantUserId { get; set; } = null!;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Role { get; set; }
        public decimal? SalaryPerHour { get; set; }
    }

    public class FutureCommitmentDto
    {
        public int CommitmentId { get; set; }
        public string? CategoryName { get; set; }
        public string? CommitmentDescription { get; set; }
        public DateOnly? ExpectedDate { get; set; }
        public decimal? ExpectedAmount { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class ProjectDetailDto
    {
        public int ProjectId { get; set; }
        public string? ProjectNameHe { get; set; }
        public string? ProjectNameEn { get; set; }
        public string? ProjectDescription { get; set; }
        public decimal? TotalBudget { get; set; }
        public short? CenterId { get; set; }
        public string? CenterName { get; set; }
        public string? PrincipalResearcherId { get; set; }
        public string? PrincipalResearcherName { get; set; }
        public string? FundingSource { get; set; }
        public DateOnly? CreatedDate { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Status { get; set; }

        // Budget stats
        public decimal TotalPaid { get; set; }
        public decimal TotalFuture { get; set; }
        public decimal RemainingBalance { get; set; }   // budget - paid
        public decimal AvailableBalance { get; set; }  // budget - paid - future
        public int PendingCount { get; set; }
        public decimal ApprovedTotal { get; set; }

        public List<TeamMemberDetailDto> TeamMembers { get; set; } = [];
        public List<AssistantDetailDto> Assistants { get; set; } = [];
    }

    // Requests for add operations
    public record AddTeamMemberRequest(string UserId, string ProjectRole);
    public record AddAssistantRequest(string AssistantUserId, string? Role, decimal? SalaryPerHour);
    public record CreateFutureCommitmentRequest(
        string? CategoryName,
        string? CommitmentDescription,
        DateOnly? ExpectedDate,
        decimal? ExpectedAmount,
        string? Notes);
    public record CreateProviderRequest(string ProviderName, string? Phone, string? Email, string? Notes);

    public class ProviderDto
    {
        public int ProviderId { get; set; }
        public string? ProviderName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Notes { get; set; }
    }
}
