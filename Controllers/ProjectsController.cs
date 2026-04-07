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
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var projects = await _projectService.GetAll(userId);
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
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var created = await _projectService.Create(dto, userId);
            return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectDto dto)
        {
            var errs = ValidateProjectFields(
                dto.ProjectNameHe, dto.ProjectDescription, dto.PrincipalResearcherId,
                dto.CenterId, dto.FundingSource, dto.StartDate, dto.EndDate, dto.TotalBudget);
            if (errs.Count > 0)
                return BadRequest(new { message = string.Join(" | ", errs) });

            var updated = await _projectService.Update(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        private static List<string> ValidateProjectFields(
            string? nameHe, string? description, string? piId,
            short? centerId, string? fundingSource,
            DateOnly? startDate, DateOnly? endDate, decimal? budget)
        {
            var errors = new List<string>();
            if (string.IsNullOrWhiteSpace(nameHe))         errors.Add("שם המחקר הוא שדה חובה");
            if (string.IsNullOrWhiteSpace(piId))           errors.Add("יש לבחור חוקר ראשי");
            if (startDate == null)                         errors.Add("תאריך התחלה הוא שדה חובה");
            if (endDate == null)                           errors.Add("תאריך סיום הוא שדה חובה");
            if (budget == null || budget <= 0)             errors.Add("יש להזין תקציב תקין");
            if (startDate.HasValue && endDate.HasValue && endDate < startDate)
                errors.Add("תאריך הסיום חייב להיות אחרי תאריך ההתחלה");
            return errors;
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _projectService.Delete(id);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // GET /api/projects/{id}/budget-categories
        [HttpGet("{id}/budget-categories")]
        public async Task<IActionResult> GetBudgetCategories(int id)
        {
            var categories = await _projectService.GetBudgetCategories(id);
            return Ok(categories);
        }

        // PUT /api/projects/{id}/budget-categories — replace all budget categories
        [HttpPut("{id}/budget-categories")]
        public async Task<IActionResult> UpdateBudgetCategories(int id, [FromBody] UpdateBudgetCategoriesRequest req)
        {
            var project = await _projectService.GetById(id);
            if (project == null) return NotFound();

            if (project.TotalBudget.HasValue && req.Categories.Count > 0)
            {
                var total = req.Categories.Sum(c => c.AllocatedAmount ?? 0);
                if (total > project.TotalBudget.Value)
                    return BadRequest(new { message = "סך קטגוריות התקציב חורג מהתקציב המאושר" });
            }

            var result = await _projectService.ReplaceBudgetCategories(id, req.Categories);
            return Ok(result);
        }

        // POST /api/projects/full — create project with all related data in one transaction
        [HttpPost("full")]
        public async Task<IActionResult> CreateFull([FromBody] CreateFullProjectDto dto)
        {
            var errs = ValidateProjectFields(
                dto.ProjectNameHe, dto.ProjectDescription, dto.PrincipalResearcherId,
                dto.CenterId, dto.FundingSource, dto.StartDate, dto.EndDate, dto.TotalBudget);
            if (errs.Count > 0)
                return BadRequest(new { message = string.Join(" | ", errs) });

            // Validate that budget categories do not exceed total approved budget
            if (dto.TotalBudget.HasValue && dto.BudgetCategories.Count > 0)
            {
                var totalAllocated = dto.BudgetCategories.Sum(c => c.AllocatedAmount ?? 0);
                if (totalAllocated > dto.TotalBudget.Value)
                    return BadRequest(new { message = "סך קטגוריות התקציב חורג מהתקציב המאושר" });
            }

            try
            {
                var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
                var created = await _projectService.CreateFull(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
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
            try
            {
                var member = await _projectService.AddTeamMember(id, req.UserId, req.ProjectRole);
                if (member == null)
                    return Conflict(new { message = "המשתמש כבר חבר בצוות" });
                return Ok(member);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

        // POST /api/projects/{id}/assistants/new — create new RA user + assign to project
        [HttpPost("{id}/assistants/new")]
        public async Task<IActionResult> CreateAndAddAssistant(int id, [FromBody] CreateAndAddAssistantRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.FirstName) ||
                string.IsNullOrWhiteSpace(req.LastName) || string.IsNullOrWhiteSpace(req.Email) ||
                req.SalaryPerHour <= 0)
                return BadRequest(new { message = "כל השדות הם חובה ושכר לשעה חייב להיות גדול מאפס" });

            try
            {
                var result = await _projectService.CreateAndAddAssistant(id, req);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT /api/projects/{id}/assistants/{userId}
        [HttpPut("{id}/assistants/{userId}")]
        public async Task<IActionResult> UpdateAssistant(int id, string userId, [FromBody] UpdateAssistantRequest req)
        {
            if (req.SalaryPerHour.HasValue && req.SalaryPerHour.Value <= 0)
                return BadRequest(new { message = "שכר לשעה חייב להיות גדול מאפס" });

            var result = await _projectService.UpdateAssistant(id, userId, req);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // GET /api/projects/{id}/assistants/{userId}/tracking
        [HttpGet("{id}/assistants/{userId}/tracking")]
        public async Task<IActionResult> GetAssistantTracking(int id, string userId)
        {
            var result = await _projectService.GetAssistantTracking(id, userId);
            if (result == null) return NotFound();
            return Ok(result);
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
