using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IMemoryCache _cache;
        private readonly IEmailService _email;

        public AuthService(AppDbContext db, IConfiguration config, IMemoryCache cache, IEmailService email)
        {
            _db = db;
            _config = config;
            _cache = cache;
            _email = email;
        }

        public async Task<AuthResponseDto> Register(RegisterDto dto)
        {
            bool exists = await _db.ResearchUsers.AnyAsync(u => u.UserId == dto.UserId);
            if (exists)
                throw new InvalidOperationException("משתמש עם מזהה זה כבר קיים במערכת.");

            if (!string.IsNullOrEmpty(dto.SystemAuthorization))
            {
                bool roleExists = await _db.ResearchRoles.AnyAsync(r => r.RoleName == dto.SystemAuthorization);
                if (!roleExists)
                    throw new InvalidOperationException($"התפקיד '{dto.SystemAuthorization}' אינו קיים במערכת.");
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
                throw new UnauthorizedAccessException("מזהה משתמש או סיסמה שגויים.");

            return BuildAuthResponse(user);
        }

        private AuthResponseDto BuildAuthResponse(ResearchUser user)
        {
            return new AuthResponseDto
            {
                Token = GenerateJwtToken(user),
                UserId = user.UserId.Trim(),
                FirstName = user.FirstName?.Trim(),
                LastName = user.LastName?.Trim(),
                SystemAuthorization = user.SystemAuthorization?.Trim()
            };
        }

        public async Task ForgotPassword(string userId)
        {
            var user = await _db.ResearchUsers.FirstOrDefaultAsync(u => u.UserId == userId.Trim());
            if (user == null || string.IsNullOrWhiteSpace(user.Email))
                throw new InvalidOperationException("לא נמצא משתמש עם מזהה זה, או שאין כתובת מייל מוגדרת בחשבון.");

            var token = Guid.NewGuid().ToString("N");
            _cache.Set($"pwd_reset_{token}", user.UserId.Trim(), TimeSpan.FromHours(1));

            var siteUrl = _config["Email:SiteUrl"] ?? "";
            var resetLink = $"{siteUrl}/reset-password?token={token}";
            var name = $"{user.FirstName?.Trim()} {user.LastName?.Trim()}".Trim();

            await _email.SendPasswordResetEmailAsync(user.Email, name, resetLink);
        }

        public async Task ResetPassword(string token, string newPassword)
        {
            if (!_cache.TryGetValue($"pwd_reset_{token}", out string? userId) || userId == null)
                throw new InvalidOperationException("הקישור לאיפוס סיסמה אינו תקף או שפג תוקפו.");

            var user = await _db.ResearchUsers.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                throw new InvalidOperationException("משתמש לא נמצא.");

            user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _db.SaveChangesAsync();
            _cache.Remove($"pwd_reset_{token}");
        }

        private string GenerateJwtToken(ResearchUser user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var claims = new[]
            {
                new Claim("user_id", user.UserId.Trim()),
                new Claim("first_name", user.FirstName?.Trim() ?? ""),
                new Claim("last_name", user.LastName?.Trim() ?? ""),
                new Claim("system_authorization", user.SystemAuthorization?.Trim() ?? ""),
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
