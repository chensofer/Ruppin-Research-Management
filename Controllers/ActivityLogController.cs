using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/activity-log")]
    [Authorize]
    public class ActivityLogController : ControllerBase
    {
        private readonly IActivityLogService _log;

        public ActivityLogController(IActivityLogService log)
        {
            _log = log;
        }

        [HttpGet]
        public async Task<IActionResult> Get(int projectId)
        {
            var logs = await _log.GetByProjectAsync(projectId);
            return Ok(logs);
        }
    }
}
