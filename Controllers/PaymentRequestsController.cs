using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.DTOs;
using RupResearchAPI.Services;
using Microsoft.AspNetCore.Hosting;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Authorize]
    public class PaymentRequestsController : ControllerBase
    {
        private readonly IPaymentRequestService _service;
        private readonly IWebHostEnvironment _env;
        private readonly IAuditLogService _audit;

        public PaymentRequestsController(IPaymentRequestService service, IWebHostEnvironment env, IAuditLogService audit)
        {
            _service = service;
            _env = env;
            _audit = audit;
        }

        [HttpGet("api/projects/{projectId}/payment-requests")]
        public async Task<IActionResult> GetByProject(int projectId)
        {
            var results = await _service.GetByProject(projectId);
            return Ok(results);
        }

        [HttpGet("api/payment-requests/pending")]
        public async Task<IActionResult> GetPending()
        {
            var userId = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            var results = await _service.GetPendingForUser(userId);
            return Ok(results);
        }

        [HttpPost("api/projects/{projectId}/payment-requests")]
        public async Task<IActionResult> Create(int projectId, [FromBody] CreatePaymentRequestDto dto)
        {
            // Attach the logged-in user's ID from JWT so the email shows the correct submitter
            dto.RequestedByUserId = User.FindFirst("user_id")?.Value ?? dto.RequestedByUserId;
            try
            {
                var created = await _service.Create(projectId, dto);
                var actorId = dto.RequestedByUserId ?? User.FindFirst("user_id")?.Value ?? string.Empty;
                var amount = dto.RequestedAmount?.ToString("N0") ?? "לא צוין";
                await _audit.LogAsync(projectId, actorId, "payment_request_created",
                    $"יצירת בקשת תשלום: {dto.RequestTitle ?? "ללא כותרת"} | סכום: ₪{amount}",
                    "payment", created.PaymentRequestId.ToString());
                return Ok(created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("api/payment-requests/{id}/notify")]
        public async Task<IActionResult> Notify(int id)
        {
            var userId = User.FindFirst("user_id")?.Value ?? "";
            await _service.NotifySecretariat(id, userId);
            return Ok();
        }

        [HttpPut("api/payment-requests/{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePaymentRequestStatusDto dto)
        {
            var updated = await _service.UpdateStatus(id, dto);
            if (updated == null) return NotFound();

            if (updated.ProjectId.HasValue)
            {
                var actorId = dto.ApprovedByUserId ?? User.FindFirst("user_id")?.Value ?? string.Empty;
                var (actionType, description) = dto.Status switch
                {
                    "אושר"  => ("payment_approved",  $"אישור בקשת תשלום: {updated.RequestTitle ?? "ללא כותרת"} | סכום: ₪{updated.RequestedAmount?.ToString("N0")}"),
                    "נדחה"  => ("payment_rejected",  $"דחיית בקשת תשלום: {updated.RequestTitle ?? "ללא כותרת"} | סיבה: {dto.RejectionReason ?? "לא צוינה"}"),
                    "שולם"  => ("payment_paid",      $"סימון תשלום כשולם: {updated.RequestTitle ?? "ללא כותרת"}"),
                    _       => ("payment_status_updated", $"עדכון סטטוס בקשת תשלום: {dto.Status}"),
                };
                await _audit.LogAsync(updated.ProjectId.Value, actorId, actionType, description,
                    "payment", id.ToString());
            }
            return Ok(updated);
        }

        [HttpPost("api/payment-requests/{id}/files")]
        public async Task<IActionResult> UploadFile(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "קובץ לא תקין" });

            var uploadsRoot = Path.Combine(
                _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                "uploads");

            var result = await _service.AppendQuotationFile(id, file, uploadsRoot);
            if (result == null) return NotFound();
            return Ok(new { quotationFilePath = result });
        }
    }
}
