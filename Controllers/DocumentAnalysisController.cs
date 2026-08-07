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

            // Extension → MIME fallback for files uploaded without a proper Content-Type
            var extMimeMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { ".jpg",  "image/jpeg" },
                { ".jpeg", "image/jpeg" },
                { ".png",  "image/png"  },
                { ".webp", "image/webp" },
                { ".gif",  "image/gif"  },
                { ".bmp",  "image/bmp"  },
                { ".tiff", "image/tiff" },
                { ".tif",  "image/tiff" },
                { ".pdf",  "application/pdf" },
            };

            // Build parts list — one per file
            var parts = new List<object>();
            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                var mime = file.ContentType?.ToLower() ?? "";
                // Fall back to extension when MIME is missing or generic
                if (string.IsNullOrEmpty(mime) || mime is "application/octet-stream" or "application/unknown")
                {
                    var ext = Path.GetExtension(file.FileName);
                    mime = extMimeMap.GetValueOrDefault(ext, mime);
                }

                // Resolve Gemini-compatible MIME (supports PDF and common image types)
                string? geminiMime = null;
                if (mime.Contains("pdf"))         geminiMime = "application/pdf";
                else if (mime.Contains("png"))    geminiMime = "image/png";
                else if (mime.Contains("webp"))   geminiMime = "image/webp";
                else if (mime.Contains("gif"))    geminiMime = "image/gif";
                else if (mime.Contains("bmp") || mime.Contains("tiff"))
                    geminiMime = "image/jpeg"; // convert BMP/TIFF via re-encode not needed — Gemini treats as JPEG
                else if (mime.Contains("jpeg") || mime.Contains("jpg"))
                    geminiMime = "image/jpeg";

                if (geminiMime == null) continue; // unsupported type — skip

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var b64 = Convert.ToBase64String(ms.ToArray());
                var mimeType = geminiMime;

                parts.Add(new { inlineData = new { mimeType, data = b64 } });
            }

            if (parts.Count == 0)
                return BadRequest(new { message = "סוג קובץ לא נתמך. השתמש ב-PDF, JPG, PNG או WebP" });

            // Add the extraction prompt
            parts.Add(new
            {
                text = @"IMPORTANT: Output ONLY a valid JSON object. No markdown, no explanation, no code fences.

Read the attached document(s) or image(s) (invoices, receipts, quotes, photos of receipts, etc.) and extract the following fields.
Return EXACTLY this JSON structure and nothing else:
{
  ""requestTitle"": ""short title describing what was purchased or the service"",
  ""requestedAmount"": 0,
  ""requestDescription"": ""detailed description of what was purchased"",
  ""providerName"": ""vendor/business name"",
  ""providerPhone"": ""vendor phone number (digits and dashes only) or null"",
  ""providerEmail"": ""vendor email address or null"",
  ""requestDate"": ""YYYY-MM-DD or null"",
  ""categoryName"": ""expense category in Hebrew — one of: ציוד, נסיעות, שכר, ייעוץ, תוכנה, חומרה, כנסים, פרסום, ספרות מקצועית, אחר — or null if unclear"",
  ""invoiceNumber"": ""invoice number, receipt number, or document number as a string or null""
}
Rules:
- If multiple documents: sum the amounts and combine descriptions.
- Use null for any field you cannot find — do NOT use placeholder text.
- requestedAmount must be a plain number with no currency symbols or commas.
- DO NOT wrap the output in markdown code blocks or add any text outside the JSON."
            });

            var requestBody = new
            {
                contents = new[] { new { parts } },
                generationConfig = new { temperature = 0.1, maxOutputTokens = 1024 }
            };

            var client = _http.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";

            var json = JsonSerializer.Serialize(requestBody);

            // Retry up to 3 times on 503 (service overload)
            HttpResponseMessage response = null!;
            int[] retryDelaysMs = [1500, 3000];
            for (int attempt = 0; attempt <= retryDelaysMs.Length; attempt++)
            {
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                response = await client.PostAsync(url, content);
                if (response.IsSuccessStatusCode) break;

                var statusCode = (int)response.StatusCode;
                if ((statusCode == 503 || statusCode == 429) && attempt < retryDelaysMs.Length)
                {
                    await Task.Delay(retryDelaysMs[attempt]);
                    continue;
                }
                break;
            }

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(502, new { message = "סריקת המסמך נכשלה" });
            }

            var raw = await response.Content.ReadAsStringAsync();

            // Extract the text from Gemini response (safely — structure may vary on safety blocks)
            using var doc = JsonDocument.Parse(raw);
            var rootEl = doc.RootElement;
            string text = "";
            if (rootEl.TryGetProperty("candidates", out var candidatesEl) &&
                candidatesEl.GetArrayLength() > 0 &&
                candidatesEl[0].TryGetProperty("content", out var contentEl) &&
                contentEl.TryGetProperty("parts", out var partsEl) &&
                partsEl.GetArrayLength() > 0 &&
                partsEl[0].TryGetProperty("text", out var textEl))
            {
                text = textEl.GetString() ?? "";
            }

            if (string.IsNullOrWhiteSpace(text))
                return Ok(new { requestTitle = (string?)null, requestedAmount = (decimal?)null, requestDescription = (string?)null, providerName = (string?)null, categoryName = (string?)null, invoiceNumber = (string?)null });

            // Strip any markdown fencing (```json ... ```) that Gemini sometimes adds
            text = System.Text.RegularExpressions.Regex.Replace(text, @"```[a-zA-Z]*", "").Trim();
            text = text.Replace("```", "").Trim();

            // Extract the JSON object by finding the outermost { } — robust against surrounding prose
            var jsonStart = text.IndexOf('{');
            var jsonEnd   = text.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
                text = text[jsonStart..(jsonEnd + 1)];

            // Parse and return
            try
            {
                using var result = JsonDocument.Parse(text);
                return Ok(result.RootElement.Clone());
            }
            catch
            {
                return Ok(new { requestTitle = (string?)null, requestedAmount = (decimal?)null, requestDescription = (string?)null, providerName = (string?)null, categoryName = (string?)null, invoiceNumber = (string?)null });
            }
        }
    }
}
