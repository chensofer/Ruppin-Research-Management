using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_roles")]
    public class ResearchRole
    {
        [Key]
        [Column("role_name")]
        [StringLength(50)]
        public string RoleName { get; set; } = null!;

        [Column("type")]
        public byte? Type { get; set; }
    }
}
