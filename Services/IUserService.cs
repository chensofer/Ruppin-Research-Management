using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDto>> GetUsersAsync(string? role);
    }
}
