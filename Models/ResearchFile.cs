using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_files")]
    public class ResearchFile
    {
        [Key]
        [Column("file_id")]
        public int FileId { get; set; }

        [Column("file_name")]
        [StringLength(255)]
        public string? FileName { get; set; }

        [Column("uploaded_by_user_id")]
        [StringLength(10)]
        public string? UploadedByUserId { get; set; }

        [Column("path")]
        [StringLength(500)]
        public string? Path { get; set; }

        [Column("file_type")]
        [StringLength(50)]
        public string? FileType { get; set; }

        [Column("created_date")]
        public DateTime? CreatedDate { get; set; }

        [Column("project_id")]
        public int? ProjectId { get; set; }
    }
}
