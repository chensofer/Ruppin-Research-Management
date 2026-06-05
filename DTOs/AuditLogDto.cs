namespace RupResearchAPI.DTOs
{
    public class AuditLogResponseDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string PerformedByUserId { get; set; } = null!;
        public string? PerformedByName { get; set; }
        public string ActionType { get; set; } = null!;
        public string ActionDescription { get; set; } = null!;
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ProjectNameHe { get; set; }
        public string? ProjectNameEn { get; set; }
    }
}
