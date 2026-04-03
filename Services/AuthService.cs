using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Models;

namespace RupResearchAPI.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public async Task<AuthResponseDto> Register(RegisterDto dto)
        {
            bool exists = await _db.ResearchUsers.AnyAsync(u => u.UserId == dto.UserId);
            if (exists)
                throw new InvalidOperationException("User ID already exists.");

            if (!string.IsNullOrEmpty(dto.SystemAuthorization))
            {
                bool roleExists = await _db.ResearchRoles.AnyAsync(r => r.RoleName == dto.SystemAuthorization);
                if (!roleExists)
                    throw new InvalidOperationException($"Role '{dto.SystemAuthorization}' does not exist.");
            }

            var user = new ResearchUser
            {
                UserId = dto.UserId,
                EmployeeNo = dto.EmployeeNo,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                SystemAuthorization = dto.SystemAuthorization,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password)
            };

            _db.ResearchUsers.Add(user);
            await _db.SaveChangesAsync();

            return BuildAuthResponse(user);
        }

        public async Task<AuthResponseDto> Login(LoginDto dto)
        {
            var user = await _db.ResearchUsers.FirstOrDefaultAsync(u => u.UserId == dto.UserId);
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
                throw new UnauthorizedAccessException("Invalid user ID or password.");

            return BuildAuthResponse(user);
        }

        private AuthResponseDto BuildAuthResponse(ResearchUser user)
        {
            return new AuthResponseDto
            {
                Token = GenerateJwtToken(user),
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                SystemAuthorization = user.SystemAuthorization
            };
        }

        private string GenerateJwtToken(ResearchUser user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var claims = new[]
            {
                new Claim("user_id", user.UserId),
                new Claim("first_name", user.FirstName ?? ""),
                new Claim("last_name", user.LastName ?? ""),
                new Claim("system_authorization", user.SystemAuthorization ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
