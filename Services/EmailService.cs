using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace RupResearchAPI.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        private (string host, int port, string user, string pass, string fromName, string toEmail, string siteUrl) ReadConfig()
        {
            var host     = _config["Email:SmtpHost"]         ?? "smtp.gmail.com";
            var port     = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var user     = _config["Email:SmtpUser"]         ?? "";
            var pass     = _config["Email:SmtpPassword"]     ?? "";
            var fromName = _config["Email:FromName"]         ?? "RupResearch System";
            var toEmail  = _config["Email:SecretariatEmail"] ?? "";
            var siteUrl  = _config["Email:SiteUrl"]          ?? "";
            return (host, port, user, pass, fromName, toEmail, siteUrl);
        }

        private async Task SendAsync(string toEmail, string subject, string htmlBody)
        {
            var (host, port, user, pass, fromName, _, _) = ReadConfig();

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, user));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(user, pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }

        public async Task SendPaymentRequestEmailAsync(
            string submitterName,
            string submitterEmail,
            string projectName,
            string requestTitle,
            string category,
            decimal amount,
            string? description,
            string? comments,
            int requestId = 0,
            List<string>? filePaths = null)
        {
            var (_, _, _, _, _, toEmail, siteUrl) = ReadConfig();
            var date = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            var hasFiles = filePaths != null && filePaths.Count > 0;
            var extraRows = "";
            if (!string.IsNullOrWhiteSpace(description))
                extraRows += $@"<tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;'>📝 תיאור</td><td style='padding:12px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{description}</td></tr>";
            if (!string.IsNullOrWhiteSpace(comments))
                extraRows += $@"<tr><td style='padding:12px 16px;color:#64748b;font-size:13px;text-align:right;'>💬 הערות</td><td style='padding:12px 16px;color:#1e293b;text-align:left;'>{comments}</td></tr>";
            if (hasFiles)
            {
                var fileNames = string.Join(", ", filePaths!.Select(p => System.IO.Path.GetFileName(p)));
                extraRows += $@"<tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;text-align:right;'>📎 קבצים מצורפים</td><td style='padding:12px 16px;color:#1e293b;text-align:left;'>{filePaths!.Count} קבצים: {fileNames}</td></tr>";
            }

            var html = $@"<!DOCTYPE html>
<html dir='rtl' lang='he'>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:32px 16px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>
      <tr><td style='background:linear-gradient(135deg,#003478 0%,#1B4080 100%);padding:32px 28px;border-radius:16px 16px 0 0;text-align:center;'>
        <p style='color:#5CB800;font-size:13px;margin:0 0 6px;letter-spacing:1px;font-weight:bold;'>RUPRESEARCH</p>
        <h1 style='color:white;margin:0;font-size:26px;font-weight:bold;'>📄 בקשת תשלום חדשה</h1>
        <p style='color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px;'>נשלחה ב-{date}</p>
      </td></tr>
      <tr><td style='background:#003478;padding:16px 28px;'>
        <table width='100%' cellpadding='0' cellspacing='0' dir='rtl'>
          <tr>
            <td style='text-align:right;'>
              <p style='color:rgba(255,255,255,0.6);font-size:11px;margin:0 0 2px;'>הוגש על ידי</p>
              <p style='color:white;font-size:17px;font-weight:bold;margin:0;'>{submitterName}</p>
              {(!string.IsNullOrWhiteSpace(submitterEmail) ? $"<p style='color:#93c5fd;font-size:13px;margin:2px 0 0;'>{submitterEmail}</p>" : "")}
            </td>
            <td style='text-align:left;'>
              <span style='background:rgba(92,184,0,0.25);color:#5CB800;font-size:12px;font-weight:bold;padding:6px 14px;border-radius:20px;border:1px solid rgba(92,184,0,0.4);'>ממתין לאישור</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style='background:white;padding:0;'>
        <table width='100%' cellpadding='0' cellspacing='0' dir='rtl'>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📁 מחקר</td><td style='padding:12px 16px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{projectName}</td></tr>
          <tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📋 כותרת</td><td style='padding:12px 16px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{requestTitle}</td></tr>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>💼 קטגוריה</td><td style='padding:12px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{category}</td></tr>
          <tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>💰 סכום</td><td style='padding:12px 16px;font-size:22px;font-weight:bold;color:#003478;border-bottom:1px solid #f1f5f9;text-align:left;'>₪{amount:N0}</td></tr>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📅 תאריך</td><td style='padding:12px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{date}</td></tr>
          {extraRows}
        </table>
      </td></tr>
      <tr><td style='background:white;padding:24px 28px;border-top:2px solid #f1f5f9;text-align:center;'>
        <a href='{siteUrl}/approvals?requestId={requestId}' style='display:inline-block;background:#003478;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;'>🔐 מעבר לאישור הבקשה</a>
      </td></tr>
      <tr><td style='background:#1e293b;padding:16px 28px;border-radius:0 0 16px 16px;text-align:center;'>
        <p style='color:#64748b;font-size:11px;margin:0;'>מערכת ניהול מחקרים · המכללה האקדמית רופין · RupResearch System</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>";

            await SendAsync(toEmail, $"📄 בקשת תשלום חדשה — {projectName} | ₪{amount:N0}", html);
        }

        public async Task SendHourReportEmailAsync(
            string assistantName,
            string projectName,
            int month,
            int year,
            decimal totalHours,
            int approvalId)
        {
            var (_, _, _, _, _, toEmail, siteUrl) = ReadConfig();
            var monthNames = new[] { "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                                     "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר" };
            var monthName = month >= 1 && month <= 12 ? monthNames[month] : month.ToString();
            var date = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            var html = $@"<!DOCTYPE html>
<html dir='rtl' lang='he'>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:32px 16px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>
      <tr><td style='background:linear-gradient(135deg,#5CB800 0%,#3d8000 100%);padding:32px 28px;border-radius:16px 16px 0 0;text-align:center;'>
        <p style='color:white;font-size:13px;margin:0 0 6px;letter-spacing:1px;font-weight:bold;opacity:0.8;'>RUPRESEARCH</p>
        <h1 style='color:white;margin:0;font-size:26px;font-weight:bold;'>⏱️ דוח שעות עוזר מחקר</h1>
        <p style='color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px;'>הוגש ב-{date}</p>
      </td></tr>
      <tr><td style='background:#3d8000;padding:16px 28px;'>
        <table width='100%' cellpadding='0' cellspacing='0' dir='rtl'>
          <tr>
            <td style='text-align:right;'>
              <p style='color:rgba(255,255,255,0.6);font-size:11px;margin:0 0 2px;'>עוזר מחקר</p>
              <p style='color:white;font-size:17px;font-weight:bold;margin:0;'>{assistantName}</p>
            </td>
            <td style='text-align:left;'>
              <span style='background:rgba(255,255,255,0.2);color:white;font-size:12px;font-weight:bold;padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);'>ממתין לאישור</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style='background:white;padding:0;'>
        <table width='100%' cellpadding='0' cellspacing='0' dir='rtl'>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📁 מחקר</td><td style='padding:12px 16px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{projectName}</td></tr>
          <tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📅 תקופה</td><td style='padding:12px 16px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{monthName} {year}</td></tr>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>⏰ סהכ שעות</td><td style='padding:12px 16px;font-size:22px;font-weight:bold;color:#3d8000;border-bottom:1px solid #f1f5f9;text-align:left;'>{totalHours:F1} שעות</td></tr>
        </table>
      </td></tr>
      <tr><td style='background:white;padding:24px 28px;border-top:2px solid #f1f5f9;text-align:center;'>
        <a href='{siteUrl}/approvals?tab=hours' style='display:inline-block;background:#3d8000;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;'>🔐 מעבר לאישור דוח השעות</a>
      </td></tr>
      <tr><td style='background:#1e293b;padding:16px 28px;border-radius:0 0 16px 16px;text-align:center;'>
        <p style='color:#64748b;font-size:11px;margin:0;'>מערכת ניהול מחקרים · המכללה האקדמית רופין · RupResearch System</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>";

            await SendAsync(toEmail, $"⏱️ דוח שעות חדש — {assistantName} | {monthName} {year} | {totalHours:F1} שעות", html);
        }
    }
}
