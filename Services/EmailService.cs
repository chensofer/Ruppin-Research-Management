using System.Net;
using System.Net.Mail;

namespace RupResearchAPI.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
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
            List<string>? filePaths = null)
        {
            try
            {
                var host     = _config["Email:SmtpHost"]         ?? "smtp.gmail.com";
                var port     = int.Parse(_config["Email:SmtpPort"] ?? "587");
                var user     = _config["Email:SmtpUser"]         ?? "";
                var pass     = _config["Email:SmtpPassword"]     ?? "";
                var fromName = _config["Email:FromName"]         ?? "RupResearch System";
                var toEmail  = _config["Email:SecretariatEmail"] ?? "";
                var siteUrl  = _config["Email:SiteUrl"]          ?? "";

                var date = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

                var hasFiles = filePaths != null && filePaths.Count > 0;
                var extraRows = "";
                if (!string.IsNullOrWhiteSpace(description))
                    extraRows += $@"<tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;'>📝 תיאור</td><td style='padding:12px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;'>{description}</td></tr>";
                if (!string.IsNullOrWhiteSpace(comments))
                    extraRows += $@"<tr><td style='padding:12px 16px;color:#64748b;font-size:13px;'>💬 הערות</td><td style='padding:12px 16px;color:#1e293b;'>{comments}</td></tr>";
                if (hasFiles)
                {
                    var fileNames = string.Join(", ", filePaths!.Select(p => System.IO.Path.GetFileName(p)));
                    extraRows += $@"<tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;'>📎 קבצים מצורפים</td><td style='padding:12px 16px;color:#1e293b;'>{filePaths!.Count} קבצים: {fileNames}</td></tr>";
                }

                var html = $@"<!DOCTYPE html>
<html dir='rtl' lang='he'>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:32px 16px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>

      <!-- Header -->
      <tr><td style='background:linear-gradient(135deg,#003478 0%,#1B4080 100%);padding:32px 28px;border-radius:16px 16px 0 0;text-align:center;'>
        <p style='color:#5CB800;font-size:13px;margin:0 0 6px;letter-spacing:1px;font-weight:bold;'>RUPRESEARCH</p>
        <h1 style='color:white;margin:0;font-size:26px;font-weight:bold;'>📄 בקשת תשלום חדשה</h1>
        <p style='color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px;'>נשלחה ב-{date}</p>
      </td></tr>

      <!-- Submitter Banner -->
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

      <!-- Details Card — label RIGHT, value LEFT (RTL) -->
      <tr><td style='background:white;padding:0;'>
        <table width='100%' cellpadding='0' cellspacing='0' dir='rtl'>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📁 מחקר</td><td style='padding:12px 16px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{projectName}</td></tr>
          <tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📋 כותרת הבקשה</td><td style='padding:12px 16px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{requestTitle}</td></tr>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>💼 קטגוריה</td><td style='padding:12px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{category}</td></tr>
          <tr><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>💰 סכום מבוקש</td><td style='padding:12px 16px;font-size:22px;font-weight:bold;color:#003478;border-bottom:1px solid #f1f5f9;text-align:left;'>₪{amount:N0}</td></tr>
          <tr style='background:#f8fafc;'><td style='padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📅 תאריך הגשה</td><td style='padding:12px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:left;'>{date}</td></tr>
          {extraRows}
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style='background:white;padding:24px 28px;border-top:2px solid #f1f5f9;text-align:center;'>
        <a href='{siteUrl}' style='display:inline-block;background:#003478;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;'>🔐 כניסה למערכת לאישור</a>
        {(!string.IsNullOrWhiteSpace(submitterEmail) ? $"<p style='color:#94a3b8;font-size:12px;margin:16px 0 0;'>ניתן להשיב למייל זה כדי לפנות ישירות אל {submitterName}</p>" : "")}
      </td></tr>

      <!-- Footer -->
      <tr><td style='background:#1e293b;padding:16px 28px;border-radius:0 0 16px 16px;text-align:center;'>
        <p style='color:#64748b;font-size:11px;margin:0;'>מערכת ניהול מחקרים · המכללה האקדמית רופין · RupResearch System</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>";

                using var smtp = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(user, pass),
                    EnableSsl   = true,
                };

                var msg = new MailMessage
                {
                    From       = new MailAddress(user, fromName),
                    Subject    = $"📄 בקשת תשלום חדשה — {projectName} | ₪{amount:N0}",
                    Body       = html,
                    IsBodyHtml = true,
                };

                msg.To.Add(toEmail);

                if (!string.IsNullOrWhiteSpace(submitterEmail))
                    msg.ReplyToList.Add(new MailAddress(submitterEmail, submitterName));

                // Attach files
                if (hasFiles)
                {
                    var wwwroot = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    foreach (var relPath in filePaths!)
                    {
                        var fullPath = System.IO.Path.Combine(wwwroot, relPath.TrimStart('/'));
                        if (System.IO.File.Exists(fullPath))
                        {
                            var attachment = new Attachment(fullPath);
                            msg.Attachments.Add(attachment);
                        }
                    }
                }

                await smtp.SendMailAsync(msg);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] {ex.GetType().Name}: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"[EMAIL INNER] {ex.InnerException.Message}");
            }
        }
    }
}
