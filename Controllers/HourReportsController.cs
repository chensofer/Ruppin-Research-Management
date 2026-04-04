using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.DTOs;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/hour-reports")]
    [Authorize]
    public class HourReportsController : ControllerBase
    {
        private readonly IHourReportService _svc;
        public HourReportsController(IHourReportService svc) => _svc = svc;

        // GET /api/hour-reports?userId=&projectId=&month=&year=
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string userId, [FromQuery] int projectId, [FromQuery] int month, [FromQuery] int year)
        {
            var list = await _svc.GetReports(userId, projectId, month, year);
            return Ok(list);
        }

        // POST /api/hour-reports
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateHourReportDto dto)
        {
            var result = await _svc.CreateReport(dto);
            return Ok(result);
        }

        // DELETE /api/hour-reports/{id}?userId=
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] string userId)
        {
            var ok = await _svc.DeleteReport(id, userId);
            if (!ok) return NotFound();
            return NoContent();
        }

        // GET /api/hour-reports/monthly?userId=&projectId=&month=&year=
        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthly([FromQuery] string userId, [FromQuery] int projectId, [FromQuery] int month, [FromQuery] int year)
        {
            var result = await _svc.GetMonthlyApproval(userId, projectId, month, year);
            return Ok(result);
        }

        // POST /api/hour-reports/monthly
        [HttpPost("monthly")]
        public async Task<IActionResult> SubmitMonthly([FromBody] SubmitMonthlyApprovalDto dto)
        {
            var result = await _svc.SubmitMonthly(dto);
            return Ok(result);
        }

        // PUT /api/hour-reports/monthly/{id}/decision
        [HttpPut("monthly/{id}/decision")]
        public async Task<IActionResult> Decide(int id, [FromBody] DecideMonthlyApprovalDto dto)
        {
            var result = await _svc.DecideMonthly(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // GET /api/hour-reports/monthly/pending?researcherId=
        [HttpGet("monthly/pending")]
        public async Task<IActionResult> GetPending([FromQuery] string researcherId)
        {
            var list = await _svc.GetPendingForResearcher(researcherId);
            return Ok(list);
        }

        // GET /api/hour-reports/my-projects?userId=
        [HttpGet("my-projects")]
        public async Task<IActionResult> GetMyProjects([FromQuery] string userId)
        {
            var list = await _svc.GetProjectsForAssistant(userId);
            return Ok(list);
        }
    }
}
