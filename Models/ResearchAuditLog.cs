using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_audit_logs")]
    public class ResearchAuditLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("performed_by_user_id")]
        [StringLength(20)]
        public string PerformedByUserId { get; set; } = null!;

        [Column("action_type")]
        [StringLength(100)]
        public string ActionType { get; set; } = null!;

        [Column("action_description")]
        [StringLength(500)]
        public string ActionDescription { get; set; } = null!;

        [Column("entity_type")]
        [StringLength(50)]
        public string? EntityType { get; set; }

        [Column("entity_id")]
        [StringLength(50)]
        public string? EntityId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
