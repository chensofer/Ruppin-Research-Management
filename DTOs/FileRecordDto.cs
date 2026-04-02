namespace RupResearchAPI.DTOs
{
    public class FileRecordDto
    {
        public int FileId { get; set; }
        public string? FileName { get; set; }
        public string? Path { get; set; }
        public string? FolderName { get; set; }
        public string? FileType { get; set; }
    }
}
