using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_projects")]
    public class ResearchProject
    {
        [Key]
        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("project_name_he")]
        [StringLength(255)]
        public string? ProjectNameHe { get; set; }

        [Column("project_name_en")]
        [StringLength(255)]
        public string? ProjectNameEn { get; set; }

        [Column("project_description")]
        [StringLength(1000)]
        public string? ProjectDescription { get; set; }

        [Column("total_budget")]
        public decimal? TotalBudget { get; set; }

        [Column("center_id")]
        public short? CenterId { get; set; }

        [Column("principal_researcher_id")]
        [StringLength(10)]
        public string? PrincipalResearcherId { get; set; }

        [Column("created_date")]
        public DateOnly? CreatedDate { get; set; }

        [Column("start_date")]
        public DateOnly? StartDate { get; set; }

        [Column("end_date")]
        public DateOnly? EndDate { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string? Status { get; set; }

        [Column("research_expenses")]
        public decimal? ResearchExpenses { get; set; }
    }
}
