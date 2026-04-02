using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RupResearchAPI.DTOs;
using RupResearchAPI.Services;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/projects")]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;
        private readonly IWebHostEnvironment _env;

        public ProjectsController(IProjectService projectService, IWebHostEnvironment env)
        {
            _projectService = projectService;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var projects = await _projectService.GetAll();
            return Ok(projects);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var project = await _projectService.GetById(id);
            if (project == null) return NotFound();
            return Ok(project);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
        {
            var created = await _projectService.Create(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectDto dto)
        {
            var updated = await _projectService.Update(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _projectService.Delete(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        // POST /api/projects/full — create project with all related data in one transaction
        [HttpPost("full")]
        public async Task<IActionResult> CreateFull([FromBody] CreateFullProjectDto dto)
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var created = await _projectService.CreateFull(dto, userId);
            return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
        }

        // POST /api/projects/{id}/files — upload a single file for a project
        [HttpPost("{id}/files")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile(int id, IFormFile file, [FromForm] string? folderName)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "לא נבחר קובץ" });

            var project = await _projectService.GetById(id);
            if (project == null) return NotFound();

            var uploadsRoot = Path.Combine(_env.WebRootPath ?? Directory.GetCurrentDirectory(), "uploads", id.ToString());
            Directory.CreateDirectory(uploadsRoot);

            // Prevent path traversal — use only the bare file name
            var safeFileName = Path.GetFileName(file.FileName);
            var dest = Path.Combine(uploadsRoot, safeFileName);

            await using (var stream = new FileStream(dest, FileMode.Create))
                await file.CopyToAsync(stream);

            var relativePath = $"/uploads/{id}/{safeFileName}";
            var userId = User.FindFirst("user_id")?.Value;

            var record = await _projectService.SaveFileRecord(
                id, safeFileName, relativePath, file.ContentType, folderName, userId);

            return Ok(record);
        }
    }
}
