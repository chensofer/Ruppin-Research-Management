using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_assistants")]
    public class ResearchAssistant
    {
        // Composite PK: (assistant_user_id, project_id) — configured in AppDbContext
        [Column("assistant_user_id")]
        [StringLength(10)]
        public string AssistantUserId { get; set; } = null!;

        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("role")]
        [StringLength(50)]
        public string? Role { get; set; }

        [Column("salary_per_hour")]
        public decimal? SalaryPerHour { get; set; }

        [Column("social_benefits_percent")]
        public decimal? SocialBenefitsPercent { get; set; }

        [Column("employment_status")]
        [StringLength(50)]
        public string? EmploymentStatus { get; set; }
    }
}
