using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> Register(RegisterDto dto);
        Task<AuthResponseDto> Login(LoginDto dto);
        Task ForgotPassword(string userId);
        Task ResetPassword(string token, string newPassword);
    }
}
