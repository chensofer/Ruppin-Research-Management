using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _audit;

        public AuditLogsController(IAuditLogService audit)
        {
            _audit = audit;
        }

        [HttpGet("api/projects/{projectId:int}/audit-logs")]
        public async Task<IActionResult> GetByProject(int projectId)
        {
            var logs = await _audit.GetByProjectAsync(projectId);
            return Ok(logs);
        }

        [HttpGet("api/audit-logs/all")]
        public async Task<IActionResult> GetAll()
        {
            var role = User.FindFirst("system_authorization")?.Value;
            if (role != "מזכירות") return Forbid();
            var logs = await _audit.GetAllAsync();
            return Ok(logs);
        }
    }
}
