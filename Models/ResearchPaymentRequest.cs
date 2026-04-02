using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_payment_requests")]
    public class ResearchPaymentRequest
    {
        [Key]
        [Column("payment_request_id")]
        public int PaymentRequestId { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("requested_by_user_id")]
        [StringLength(10)]
        public string? RequestedByUserId { get; set; }

        [Column("provider_id")]
        public int? ProviderId { get; set; }

        [Column("category_name")]
        [StringLength(50)]
        public string? CategoryName { get; set; }

        [Column("request_title")]
        [StringLength(255)]
        public string? RequestTitle { get; set; }

        [Column("request_description")]
        [StringLength(1000)]
        public string? RequestDescription { get; set; }

        [Column("requested_amount")]
        public decimal? RequestedAmount { get; set; }

        [Column("request_date")]
        public DateOnly? RequestDate { get; set; }

        [Column("due_date")]
        public DateOnly? DueDate { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string? Status { get; set; }

        [Column("approved_by_user_id")]
        [StringLength(10)]
        public string? ApprovedByUserId { get; set; }

        [Column("decision_date")]
        public DateOnly? DecisionDate { get; set; }

        [Column("rejection_reason")]
        [StringLength(500)]
        public string? RejectionReason { get; set; }

        [Column("quotation_file_path")]
        [StringLength(500)]
        public string? QuotationFilePath { get; set; }

        [Column("comments")]
        [StringLength(255)]
        public string? Comments { get; set; }
    }
}
