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
            List<string>? filePaths = null);
    }
}
