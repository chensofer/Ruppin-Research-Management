using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_providers")]
    public class ResearchProvider
    {
        [Key]
        [Column("provider_id")]
        public int ProviderId { get; set; }

        [Column("provider_name")]
        [StringLength(255)]
        public string? ProviderName { get; set; }

        [Column("phone")]
        [StringLength(20)]
        public string? Phone { get; set; }

        [Column("email")]
        [StringLength(255)]
        public string? Email { get; set; }

        [Column("notes")]
        [StringLength(255)]
        public string? Notes { get; set; }
    }
}
