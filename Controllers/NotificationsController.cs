using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.Models;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public NotificationsController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/notifications — התראות שלא נקראו עבור המשתמש המחובר
        [HttpGet]
        public async Task<IActionResult> GetMine()
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var items = await _db.ResearchNotifications
                .Where(n => n.RecipientUserId == userId && !n.IsRead)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new {
                    n.NotificationId,
                    n.SenderName,
                    n.Message,
                    n.NotificationType,
                    n.Data,
                    n.CreatedAt,
                })
                .ToListAsync();

            return Ok(items);
        }

        // POST /api/notifications/{id}/read — סמן כנקרא
        [HttpPost("{id:int}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var n = await _db.ResearchNotifications
                .FirstOrDefaultAsync(x => x.NotificationId == id && x.RecipientUserId == userId);
            if (n == null) return NotFound();
            n.IsRead = true;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/notifications/read-all — סמן הכל כנקרא
        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var userId = User.FindFirst("user_id")?.Value ?? string.Empty;
            var unread = await _db.ResearchNotifications
                .Where(n => n.RecipientUserId == userId && !n.IsRead)
                .ToListAsync();
            foreach (var n in unread) n.IsRead = true;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
