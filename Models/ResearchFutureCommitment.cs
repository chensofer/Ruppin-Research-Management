using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_future_commitments")]
    public class ResearchFutureCommitment
    {
        [Key]
        [Column("commitment_id")]
        public int CommitmentId { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("category_name")]
        [StringLength(50)]
        public string? CategoryName { get; set; }

        [Column("commitment_description")]
        [StringLength(500)]
        public string? CommitmentDescription { get; set; }

        [Column("expected_date")]
        public DateOnly? ExpectedDate { get; set; }

        [Column("expected_amount")]
        public decimal? ExpectedAmount { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string? Status { get; set; }

        [Column("notes")]
        [StringLength(255)]
        public string? Notes { get; set; }
    }
}
