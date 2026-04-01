using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_budget_categories")]
    public class ResearchBudgetCategory
    {
        [Key]
        [Column("research_budget_category_id")]
        public int ResearchBudgetCategoryId { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("category_name")]
        [StringLength(50)]
        public string? CategoryName { get; set; }

        [Column("allocated_amount")]
        public decimal? AllocatedAmount { get; set; }

        [Column("notes")]
        [StringLength(255)]
        public string? Notes { get; set; }
    }
}
