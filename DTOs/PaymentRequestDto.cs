namespace RupResearchAPI.DTOs
{
    public class PaymentRequestResponseDto
    {
        public int PaymentRequestId { get; set; }
        public int? ProjectId { get; set; }
        public string? RequestedByUserId { get; set; }
        public int? ProviderId { get; set; }
        public string? CategoryName { get; set; }
        public string? RequestTitle { get; set; }
        public string? RequestDescription { get; set; }
        public decimal? RequestedAmount { get; set; }
        public DateOnly? RequestDate { get; set; }
        public DateOnly? DueDate { get; set; }
        public string? Status { get; set; }
        public string? ApprovedByUserId { get; set; }
        public DateOnly? DecisionDate { get; set; }
        public string? RejectionReason { get; set; }
        public string? Comments { get; set; }
    }

    public class CreatePaymentRequestDto
    {
        public string? RequestedByUserId { get; set; }
        public int? ProviderId { get; set; }
        public string? CategoryName { get; set; }
        public string? RequestTitle { get; set; }
        public string? RequestDescription { get; set; }
        public decimal? RequestedAmount { get; set; }
        public DateOnly? RequestDate { get; set; }
        public DateOnly? DueDate { get; set; }
        public string? Status { get; set; }
        public string? Comments { get; set; }
    }

    public class UpdatePaymentRequestStatusDto
    {
        public string? Status { get; set; }
        public string? ApprovedByUserId { get; set; }
        public string? RejectionReason { get; set; }
    }
}
