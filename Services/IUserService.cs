using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDto>> GetUsersAsync(string? role);
        Task<UserResponseDto?> GetByIdAsync(string userId);
        Task<UserResponseDto?> UpdateProfileAsync(string userId, UpdateProfileDto dto);
        Task ChangePasswordAsync(string userId, ChangePasswordDto dto);
    }
}
