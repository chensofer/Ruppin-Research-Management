using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
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
    }
}
