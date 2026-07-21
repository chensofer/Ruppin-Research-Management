namespace RupResearchAPI.DTOs
{
    public class ProjectResponseDto
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
        public DateOnly? CreatedDate { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Status { get; set; }
        public decimal? ResearchExpenses { get; set; }
        // Computed budget stats
        public decimal TotalPaid { get; set; }
        public int PendingCount { get; set; }
        public int PendingHourApprovalsCount { get; set; }
        public decimal TotalFuture { get; set; }
        public decimal RemainingBalance { get; set; }
        public decimal AvailableBalance { get; set; }
        public int TeamMemberCount { get; set; }

        // Salary-specific budget tracking (for performance score)
        public decimal SalaryBudgetPlanned { get; set; }
        public decimal SalaryActualPaid { get; set; }
        public decimal SalaryFutureCommitted { get; set; }

        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
    }

    public class CreateProjectDto
    {
        public string? ProjectNameHe { get; set; }
        public string? ProjectNameEn { get; set; }
        public string? ProjectDescription { get; set; }
        public decimal? TotalBudget { get; set; }
        public short? CenterId { get; set; }
        public string? PrincipalResearcherId { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Status { get; set; }
    }

    public class UpdateProjectDto
    {
        public string? ProjectNameHe { get; set; }
        public string? ProjectNameEn { get; set; }
        public string? ProjectDescription { get; set; }
        public decimal? TotalBudget { get; set; }
        public short? CenterId { get; set; }
        public string? PrincipalResearcherId { get; set; }
        public string? FundingSource { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Status { get; set; }
        public decimal? ResearchExpenses { get; set; }
    }
}
