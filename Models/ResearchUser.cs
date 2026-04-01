using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_users")]
    public class ResearchUser
    {
        [Key]
        [Column("user_id")]
        [StringLength(10)]
        public string UserId { get; set; } = null!;

        [Column("employee_no")]
        public int? EmployeeNo { get; set; }

        [Column("first_name")]
        [StringLength(50)]
        public string? FirstName { get; set; }

        [Column("last_name")]
        [StringLength(50)]
        public string? LastName { get; set; }

        [Column("email")]
        [StringLength(255)]
        public string? Email { get; set; }

        [Column("system_authorization")]
        [StringLength(50)]
        public string? SystemAuthorization { get; set; }

        [Required]
        [Column("password")]
        [StringLength(255)]
        public string Password { get; set; } = null!;
    }
}
