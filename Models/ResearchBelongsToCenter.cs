using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_belongs_to_centers")]
    public class ResearchBelongsToCenter
    {
        // Composite PK: (user_id, center_id) — configured in AppDbContext
        [Column("user_id")]
        [StringLength(10)]
        public string UserId { get; set; } = null!;

        [Column("center_id")]
        public short CenterId { get; set; }

        [Column("from_date")]
        public DateOnly? FromDate { get; set; }

        [Column("to_date")]
        public DateOnly? ToDate { get; set; }

        [Column("comments")]
        [StringLength(255)]
        public string? Comments { get; set; }
    }
}
