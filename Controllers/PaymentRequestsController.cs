using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.DTOs;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Authorize]
    public class PaymentRequestsController : ControllerBase
    {
        private readonly IPaymentRequestService _service;

        public PaymentRequestsController(IPaymentRequestService service)
        {
            _service = service;
        }

        [HttpGet("api/projects/{projectId}/payment-requests")]
        public async Task<IActionResult> GetByProject(int projectId)
        {
            var results = await _service.GetByProject(projectId);
            return Ok(results);
        }

        [HttpPost("api/projects/{projectId}/payment-requests")]
        public async Task<IActionResult> Create(int projectId, [FromBody] CreatePaymentRequestDto dto)
        {
            var created = await _service.Create(projectId, dto);
            return Ok(created);
        }

        [HttpPut("api/payment-requests/{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePaymentRequestStatusDto dto)
        {
            var updated = await _service.UpdateStatus(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }
    }
}
