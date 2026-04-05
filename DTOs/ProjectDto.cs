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
        public string? PrincipalResearcherId { get; set; }
        public DateOnly? CreatedDate { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Status { get; set; }
        public decimal? ResearchExpenses { get; set; }
        // Computed budget stats
        public decimal TotalPaid { get; set; }
        public int PendingCount { get; set; }
        public decimal TotalFuture { get; set; }
        public decimal RemainingBalance { get; set; }
        public decimal AvailableBalance { get; set; }
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
