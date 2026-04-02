namespace RupResearchAPI.DTOs
{
    public class AuthResponseDto
    {
        public string Token { get; set; } = null!;
        public string UserId { get; set; } = null!;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? SystemAuthorization { get; set; }
    }
}
