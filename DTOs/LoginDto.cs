using System.ComponentModel.DataAnnotations;

namespace RupResearchAPI.DTOs
{
    public class LoginDto
    {
        [Required]
        public string UserId { get; set; } = null!;

        [Required]
        public string Password { get; set; } = null!;
    }
}
