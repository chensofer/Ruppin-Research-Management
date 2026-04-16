using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly AppDbContext _db;

        public UsersController(IUserService userService, AppDbContext db)
        {
            _userService = userService;
            _db = db;
        }

        // GET /api/users?role=Researcher,Research manager
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? role)
        {
            var users = await _userService.GetUsersAsync(role);
            return Ok(users);
        }

        // GET /api/users/roles — returns all role names from research_roles table
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _db.ResearchRoles
                .OrderBy(r => r.RoleName)
                .Select(r => r.RoleName)
                .ToListAsync();
            return Ok(roles);
        }

        // GET /api/users/me — returns the currently authenticated user's profile
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var user = await _userService.GetByIdAsync(userId);
            if (user == null) return NotFound();
            return Ok(user);
        }

        // PUT /api/users/me — update own profile (firstName, lastName, email)
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileDto dto)
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var updated = await _userService.UpdateProfileAsync(userId, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        // POST /api/users/me/change-password
        [HttpPost("me/change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { message = "יש למלא את כל שדות הסיסמה" });
            if (dto.NewPassword.Length < 6)
                return BadRequest(new { message = "סיסמה חדשה חייבת להכיל לפחות 6 תווים" });

            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            try
            {
                await _userService.ChangePasswordAsync(userId, dto);
                return Ok(new { message = "הסיסמה שונתה בהצלחה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // POST /api/users/assistant — create a research assistant user account (saved permanently)
        [HttpPost("assistant")]
        public async Task<IActionResult> CreateAssistantUser([FromBody] CreateAssistantUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.UserId) || string.IsNullOrWhiteSpace(dto.FirstName) ||
                string.IsNullOrWhiteSpace(dto.LastName) || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { message = "כל השדות הם חובה" });

            var trimmedId = dto.UserId.Trim();

            // If user already exists, return their info without error
            // Use FirstOrDefaultAsync with Trim() because the DB column is char(10) — padded with spaces
            var existing = await _db.ResearchUsers.FirstOrDefaultAsync(u => u.UserId.Trim() == trimmedId);
            if (existing != null)
            {
                if (existing.SystemAuthorization != "עוזר מחקר")
                    return Conflict(new { message = "משתמש עם ת.ז. זו כבר קיים במערכת עם הרשאה אחרת" });
                return Ok(new UserResponseDto
                {
                    UserId = existing.UserId.Trim(),
                    FirstName = existing.FirstName,
                    LastName = existing.LastName,
                    Email = existing.Email,
                    SystemAuthorization = existing.SystemAuthorization,
                });
            }

            var user = new RupResearchAPI.Models.ResearchUser
            {
                UserId = trimmedId,
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email.Trim(),
                SystemAuthorization = "עוזר מחקר",
                Password = BCrypt.Net.BCrypt.HashPassword("Temp1234!"),
            };
            _db.ResearchUsers.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new UserResponseDto
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                SystemAuthorization = user.SystemAuthorization,
            });
        }
    }
}
