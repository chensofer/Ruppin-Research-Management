using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_centers")]
    public class ResearchCenter
    {
        [Key]
        [Column("center_id")]
        public short CenterId { get; set; }

        [Column("center_name")]
        [StringLength(255)]
        public string? CenterName { get; set; }

        [Column("opening_date")]
        public DateOnly? OpeningDate { get; set; }

        [Column("closing_date")]
        public DateOnly? ClosingDate { get; set; }

        [Column("center_description")]
        [StringLength(500)]
        public string? CenterDescription { get; set; }

        [Column("manager_id1")]
        [StringLength(10)]
        public string? ManagerId1 { get; set; }

        [Column("manager_id2")]
        [StringLength(10)]
        public string? ManagerId2 { get; set; }
    }
}
