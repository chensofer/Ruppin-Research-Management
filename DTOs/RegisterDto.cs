using System.ComponentModel.DataAnnotations;

namespace RupResearchAPI.DTOs
{
    public class RegisterDto
    {
        [Required]
        [StringLength(10)]
        public string UserId { get; set; } = null!;

        public int? EmployeeNo { get; set; }

        [StringLength(50)]
        public string? FirstName { get; set; }

        [StringLength(50)]
        public string? LastName { get; set; }

        [StringLength(255)]
        public string? Email { get; set; }

        [StringLength(50)]
        public string? SystemAuthorization { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = null!;
    }
}
