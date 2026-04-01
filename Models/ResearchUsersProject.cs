using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_users_projects")]
    public class ResearchUsersProject
    {
        // Composite PK: (user_id, project_id) — configured in AppDbContext
        [Column("user_id")]
        [StringLength(10)]
        public string UserId { get; set; } = null!;

        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("project_role")]
        [StringLength(50)]
        public string? ProjectRole { get; set; }
    }
}
