using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace RupResearchAPI.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
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

        private async Task SendAsync(string toEmail, string subject, string htmlBody, List<string>? attachmentPaths = null)
        {
            var (host, port, user, pass, fromName, _, _) = ReadConfig();

            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogError("שליחת מייל בוטלה: לא הוגדרה כתובת יעד (בדקו את המפתח Email:SecretariatEmail בהגדרות).");
                throw new InvalidOperationException("כתובת המייל של המזכירות אינה מוגדרת במערכת.");
            }

            const int maxAttempts = 2;
            Exception? lastError = null;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    var message = new MimeMessage();
                    message.From.Add(new MailboxAddress(fromName, user));
                    message.To.Add(new MailboxAddress("", toEmail));
                    message.Subject = subject;

                    var builder = new BodyBuilder { HtmlBody = htmlBody };
                    if (attachmentPaths != null)
                    {
                        foreach (var path in attachmentPaths.Where(File.Exists))
                            builder.Attachments.Add(path);
                    }
                    message.Body = builder.ToMessageBody();

                    using var client = new SmtpClient();
                    await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
                    await client.AuthenticateAsync(user, pass);
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);

                    _logger.LogInformation(
                        "מייל נשלח בהצלחה אל {ToEmail} (ניסיון {Attempt}/{MaxAttempts}) — נושא: {Subject}",
                        toEmail, attempt, maxAttempts, subject);
                    return;
                }
                catch (Exception ex)
                {
                    lastError = ex;
                    _logger.LogError(ex,
                        "שליחת מייל אל {ToEmail} נכשלה בניסיון {Attempt}/{MaxAttempts} דרך {Host}:{Port}. סוג שגיאה: {ExceptionType}",
                        toEmail, attempt, maxAttempts, host, port, ex.GetType().Name);
                    if (attempt < maxAttempts)
                        await Task.Delay(1500);
                }
            }

            throw new Exception($"שגיאה בשליחת מייל: {lastError?.Message}", lastError);
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
            List<string>? filePaths = null,
            decimal projectBudget = 0,
            decimal projectAvailable = 0,
            int projectUsagePct = 0)
        {
            var (_, _, _, _, _, toEmail, siteUrl) = ReadConfig();
            var date = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            // Amount color coding
            string amountColor, amountBg, amountBadge;
            if (amount <= 5000)      { amountColor = "#16a34a"; amountBg = "#f0fdf4"; amountBadge = "🟢 סכום רגיל"; }
            else if (amount <= 20000){ amountColor = "#d97706"; amountBg = "#fffbeb"; amountBadge = "🟡 סכום בינוני"; }
            else                     { amountColor = "#dc2626"; amountBg = "#fef2f2"; amountBadge = "🔴 סכום גבוה"; }

            // Budget status
            string budgetIcon, budgetLabel, budgetBg, budgetColor;
            if (projectBudget == 0)           { budgetIcon = "ℹ️"; budgetLabel = "לא הוגדר תקציב"; budgetBg = "#f8fafc"; budgetColor = "#64748b"; }
            else if (projectAvailable < 0)    { budgetIcon = "🔴"; budgetLabel = $"גירעון תקציבי ({projectUsagePct}% נוצל)"; budgetBg = "#fef2f2"; budgetColor = "#dc2626"; }
            else if (projectUsagePct >= 80)   { budgetIcon = "🟡"; budgetLabel = $"ניצול גבוה ({projectUsagePct}% נוצל)"; budgetBg = "#fffbeb"; budgetColor = "#d97706"; }
            else                               { budgetIcon = "🟢"; budgetLabel = $"תקציב תקין ({projectUsagePct}% נוצל)"; budgetBg = "#f0fdf4"; budgetColor = "#16a34a"; }

            // Extra rows
            var extraRows = "";
            if (!string.IsNullOrWhiteSpace(description))
                extraRows += $@"<tr><td style='padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>📝 תיאור</td><td style='padding:11px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:right;'>{description}</td></tr>";
            if (!string.IsNullOrWhiteSpace(comments))
                extraRows += $@"<tr style='background:#f8fafc;'><td style='padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;'>💬 הערות</td><td style='padding:11px 16px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:right;'>{comments}</td></tr>";

            var fileCount = filePaths?.Count ?? 0;
            var filesRow = fileCount > 0
                ? $@"<tr><td style='padding:11px 16px;color:#64748b;font-size:13px;text-align:right;white-space:nowrap;'>📎 קבצים מצורפים</td><td style='padding:11px 16px;color:#1e293b;text-align:right;'>{fileCount} קבצים</td></tr>"
                : "";

            var budgetRow = projectBudget > 0
                ? $@"<tr style='background:{budgetBg};'><td style='padding:11px 16px;color:#64748b;font-size:13px;border-top:2px solid #f1f5f9;text-align:right;white-space:nowrap;'>📊 מצב תקציב המחקר</td><td style='padding:11px 16px;font-weight:bold;color:{budgetColor};border-top:2px solid #f1f5f9;text-align:right;'>{budgetIcon} {budgetLabel} · יתרה: ₪{projectAvailable:N0}</td></tr>"
                : "";

            var html = $@"<!DOCTYPE html>
<html dir='rtl' lang='he'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:24px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);'>

  <!-- Status bar -->
  <tr><td style='background:#1e40af;padding:12px 24px;text-align:center;'>
    <span style='color:white;font-size:15px;font-weight:bold;letter-spacing:0.3px;'>🔔 בקשת תשלום חדשה ממתינה לטיפול</span>
  </td></tr>

  <!-- Header -->
  <tr><td style='background:linear-gradient(135deg,#003478 0%,#1B4080 100%);padding:28px 28px 20px;text-align:center;'>
    <p style='color:#93c5fd;font-size:12px;margin:0 0 8px;letter-spacing:2px;font-weight:bold;'>RUPRESEARCH · מערכת ניהול מחקרים</p>
    <h1 style='color:white;margin:0 0 12px;font-size:24px;font-weight:bold;'>📄 בקשת תשלום חדשה</h1>
    <table width='100%' cellpadding='0' cellspacing='0' dir='rtl' style='margin-top:8px;'>
      <tr>
        <td style='text-align:right;'>
          <p style='color:rgba(255,255,255,0.55);font-size:12px;margin:0 0 3px;'>הוגשה על ידי</p>
          <p style='color:white;font-size:17px;font-weight:bold;margin:0;'>{submitterName}</p>
          {(!string.IsNullOrWhiteSpace(submitterEmail) ? $"<p style='color:#93c5fd;font-size:13px;margin:3px 0 0;'>{submitterEmail}</p>" : "")}
        </td>
        <td style='text-align:left;vertical-align:top;padding-top:4px;'>
          <span style='background:rgba(253,224,71,0.2);color:#fde047;font-size:12px;font-weight:bold;padding:5px 14px;border-radius:20px;border:1px solid rgba(253,224,71,0.35);white-space:nowrap;'>⏳ ממתין לאישור</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Quick summary -->
  <tr><td style='background:#0f2d5e;padding:14px 28px;' dir='rtl'>
    <p style='color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;'>מחקר</p>
    <p style='color:white;font-size:15px;font-weight:bold;margin:0;'>""{projectName}""</p>
  </td></tr>

  <!-- Amount box -->
  <tr><td style='background:{amountBg};padding:24px 28px;text-align:center;border-bottom:3px solid {amountColor}20;'>
    <p style='color:#64748b;font-size:13px;margin:0 0 6px;'>💰 סכום מבוקש</p>
    <p style='color:{amountColor};font-size:42px;font-weight:bold;margin:0 0 10px;line-height:1;'>₪{amount:N0}</p>
    <span style='background:{amountColor}18;color:{amountColor};font-size:13px;font-weight:bold;padding:5px 18px;border-radius:20px;border:1px solid {amountColor}30;'>{amountBadge}</span>
  </td></tr>

  <!-- Details table -->
  <tr><td style='background:white;padding:0;'>
    <table width='100%' cellpadding='0' cellspacing='0' dir='rtl' style='border-collapse:collapse;'>
      <tr><td colspan='2' style='padding:16px 20px 8px;font-size:13px;font-weight:bold;color:#374151;letter-spacing:0.3px;'>פרטי הבקשה</td></tr>
      <tr style='background:#f8fafc;'><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;width:38%;'>📁 מחקר</td><td style='padding:11px 20px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{projectName}</td></tr>
      <tr><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;'>📋 כותרת הבקשה</td><td style='padding:11px 20px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{requestTitle}</td></tr>
      <tr style='background:#f8fafc;'><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;'>💼 קטגוריה</td><td style='padding:11px 20px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{category}</td></tr>
      <tr><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;'>👤 מגיש הבקשה</td><td style='padding:11px 20px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{submitterName}</td></tr>
      <tr style='background:#f8fafc;'><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;'>📅 תאריך הגשה</td><td style='padding:11px 20px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{date}</td></tr>
      {extraRows}{filesRow}{budgetRow}
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style='background:white;padding:24px 28px 28px;text-align:center;'>
    <a href='{siteUrl}/login?requestId={requestId}' style='display:inline-block;background:#003478;color:white;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;letter-spacing:0.3px;'>🔍 פתח את הבקשה במערכת</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style='background:#1e293b;padding:16px 28px;text-align:center;'>
    <p style='color:#64748b;font-size:12px;margin:0;'>מערכת ניהול מחקרים · המכללה האקדמית רופין · RupResearch System</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>";

            await SendAsync(toEmail, $"🔔 בקשת תשלום חדשה ממתינה לטיפול — {projectName} | ₪{amount:N0}", html, filePaths);
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

        public async Task SendBudgetTransferRequestEmailAsync(
            string giverPIEmail,
            string giverPIName,
            string giverProjectName,
            string receiverProjectName,
            decimal amount,
            string requesterName)
        {
            var (_, _, _, _, _, _, siteUrl) = ReadConfig();
            var date = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            var html = $@"<!DOCTYPE html>
<html dir='rtl' lang='he'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:24px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);'>

  <!-- Status bar -->
  <tr><td style='background:#7c3aed;padding:12px 24px;text-align:center;'>
    <span style='color:white;font-size:15px;font-weight:bold;letter-spacing:0.3px;'>💸 בקשת העברת תקציב בין מחקרים</span>
  </td></tr>

  <!-- Header -->
  <tr><td style='background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%);padding:28px 28px 20px;text-align:center;'>
    <p style='color:#ddd6fe;font-size:12px;margin:0 0 8px;letter-spacing:2px;font-weight:bold;'>RUPRESEARCH · מערכת ניהול מחקרים</p>
    <h1 style='color:white;margin:0 0 12px;font-size:24px;font-weight:bold;'>📤 בקשה להעברת תקציב</h1>
    <p style='color:rgba(255,255,255,0.7);font-size:13px;margin:0;'>הוגשה ב-{date}</p>
  </td></tr>

  <!-- Amount box -->
  <tr><td style='background:#faf5ff;padding:24px 28px;text-align:center;border-bottom:3px solid #7c3aed30;'>
    <p style='color:#64748b;font-size:13px;margin:0 0 6px;'>💰 סכום המבוקש להעברה</p>
    <p style='color:#7c3aed;font-size:42px;font-weight:bold;margin:0 0 10px;line-height:1;'>₪{amount:N0}</p>
    <span style='background:#7c3aed18;color:#7c3aed;font-size:13px;font-weight:bold;padding:5px 18px;border-radius:20px;border:1px solid #7c3aed30;'>בקשה להעברה</span>
  </td></tr>

  <!-- Details table -->
  <tr><td style='background:white;padding:0;'>
    <table width='100%' cellpadding='0' cellspacing='0' dir='rtl' style='border-collapse:collapse;'>
      <tr><td colspan='2' style='padding:16px 20px 8px;font-size:13px;font-weight:bold;color:#374151;letter-spacing:0.3px;'>פרטי הבקשה</td></tr>
      <tr style='background:#f8fafc;'><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;width:38%;'>📤 מקור (מחקרך)</td><td style='padding:11px 20px;font-weight:bold;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{giverProjectName}</td></tr>
      <tr><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;'>📥 יעד (מחקר מקבל)</td><td style='padding:11px 20px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{receiverProjectName}</td></tr>
      <tr style='background:#f8fafc;'><td style='padding:11px 20px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;'>👤 מבקש ההעברה</td><td style='padding:11px 20px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:14px;'>{requesterName}</td></tr>
      <tr><td style='padding:11px 20px;color:#64748b;font-size:13px;white-space:nowrap;'>📅 תאריך הבקשה</td><td style='padding:11px 20px;color:#1e293b;font-size:14px;'>{date}</td></tr>
    </table>
  </td></tr>

  <!-- Info box -->
  <tr><td style='background:#fffbeb;padding:16px 28px;border-top:1px solid #fde68a;'>
    <p style='color:#92400e;font-size:13px;margin:0;font-weight:bold;'>ℹ️ לתשומת לבך</p>
    <p style='color:#78350f;font-size:12px;margin:8px 0 0;line-height:1.6;'>
      {requesterName} מבקש/ת להעביר ₪{amount:N0} ממחקרך <strong>&ldquo;{giverProjectName}&rdquo;</strong> למחקר <strong>&ldquo;{receiverProjectName}&rdquo;</strong>.<br/>
      אנא פנה/י למזכירות לביצוע ההעברה בפועל, או צור/י קשר עם המבקש/ת לפרטים נוספים.
    </p>
  </td></tr>

  <!-- CTA -->
  <tr><td style='background:white;padding:24px 28px 28px;text-align:center;'>
    <a href='{siteUrl}' style='display:inline-block;background:#7c3aed;color:white;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;letter-spacing:0.3px;'>🔗 כניסה למערכת</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style='background:#1e293b;padding:16px 28px;text-align:center;'>
    <p style='color:#64748b;font-size:12px;margin:0;'>מערכת ניהול מחקרים · המכללה האקדמית רופין · RupResearch System</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>";

            await SendAsync(
                giverPIEmail,
                $"💸 בקשת העברת תקציב — {requesterName} מבקש/ת ₪{amount:N0} ממחקר \"{giverProjectName}\"",
                html);
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string userName, string resetLink)
        {
            var html = $@"<!DOCTYPE html>
<html dir='rtl' lang='he'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:32px 16px;'>
<tr><td align='center'>
<table width='520' cellpadding='0' cellspacing='0' style='max-width:520px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);'>

  <tr><td style='background:linear-gradient(135deg,#003478 0%,#1B4080 100%);padding:32px 28px;text-align:center;'>
    <p style='color:#93c5fd;font-size:12px;margin:0 0 8px;letter-spacing:2px;font-weight:bold;'>RUPRESEARCH · מערכת ניהול מחקרים</p>
    <h1 style='color:white;margin:0;font-size:22px;font-weight:bold;'>🔐 איפוס סיסמה</h1>
  </td></tr>

  <tr><td style='background:white;padding:32px 28px;text-align:right;' dir='rtl'>
    <p style='color:#1e293b;font-size:15px;margin:0 0 12px;'>שלום {userName},</p>
    <p style='color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;'>
      קיבלנו בקשה לאיפוס הסיסמה שלך במערכת ניהול המחקרים.<br/>
      לחץ/י על הכפתור למטה להגדרת סיסמה חדשה.
    </p>
    <div style='text-align:center;margin:28px 0;'>
      <a href='{resetLink}' style='display:inline-block;background:#003478;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;'>איפוס סיסמה</a>
    </div>
    <p style='color:#94a3b8;font-size:12px;margin:0;line-height:1.6;'>
      הקישור בתוקף למשך שעה אחת.<br/>
      אם לא ביקשת איפוס סיסמה — ניתן להתעלם ממייל זה.
    </p>
  </td></tr>

  <tr><td style='background:#1e293b;padding:14px 28px;text-align:center;'>
    <p style='color:#64748b;font-size:11px;margin:0;'>מערכת ניהול מחקרים · המכללה האקדמית רופין</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>";

            await SendAsync(toEmail, "🔐 איפוס סיסמה — מערכת RupResearch", html);
        }
    }
}
