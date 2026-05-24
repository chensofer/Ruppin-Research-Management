using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/audit-logs")]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _audit;

        public AuditLogsController(IAuditLogService audit)
        {
            _audit = audit;
        }

        [HttpGet]
        public async Task<IActionResult> GetByProject(int projectId)
        {
            var logs = await _audit.GetByProjectAsync(projectId);
            return Ok(logs);
        }
    }
}
