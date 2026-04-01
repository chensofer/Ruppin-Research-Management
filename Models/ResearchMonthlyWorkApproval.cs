using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_monthly_work_approvals")]
    public class ResearchMonthlyWorkApproval
    {
        [Key]
        [Column("monthly_approval_id")]
        public int MonthlyApprovalId { get; set; }

        [Column("user_id")]
        [StringLength(10)]
        public string? UserId { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("month")]
        public int? Month { get; set; }

        [Column("year")]
        public int? Year { get; set; }

        [Column("approval_status")]
        [StringLength(50)]
        public string? ApprovalStatus { get; set; }

        [Column("approved_by_user_id")]
        [StringLength(10)]
        public string? ApprovedByUserId { get; set; }

        [Column("approval_date")]
        public DateOnly? ApprovalDate { get; set; }

        [Column("total_worked_hours")]
        public decimal? TotalWorkedHours { get; set; }

        [Column("comments")]
        [StringLength(255)]
        public string? Comments { get; set; }
    }
}
