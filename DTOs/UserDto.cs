namespace RupResearchAPI.DTOs
{
    public class UserResponseDto
    {
        public string UserId { get; set; } = null!;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? SystemAuthorization { get; set; }
    }

    public record UpdateProfileDto(string? FirstName, string? LastName, string? Email);

    public record ChangePasswordDto(string CurrentPassword, string NewPassword);
}
