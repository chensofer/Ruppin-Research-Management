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
    }
}
