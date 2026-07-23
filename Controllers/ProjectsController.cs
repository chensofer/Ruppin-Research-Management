using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using RupResearchAPI.Data;
using RupResearchAPI.DTOs;
using RupResearchAPI.Models;
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
        private readonly IAuditLogService _audit;
        private readonly IMemoryCache _cache;
        private readonly IUserService _userService;
        private readonly AppDbContext _db;

        public ProjectsController(IProjectService projectService, IWebHostEnvironment env, IAuditLogService audit, IMemoryCache cache, IUserService userService, AppDbContext db)
        {
            _projectService = projectService;
            _env = env;
            _audit = audit;
            _cache = cache;
            _userService = userService;
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var projects = await _projectService.GetAll(userId);
            return Ok(projects);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var project = await _projectService.GetById(id);
            if (project == null) return NotFound();
            return Ok(project);
        }

        // GET /api/projects/{id}/detail — rich DTO with PI name, center, team, assistants, budget stats
        [HttpGet("{id:int}/detail")]
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
            await _audit.LogAsync(created.ProjectId, userId, "project_created",
                $"יצירת מחקר חדש: {dto.ProjectNameHe}", "project", created.ProjectId.ToString());
            return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectDto dto)
        {
            var errs = ValidateProjectFields(
                dto.ProjectNameHe, dto.ProjectDescription, dto.PrincipalResearcherId,
                dto.CenterId, dto.FundingSource, dto.StartDate, dto.EndDate, dto.TotalBudget);
            if (errs.Count > 0)
                return BadRequest(new { message = string.Join(" | ", errs) });

            var updated = await _projectService.Update(id, dto);
            if (updated == null) return NotFound();

            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "project_updated",
                $"עדכון נתוני מחקר: {dto.ProjectNameHe}", "project", id.ToString());
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

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _projectService.Archive(id);
                if (!deleted) return NotFound();
                var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
                await _audit.LogAsync(id, userId, "project_archived", "ארכוב מחקר", "project", id.ToString());
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = $"שגיאת מסד נתונים: {inner}" });
            }
        }

        [HttpPost("{id:int}/archive")]
        public async Task<IActionResult> Archive(int id)
        {
            try
            {
                var archived = await _projectService.Archive(id);
                if (!archived) return NotFound();
                var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
                await _audit.LogAsync(id, userId, "project_archived", "ארכוב מחקר", "project", id.ToString());
                return NoContent();
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = $"שגיאה בארכיון: {inner}" });
            }
        }

        [HttpPost("{id:int}/restore")]
        public async Task<IActionResult> Restore(int id)
        {
            var restored = await _projectService.Restore(id);
            if (!restored) return NotFound();
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "project_restored", "שחזור מחקר מארכיון", "project", id.ToString());
            return NoContent();
        }

        [HttpGet("archived")]
        public async Task<IActionResult> GetArchived()
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var projects = await _projectService.GetArchived(userId);
            return Ok(projects);
        }

        // GET /api/projects/{id}/budget-categories
        [HttpGet("{id:int}/budget-categories")]
        public async Task<IActionResult> GetBudgetCategories(int id)
        {
            var categories = await _projectService.GetBudgetCategories(id);
            return Ok(categories);
        }

        // PUT /api/projects/{id}/budget-categories — replace all budget categories
        [HttpPut("{id:int}/budget-categories")]
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
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "budget_categories_updated",
                $"עדכון קטגוריות תקציב ({req.Categories.Count} קטגוריות)", "budget", id.ToString());
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
                await _audit.LogAsync(created.ProjectId, userId, "project_created",
                    $"יצירת מחקר חדש: {dto.ProjectNameHe}", "project", created.ProjectId.ToString());
                return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // POST /api/projects/{id}/files — upload a single file for a project
        [HttpPost("{id:int}/files")]
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

            var fileType = Path.GetExtension(safeFileName).ToLowerInvariant();

            var record = await _projectService.SaveFileRecord(
                id, safeFileName, relativePath, fileType, folderName, userId);

            await _audit.LogAsync(id, userId ?? string.Empty, "file_uploaded",
                $"העלאת קובץ: {safeFileName}", "file", record?.FileId.ToString());
            return Ok(record);
        }

        // GET /api/projects/{id}/files
        [HttpGet("{id:int}/files")]
        public async Task<IActionResult> GetFiles(int id)
        {
            var files = await _projectService.GetFiles(id);
            return Ok(files);
        }

        // DELETE /api/projects/{id}/files/{fileId}
        [HttpDelete("{id:int}/files/{fileId}")]
        public async Task<IActionResult> DeleteFile(int id, int fileId)
        {
            var deleted = await _projectService.DeleteFile(fileId);
            if (!deleted) return NotFound();
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "file_deleted", "מחיקת קובץ", "file", fileId.ToString());
            return NoContent();
        }

        // ── Folder endpoints ─────────────────────────────────────────────────

        // GET /api/projects/{id}/folders
        [HttpGet("{id:int}/folders")]
        public async Task<IActionResult> GetFolders(int id)
        {
            var folders = await _projectService.GetFolders(id);
            return Ok(folders);
        }

        // POST /api/projects/{id}/folders
        [HttpPost("{id:int}/folders")]
        public async Task<IActionResult> CreateFolder(int id, [FromBody] CreateFolderRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.FolderName))
                return BadRequest(new { message = "שם תיקייה לא יכול להיות ריק" });
            var folder = await _projectService.CreateFolder(id, req.FolderName.Trim());
            return Ok(folder);
        }

        // ── Team endpoints ────────────────────────────────────────────────────

        // GET /api/projects/{id}/team
        [HttpGet("{id:int}/team")]
        public async Task<IActionResult> GetTeam(int id)
        {
            var team = await _projectService.GetTeam(id);
            return Ok(team);
        }

        // POST /api/projects/{id}/team
        [HttpPost("{id:int}/team")]
        public async Task<IActionResult> AddTeamMember(int id, [FromBody] AddTeamMemberRequest req)
        {
            try
            {
                var member = await _projectService.AddTeamMember(id, req.UserId, req.ProjectRole);
                if (member == null)
                    return Conflict(new { message = "המשתמש כבר חבר בצוות" });
                var actorId = User.FindFirst("user_id")?.Value ?? string.Empty;
                await _audit.LogAsync(id, actorId, "team_member_added",
                    $"הוספת חבר צוות: {req.UserId} בתפקיד {req.ProjectRole}", "team_member", req.UserId);
                return Ok(member);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE /api/projects/{id}/team/{userId}
        [HttpDelete("{id:int}/team/{userId}")]
        public async Task<IActionResult> RemoveTeamMember(int id, string userId)
        {
            var removed = await _projectService.RemoveTeamMember(id, userId);
            if (!removed) return NotFound();
            var actorId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, actorId, "team_member_removed",
                $"הסרת חבר צוות: {userId}", "team_member", userId);
            return NoContent();
        }

        // ── Assistant endpoints ───────────────────────────────────────────────

        // GET /api/projects/{id}/assistants
        [HttpGet("{id:int}/assistants")]
        public async Task<IActionResult> GetAssistants(int id)
        {
            var assistants = await _projectService.GetAssistants(id);
            return Ok(assistants);
        }

        // POST /api/projects/{id}/assistants
        [HttpPost("{id:int}/assistants")]
        public async Task<IActionResult> AddAssistant(int id, [FromBody] AddAssistantRequest req)
        {
            var assistant = await _projectService.AddAssistant(id, req.AssistantUserId, req.Role, req.SalaryPerHour);
            if (assistant == null)
                return Conflict(new { message = "העוזר כבר מוגדר במחקר" });
            var actorId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, actorId, "assistant_added",
                $"הוספת עוזר מחקר: {req.AssistantUserId}", "assistant", req.AssistantUserId);
            return Ok(assistant);
        }

        // DELETE /api/projects/{id}/assistants/{userId}
        [HttpDelete("{id:int}/assistants/{userId}")]
        public async Task<IActionResult> RemoveAssistant(int id, string userId)
        {
            var removed = await _projectService.RemoveAssistant(id, userId);
            if (!removed) return NotFound();
            var actorId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, actorId, "assistant_removed",
                $"הסרת עוזר מחקר: {userId}", "assistant", userId);
            return NoContent();
        }

        // POST /api/projects/{id}/assistants/new — create new RA user + assign to project
        [HttpPost("{id:int}/assistants/new")]
        public async Task<IActionResult> CreateAndAddAssistant(int id, [FromBody] CreateAndAddAssistantRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.FirstName) ||
                string.IsNullOrWhiteSpace(req.LastName) || string.IsNullOrWhiteSpace(req.Email) ||
                req.SalaryPerHour <= 0)
                return BadRequest(new { message = "כל השדות הם חובה ושכר לשעה חייב להיות גדול מאפס" });

            try
            {
                var result = await _projectService.CreateAndAddAssistant(id, req);
                var actorId = User.FindFirst("user_id")?.Value ?? string.Empty;
                await _audit.LogAsync(id, actorId, "assistant_created",
                    $"יצירה והוספת עוזר מחקר חדש: {req.FirstName} {req.LastName} ({req.UserId})",
                    "assistant", req.UserId);
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
        [HttpPut("{id:int}/assistants/{userId}")]
        public async Task<IActionResult> UpdateAssistant(int id, string userId, [FromBody] UpdateAssistantRequest req)
        {
            if (req.SalaryPerHour.HasValue && req.SalaryPerHour.Value <= 0)
                return BadRequest(new { message = "שכר לשעה חייב להיות גדול מאפס" });

            var result = await _projectService.UpdateAssistant(id, userId, req);
            if (result == null) return NotFound();
            var actorId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, actorId, "assistant_updated",
                $"עדכון פרטי עוזר מחקר: {userId}", "assistant", userId);
            return Ok(result);
        }

        // GET /api/projects/{id}/assistants/{userId}/tracking
        [HttpGet("{id:int}/assistants/{userId}/tracking")]
        public async Task<IActionResult> GetAssistantTracking(int id, string userId)
        {
            var result = await _projectService.GetAssistantTracking(id, userId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // GET /api/projects/all — all projects (used for transfer-budget target dropdown)
        [HttpGet("all")]
        public async Task<IActionResult> GetAllProjects()
        {
            var projects = await _projectService.GetAllProjects();
            return Ok(projects);
        }

        // GET /api/projects/ml-insights — תוצרי הרכיב החכם (Python):
        // ציון סיכון תקציבי לפי פרויקט (Classification) ושיוך לקבוצת
        // "פרופיל הוצאות" (Clustering). מורץ דרך ml_component/ml_insights.py
        // ומוטמן ל-10 דקות כדי לא להריץ אימון מודלים בכל בקשה.
        [HttpGet("ml-insights")]
        public async Task<IActionResult> GetMlInsights()
        {
            const string cacheKey = "ml-insights";
            if (_cache.TryGetValue(cacheKey, out string? cachedJson) && cachedJson != null)
                return Content(cachedJson, "application/json");

            var scriptDir = Path.Combine(_env.ContentRootPath, "ml_component");
            var psi = new ProcessStartInfo
            {
                FileName = "py",
                Arguments = "ml_insights.py",
                WorkingDirectory = scriptDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                StandardOutputEncoding = System.Text.Encoding.UTF8,
                StandardErrorEncoding = System.Text.Encoding.UTF8,
            };
            psi.EnvironmentVariables["PYTHONUTF8"] = "1";

            using var process = Process.Start(psi);
            if (process == null)
                return StatusCode(500, new { message = "לא ניתן להריץ את הרכיב החכם (Python)" });

            var stdout = await process.StandardOutput.ReadToEndAsync();
            var stderr = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0 || string.IsNullOrWhiteSpace(stdout))
                return StatusCode(500, new { message = "שגיאה בהרצת הרכיב החכם", details = stderr });

            var json = stdout.Trim();
            _cache.Set(cacheKey, json, TimeSpan.FromMinutes(10));
            return Content(json, "application/json");
        }

        // POST /api/projects/{sourceId}/transfer-budget
        [HttpPost("{sourceId:int}/transfer-budget")]
        public async Task<IActionResult> TransferBudget(int sourceId, [FromBody] TransferBudgetRequest req)
        {
            if (req == null || req.Amount <= 0)
                return BadRequest(new { message = "סכום ההעברה חייב להיות גדול מאפס" });

            try
            {
                var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
                await _projectService.TransferBudget(sourceId, req.TargetProjectId, req.Amount, userId);

                var amountStr = req.Amount.ToString("N0");
                await _audit.LogAsync(sourceId, userId, "budget_transferred",
                    $"העברת תקציב של ₪{amountStr} למחקר #{req.TargetProjectId}", "budget", req.TargetProjectId.ToString());
                await _audit.LogAsync(req.TargetProjectId, userId, "budget_transferred",
                    $"קבלת תקציב של ₪{amountStr} ממחקר #{sourceId}", "budget", sourceId.ToString());

                return Ok(new { message = "ההעברה בוצעה בהצלחה" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = $"שגיאת שרת: {detail}" });
            }
        }

        // ── Future commitments endpoints ──────────────────────────────────────

        // GET /api/projects/{id}/commitments
        [HttpGet("{id:int}/commitments")]
        public async Task<IActionResult> GetCommitments(int id)
        {
            var commitments = await _projectService.GetCommitments(id);
            return Ok(commitments);
        }

        // POST /api/projects/{id}/commitments
        [HttpPost("{id:int}/commitments")]
        public async Task<IActionResult> AddCommitment(int id, [FromBody] CreateFutureCommitmentRequest req)
        {
            var commitment = await _projectService.AddCommitment(id, req);
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "commitment_added",
                $"הוספת התחייבות עתידית: {req.CommitmentDescription ?? "ללא תיאור"} | סכום: ₪{req.ExpectedAmount?.ToString("N0") ?? "לא צוין"}",
                "commitment", commitment?.CommitmentId.ToString());
            return Ok(commitment);
        }

        // PUT /api/projects/{id}/commitments/{commitmentId}
        [HttpPut("{id:int}/commitments/{commitmentId}")]
        public async Task<IActionResult> UpdateCommitment(int id, int commitmentId, [FromBody] CreateFutureCommitmentRequest req)
        {
            var updated = await _projectService.UpdateCommitment(commitmentId, req);
            if (updated == null) return NotFound();
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "commitment_updated",
                $"עדכון התחייבות עתידית: {req.CommitmentDescription ?? "ללא תיאור"}",
                "commitment", commitmentId.ToString());
            return Ok(updated);
        }

        // DELETE /api/projects/{id}/commitments/{commitmentId}
        [HttpDelete("{id:int}/commitments/{commitmentId}")]
        public async Task<IActionResult> DeleteCommitment(int id, int commitmentId)
        {
            var deleted = await _projectService.DeleteCommitment(commitmentId);
            if (!deleted) return NotFound();
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            await _audit.LogAsync(id, userId, "commitment_deleted",
                "מחיקת התחייבות עתידית", "commitment", commitmentId.ToString());
            return NoContent();
        }

        // POST /api/projects/{id}/commitments/{commitmentId}/files
        [HttpPost("{id:int}/commitments/{commitmentId}/files")]
        public async Task<IActionResult> UploadCommitmentFile(int id, int commitmentId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "קובץ לא תקין" });

            var uploadsRoot = Path.Combine(
                _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                "uploads");

            var result = await _projectService.AppendCommitmentFile(commitmentId, file, uploadsRoot);
            if (result == null) return NotFound();
            return Ok(new { filePath = result });
        }

        // POST /api/projects/budget-transfer-request
        // שליחת בקשת העברת תקציב בדוא"ל לחוקר הראשי של מחקר המקור
        [HttpPost("budget-transfer-request")]
        public async Task<IActionResult> RequestBudgetTransfer([FromBody] BudgetTransferRequestDto dto)
        {
            if (dto == null || dto.Amount <= 0)
                return BadRequest(new { message = "סכום ההעברה חייב להיות גדול מאפס" });

            var giverProject = await _projectService.GetById(dto.GiverProjectId);
            if (giverProject == null)
                return NotFound(new { message = "מחקר המקור לא נמצא" });

            var receiverProject = await _projectService.GetById(dto.ReceiverProjectId);
            if (receiverProject == null)
                return NotFound(new { message = "מחקר היעד לא נמצא" });

            if (string.IsNullOrEmpty(giverProject.PrincipalResearcherId))
                return BadRequest(new { message = "לא הוגדר חוקר ראשי למחקר המקור" });

            var giverPI = await _userService.GetByIdAsync(giverProject.PrincipalResearcherId);
            if (giverPI == null)
                return BadRequest(new { message = "לא נמצא החוקר הראשי של מחקר המקור" });

            var requesterId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var requester = await _userService.GetByIdAsync(requesterId);
            var requesterName = requester != null
                ? $"{requester.FirstName} {requester.LastName}".Trim()
                : "משתמש במערכת";

            var giverProjectName    = giverProject.ProjectNameHe    ?? giverProject.ProjectNameEn    ?? $"מחקר #{dto.GiverProjectId}";
            var receiverProjectName = receiverProject.ProjectNameHe ?? receiverProject.ProjectNameEn ?? $"מחקר #{dto.ReceiverProjectId}";

            var notification = new ResearchNotification
            {
                RecipientUserId  = giverProject.PrincipalResearcherId!,
                SenderName       = requesterName,
                Message          = $"{requesterName} מבקש/ת להעביר ₪{dto.Amount:N0} ממחקרך \"{giverProjectName}\" למחקר \"{receiverProjectName}\". יש לפנות למזכירות לביצוע ההעברה.",
                NotificationType = "budget_transfer_request",
                Data             = System.Text.Json.JsonSerializer.Serialize(new {
                    giverProjectId    = dto.GiverProjectId,
                    receiverProjectId = dto.ReceiverProjectId,
                    giverProjectName,
                    receiverProjectName,
                    amount            = dto.Amount,
                    requesterName,
                }),
                IsRead    = false,
                CreatedAt = DateTime.UtcNow,
            };
            _db.ResearchNotifications.Add(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "הבקשה נשלחה בהצלחה לחוקר הראשי של מחקר המקור" });
        }

    }

    public record CreateFolderRequest(string FolderName);
}
