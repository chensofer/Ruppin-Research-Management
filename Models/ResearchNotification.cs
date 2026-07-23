using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_notifications")]
    public class ResearchNotification
    {
        [Key]
        [Column("notification_id")]
        public int NotificationId { get; set; }

        [Column("recipient_user_id")]
        [StringLength(20)]
        public string RecipientUserId { get; set; } = null!;

        [Column("sender_name")]
        [StringLength(200)]
        public string? SenderName { get; set; }

        [Column("message")]
        [StringLength(500)]
        public string Message { get; set; } = null!;

        [Column("notification_type")]
        [StringLength(50)]
        public string? NotificationType { get; set; }

        [Column("data")]
        public string? Data { get; set; }

        [Column("is_read")]
        public bool IsRead { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
