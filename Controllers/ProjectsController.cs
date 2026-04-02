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

        // GET /api/projects/{id}/detail — rich DTO with PI name, center, team, assistants, budget stats
        [HttpGet("{id}/detail")]
        public async Task<IActionResult> GetDetail(int id)
        {
            var detail = await _projectService.GetDetail(id);
            if (detail == null) return NotFound();
            return Ok(detail);
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

        // GET /api/projects/{id}/files
        [HttpGet("{id}/files")]
        public async Task<IActionResult> GetFiles(int id)
        {
            var files = await _projectService.GetFiles(id);
            return Ok(files);
        }

        // DELETE /api/projects/{id}/files/{fileId}
        [HttpDelete("{id}/files/{fileId}")]
        public async Task<IActionResult> DeleteFile(int id, int fileId)
        {
            var deleted = await _projectService.DeleteFile(fileId);
            if (!deleted) return NotFound();
            return NoContent();
        }

        // ── Team endpoints ────────────────────────────────────────────────────

        // GET /api/projects/{id}/team
        [HttpGet("{id}/team")]
        public async Task<IActionResult> GetTeam(int id)
        {
            var team = await _projectService.GetTeam(id);
            return Ok(team);
        }

        // POST /api/projects/{id}/team
        [HttpPost("{id}/team")]
        public async Task<IActionResult> AddTeamMember(int id, [FromBody] AddTeamMemberRequest req)
        {
            var member = await _projectService.AddTeamMember(id, req.UserId, req.ProjectRole);
            if (member == null)
                return Conflict(new { message = "המשתמש כבר חבר בצוות" });
            return Ok(member);
        }

        // DELETE /api/projects/{id}/team/{userId}
        [HttpDelete("{id}/team/{userId}")]
        public async Task<IActionResult> RemoveTeamMember(int id, string userId)
        {
            var removed = await _projectService.RemoveTeamMember(id, userId);
            if (!removed) return NotFound();
            return NoContent();
        }

        // ── Assistant endpoints ───────────────────────────────────────────────

        // GET /api/projects/{id}/assistants
        [HttpGet("{id}/assistants")]
        public async Task<IActionResult> GetAssistants(int id)
        {
            var assistants = await _projectService.GetAssistants(id);
            return Ok(assistants);
        }

        // POST /api/projects/{id}/assistants
        [HttpPost("{id}/assistants")]
        public async Task<IActionResult> AddAssistant(int id, [FromBody] AddAssistantRequest req)
        {
            var assistant = await _projectService.AddAssistant(id, req.AssistantUserId, req.Role, req.SalaryPerHour);
            if (assistant == null)
                return Conflict(new { message = "העוזר כבר מוגדר במחקר" });
            return Ok(assistant);
        }

        // DELETE /api/projects/{id}/assistants/{userId}
        [HttpDelete("{id}/assistants/{userId}")]
        public async Task<IActionResult> RemoveAssistant(int id, string userId)
        {
            var removed = await _projectService.RemoveAssistant(id, userId);
            if (!removed) return NotFound();
            return NoContent();
        }

        // ── Future commitments endpoints ──────────────────────────────────────

        // GET /api/projects/{id}/commitments
        [HttpGet("{id}/commitments")]
        public async Task<IActionResult> GetCommitments(int id)
        {
            var commitments = await _projectService.GetCommitments(id);
            return Ok(commitments);
        }

        // POST /api/projects/{id}/commitments
        [HttpPost("{id}/commitments")]
        public async Task<IActionResult> AddCommitment(int id, [FromBody] CreateFutureCommitmentRequest req)
        {
            var commitment = await _projectService.AddCommitment(id, req);
            return Ok(commitment);
        }

        // DELETE /api/projects/{id}/commitments/{commitmentId}
        [HttpDelete("{id}/commitments/{commitmentId}")]
        public async Task<IActionResult> DeleteCommitment(int id, int commitmentId)
        {
            var deleted = await _projectService.DeleteCommitment(commitmentId);
            if (!deleted) return NotFound();
            return NoContent();
        }

    }
}
