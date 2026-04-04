namespace RupResearchAPI.DTOs
{
    public class HourReportDto
    {
        public int HourReportId { get; set; }
        public string? UserId { get; set; }
        public int? ProjectId { get; set; }
        public string? ReportDate { get; set; }   // "yyyy-MM-dd"
        public string? FromHour { get; set; }      // "HH:mm:ss"
        public string? ToHour { get; set; }        // "HH:mm:ss"
        public decimal? WorkedHours { get; set; }
        public string? Comments { get; set; }
    }

    public class CreateHourReportDto
    {
        public string? UserId { get; set; }
        public int? ProjectId { get; set; }
        public string? ReportDate { get; set; }   // "yyyy-MM-dd"
        public string? FromHour { get; set; }      // "HH:mm" or "HH:mm:ss"
        public string? ToHour { get; set; }        // "HH:mm" or "HH:mm:ss"
        public decimal? WorkedHours { get; set; }
        public string? Comments { get; set; }
    }

    public class MonthlyApprovalDto
    {
        public int MonthlyApprovalId { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectNameHe { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? ApprovalStatus { get; set; }
        public string? ApprovedByUserId { get; set; }
        public string? ApprovalDate { get; set; }  // "yyyy-MM-dd"
        public decimal? TotalWorkedHours { get; set; }
        public string? Comments { get; set; }
    }

    public class SubmitMonthlyApprovalDto
    {
        public string? UserId { get; set; }
        public int? ProjectId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal? TotalWorkedHours { get; set; }
        public string? Comments { get; set; }
    }

    public class AssistantProjectDto
    {
        public int ProjectId { get; set; }
        public string? ProjectNameHe { get; set; }
        public string? ProjectNameEn { get; set; }
    }

    public class DecideMonthlyApprovalDto
    {
        public string ApprovalStatus { get; set; } = string.Empty; // "אושר" / "נדחה"
        public string? ApprovedByUserId { get; set; }
        public string? Comments { get; set; }
    }
}
