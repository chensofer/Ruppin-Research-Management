namespace RupResearchAPI.DTOs
{
    public class CreateFullProjectDto
    {
        // Step 1: Research details
        public string? ProjectNameHe { get; set; }
        public string? ProjectNameEn { get; set; }
        public string? ProjectDescription { get; set; }
        public decimal? TotalBudget { get; set; }
        public string? Status { get; set; }
        public string? FundingSource { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? PrincipalResearcherId { get; set; }
        public short? CenterId { get; set; }

        // Step 2: Budget categories
        public List<FullBudgetCategoryDto> BudgetCategories { get; set; } = new();

        // Step 3: Team members
        public List<FullTeamMemberDto> TeamMembers { get; set; } = new();

        // Step 4: Assistants
        public List<FullAssistantDto> Assistants { get; set; } = new();

        // Step 5: Expenses (already-paid)
        public List<FullExpenseDto> Expenses { get; set; } = new();
    }

    public class FullBudgetCategoryDto
    {
        public string? CategoryName { get; set; }
        public decimal? AllocatedAmount { get; set; }
        public string? Notes { get; set; }
    }

    public class FullTeamMemberDto
    {
        public string UserId { get; set; } = null!;
        public string? ProjectRole { get; set; }
    }

    public class FullAssistantDto
    {
        // Set when selecting an existing user
        public string? AssistantUserId { get; set; }

        // Set when creating a brand-new user as assistant
        public bool IsNewUser { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }

        public string? Role { get; set; }
        public decimal? SalaryPerHour { get; set; }
    }

    public class FullExpenseDto
    {
        public string? RequestTitle { get; set; }
        public string? RequestDescription { get; set; }
        public decimal? RequestedAmount { get; set; }
        public DateOnly? RequestDate { get; set; }
        public string? CategoryName { get; set; }
        public int? ProviderId { get; set; }
    }
}
