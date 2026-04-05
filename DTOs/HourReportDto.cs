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
        public decimal? SalaryPerHour { get; set; }
        public decimal? TotalPaymentAmount { get; set; }
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

    public class AssistantHourEntryDto
    {
        public int HourReportId { get; set; }
        public string? ReportDate { get; set; }    // "yyyy-MM-dd"
        public string? FromHour { get; set; }       // "HH:mm"
        public string? ToHour { get; set; }         // "HH:mm"
        public decimal? WorkedHours { get; set; }
        public string? Comments { get; set; }
    }

    public class AssistantMonthlyEntryDto
    {
        public int MonthlyApprovalId { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? ApprovalStatus { get; set; }
        public decimal? TotalWorkedHours { get; set; }
        public decimal? TotalPaymentAmount { get; set; }
        public string? ApprovalDate { get; set; }   // "yyyy-MM-dd"
        public string? Comments { get; set; }
    }

    public class AssistantTrackingDto
    {
        public string AssistantUserId { get; set; } = null!;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public decimal? SalaryPerHour { get; set; }
        public decimal TotalHours { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalPending { get; set; }
        public List<AssistantMonthlyEntryDto> MonthlyApprovals { get; set; } = [];
        public List<AssistantHourEntryDto> HourReports { get; set; } = [];
    }
}
