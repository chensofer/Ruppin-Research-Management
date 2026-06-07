namespace RupResearchAPI.Services
{
    public interface IEmailService
    {
        Task SendPaymentRequestEmailAsync(
            string submitterName,
            string submitterEmail,
            string projectName,
            string requestTitle,
            string category,
            decimal amount,
            string? description,
            string? comments,
            int requestId = 0,
            List<string>? filePaths = null);

        Task SendHourReportEmailAsync(
            string assistantName,
            string projectName,
            int month,
            int year,
            decimal totalHours,
            int approvalId);
    }
}
