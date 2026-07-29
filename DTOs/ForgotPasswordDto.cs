namespace RupResearchAPI.DTOs
{
    public class ForgotPasswordDto
    {
        public string UserId { get; set; } = "";
    }

    public class ResetPasswordDto
    {
        public string Token { get; set; } = "";
        public string NewPassword { get; set; } = "";
    }
}
