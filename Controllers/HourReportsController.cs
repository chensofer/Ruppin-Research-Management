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
        private readonly IAuditLogService _audit;

        public HourReportsController(IHourReportService svc, IAuditLogService audit)
        {
            _svc = svc;
            _audit = audit;
        }

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
            if (dto.ProjectId.HasValue && !string.IsNullOrEmpty(dto.UserId))
            {
                var monthStr = $"{dto.Month:D2}/{dto.Year}";
                await _audit.LogAsync(dto.ProjectId.Value, dto.UserId, "hour_report_submitted",
                    $"הגשת דוח שעות חודשי לאישור: {monthStr} | שעות: {dto.TotalWorkedHours?.ToString("F1") ?? "?"}",
                    "hour_report", result?.MonthlyApprovalId.ToString());
            }
            return Ok(result);
        }

        // PUT /api/hour-reports/monthly/{id}/decision
        [HttpPut("monthly/{id}/decision")]
        public async Task<IActionResult> Decide(int id, [FromBody] DecideMonthlyApprovalDto dto)
        {
            try
            {
                var result = await _svc.DecideMonthly(id, dto);
                if (result == null) return NotFound();

                if (result.ProjectId.HasValue)
                {
                    var actorId = dto.ApprovedByUserId ?? User.FindFirst("user_id")?.Value ?? string.Empty;
                    var monthStr = $"{result.Month:D2}/{result.Year}";
                    var (actionType, description) = dto.ApprovalStatus == "אושר"
                        ? ("hour_report_approved", $"אישור דוח שעות חודשי: {result.UserName ?? result.UserId} | {monthStr} | {result.TotalWorkedHours?.ToString("F1")} שעות")
                        : ("hour_report_rejected", $"דחיית דוח שעות חודשי: {result.UserName ?? result.UserId} | {monthStr}");

                    await _audit.LogAsync(result.ProjectId.Value, actorId, actionType, description,
                        "hour_report", id.ToString());
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

        // GET /api/hour-reports/my-submissions?userId=
        [HttpGet("my-submissions")]
        public async Task<IActionResult> GetMySubmissions([FromQuery] string userId)
        {
            var list = await _svc.GetAllSubmissionsForUser(userId);
            return Ok(list);
        }
    }
}
