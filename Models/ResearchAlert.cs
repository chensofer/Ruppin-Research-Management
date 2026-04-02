using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_alerts")]
    public class ResearchAlert
    {
        [Key]
        [Column("alert_id")]
        public int AlertId { get; set; }

        [Column("alert_content")]
        [StringLength(510)]
        public string? AlertContent { get; set; }

        [Column("description")]
        [StringLength(510)]
        public string? Description { get; set; }
    }
}
