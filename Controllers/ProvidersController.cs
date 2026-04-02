using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.DTOs;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/providers")]
    [Authorize]
    public class ProvidersController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProvidersController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var providers = await _projectService.GetProviders();
            return Ok(providers);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProviderRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.ProviderName))
                return BadRequest(new { message = "שם הספק הוא שדה חובה" });

            var provider = await _projectService.CreateProvider(req);
            return Ok(provider);
        }
    }
}
