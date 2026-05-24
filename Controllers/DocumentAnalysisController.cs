using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/documents")]
    [Authorize]
    public class DocumentAnalysisController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _http;

        public DocumentAnalysisController(IConfiguration config, IHttpClientFactory http)
        {
            _config = config;
            _http = http;
        }

        [HttpPost("analyze")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Analyze([FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "לא נבחרו קבצים" });

            var apiKey = _config["Gemini:ApiKey"] ?? "";
            if (string.IsNullOrEmpty(apiKey))
                return StatusCode(503, new { message = "Gemini API key לא מוגדר" });

            // Build parts list — one per file
            var parts = new List<object>();
            foreach (var file in files)
            {
                var allowedTypes = new[] { "application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp" };
                var mime = file.ContentType?.ToLower() ?? "";
                if (file.Length == 0) continue;

                // For unsupported types, skip
                if (!allowedTypes.Any(t => mime.Contains(t.Split('/')[1])))
                    continue;

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var b64 = Convert.ToBase64String(ms.ToArray());
                var mimeType = mime.Contains("pdf") ? "application/pdf"
                             : mime.Contains("png") ? "image/png"
                             : "image/jpeg";

                parts.Add(new { inlineData = new { mimeType, data = b64 } });
            }

            if (parts.Count == 0)
                return BadRequest(new { message = "סוג קובץ לא נתמך. השתמש ב-PDF, JPG או PNG" });

            // Add the extraction prompt
            parts.Add(new
            {
                text = @"אנא קרא את המסמך/ים הבאים (חשבוניות, קבלות, הצעות מחיר וכו') וחלץ את הפרטים הבאים.
החזר JSON בדיוק בפורמט הזה, ללא טקסט נוסף:
{
  ""requestTitle"": ""כותרת קצרה לבקשה (מה נרכש/מה השירות)"",
  ""requestedAmount"": 0,
  ""requestDescription"": ""תיאור מפורט של מה נרכש"",
  ""providerName"": ""שם הספק / העסק"",
  ""providerPhone"": ""מספר טלפון של הספק (ספרות ומקפים בלבד) או null"",
  ""providerEmail"": ""כתובת אימייל של הספק או null"",
  ""requestDate"": ""YYYY-MM-DD או null""
}
אם יש כמה מסמכים, חבר את הסכומים וסכם את התיאורים.
אם לא מצאת ערך מסוים, השאר null.
הסכום חייב להיות מספר בלבד (ללא ₪ וללא פסיקים)."
            });

            var requestBody = new
            {
                contents = new[] { new { parts } },
                generationConfig = new { temperature = 0.1, maxOutputTokens = 1024 }
            };

            var client = _http.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                return StatusCode(502, new { message = $"שגיאה מ-Gemini: {err}" });
            }

            var raw = await response.Content.ReadAsStringAsync();

            // Extract the text from Gemini response
            using var doc = JsonDocument.Parse(raw);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "";

            // Clean markdown code blocks if present
            text = text.Trim();
            if (text.StartsWith("```")) text = text.Split('\n', 2)[1];
            if (text.EndsWith("```")) text = text[..^3];
            text = text.Trim();

            // Parse and return
            try
            {
                using var result = JsonDocument.Parse(text);
                return Ok(result.RootElement.Clone());
            }
            catch
            {
                return Ok(new { requestTitle = (string?)null, requestedAmount = (decimal?)null, requestDescription = text, providerName = (string?)null });
            }
        }
    }
}
