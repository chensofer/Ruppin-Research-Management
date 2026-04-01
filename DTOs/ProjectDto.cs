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
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Status { get; set; }
        public decimal? ResearchExpenses { get; set; }
    }
}
