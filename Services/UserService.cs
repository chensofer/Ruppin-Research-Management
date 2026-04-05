using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;

namespace RupResearchAPI.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _db;

        public UserService(AppDbContext db) => _db = db;

        public async Task<IEnumerable<UserResponseDto>> GetUsersAsync(string? role)
        {
            var query = _db.ResearchUsers.AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
            {
                var roles = role.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                query = query.Where(u => roles.Contains(u.SystemAuthorization));
            }

            return await query
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Select(u => new UserResponseDto
                {
                    UserId = u.UserId,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    SystemAuthorization = u.SystemAuthorization,
                })
                .ToListAsync();
        }

        public async Task<UserResponseDto?> GetByIdAsync(string userId)
        {
            var trimmed = userId.Trim();
            var users = await _db.ResearchUsers.ToListAsync();
            var u = users.FirstOrDefault(x => x.UserId.Trim() == trimmed);
            if (u == null) return null;
            return new UserResponseDto
            {
                UserId = u.UserId.Trim(),
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                SystemAuthorization = u.SystemAuthorization,
            };
        }

        public async Task<UserResponseDto?> UpdateProfileAsync(string userId, UpdateProfileDto dto)
        {
            var trimmed = userId.Trim();
            var users = await _db.ResearchUsers.ToListAsync();
            var user = users.FirstOrDefault(x => x.UserId.Trim() == trimmed);
            if (user == null) return null;

            if (dto.FirstName != null) user.FirstName = dto.FirstName.Trim();
            if (dto.LastName != null)  user.LastName  = dto.LastName.Trim();
            if (dto.Email != null)     user.Email     = dto.Email.Trim();

            await _db.SaveChangesAsync();

            return new UserResponseDto
            {
                UserId = user.UserId.Trim(),
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                SystemAuthorization = user.SystemAuthorization,
            };
        }

        public async Task ChangePasswordAsync(string userId, ChangePasswordDto dto)
        {
            var trimmed = userId.Trim();
            var users = await _db.ResearchUsers.ToListAsync();
            var user = users.FirstOrDefault(x => x.UserId.Trim() == trimmed);
            if (user == null) throw new KeyNotFoundException("משתמש לא נמצא");

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.Password))
                throw new UnauthorizedAccessException("הסיסמה הנוכחית שגויה");

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _db.SaveChangesAsync();
        }
    }
}
