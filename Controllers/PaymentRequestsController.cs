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

        public PaymentRequestsController(IPaymentRequestService service, IWebHostEnvironment env)
        {
            _service = service;
            _env = env;
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
            try
            {
                var created = await _service.Create(projectId, dto);
                return Ok(created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("api/payment-requests/{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePaymentRequestStatusDto dto)
        {
            var updated = await _service.UpdateStatus(id, dto);
            if (updated == null) return NotFound();
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
