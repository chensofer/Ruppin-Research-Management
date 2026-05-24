using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_activity_log")]
    public class ResearchActivityLog
    {
        [Key]
        [Column("log_id")]
        public int LogId { get; set; }

        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("action_type")]
        [StringLength(100)]
        public string ActionType { get; set; } = null!;

        [Column("action_description")]
        [StringLength(500)]
        public string? ActionDescription { get; set; }

        [Column("performed_by_user_id")]
        [StringLength(10)]
        public string? PerformedByUserId { get; set; }

        [Column("performed_by_name")]
        [StringLength(200)]
        public string? PerformedByName { get; set; }

        [Column("performed_at")]
        public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
    }
}
