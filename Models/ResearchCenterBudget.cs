using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_center_budgets")]
    public class ResearchCenterBudget
    {
        [Key]
        [Column("center_budget_id")]
        public int CenterBudgetId { get; set; }

        [Column("center_id")]
        public short? CenterId { get; set; }

        [Column("budget_year")]
        public int? BudgetYear { get; set; }

        [Column("total_budget")]
        public decimal? TotalBudget { get; set; }

        [Column("notes")]
        [StringLength(255)]
        public string? Notes { get; set; }
    }
}
