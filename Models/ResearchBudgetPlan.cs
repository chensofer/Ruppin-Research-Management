using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_budget_plans")]
    public class ResearchBudgetPlan
    {
        [Key]
        [Column("budget_plan_id")]
        public int BudgetPlanId { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("category_name")]
        [StringLength(50)]
        public string? CategoryName { get; set; }

        [Column("plan_description")]
        [StringLength(500)]
        public string? PlanDescription { get; set; }

        [Column("planned_amount")]
        public decimal? PlannedAmount { get; set; }

        [Column("planned_date")]
        public DateOnly? PlannedDate { get; set; }

        [Column("notes")]
        [StringLength(255)]
        public string? Notes { get; set; }
    }
}
