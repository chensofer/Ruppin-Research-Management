using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_hour_reports")]
    public class ResearchHourReport
    {
        [Key]
        [Column("hour_report_id")]
        public int HourReportId { get; set; }

        [Column("user_id")]
        [StringLength(10)]
        public string? UserId { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("report_date")]
        public DateOnly? ReportDate { get; set; }

        [Column("from_hour")]
        public TimeOnly? FromHour { get; set; }

        [Column("to_hour")]
        public TimeOnly? ToHour { get; set; }

        [Column("worked_hours")]
        public decimal? WorkedHours { get; set; }

        [Column("comments")]
        [StringLength(255)]
        public string? Comments { get; set; }
    }
}
